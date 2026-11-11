-- CESTAS APP V109.1: CD confirma repasses (inclusive parciais) e concilia
-- PIX/cartão corporativo item a item. Prestação não movimenta estoque.
CREATE OR REPLACE FUNCTION public.listar_prestacoes_v109(
 p_empresa_id uuid,p_entregador_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $list$
DECLARE v_uid uuid:=auth.uid();v_filtro uuid;v_json jsonb;
BEGIN
 IF v_uid IS NULL OR NOT app_private.is_empresa_member(p_empresa_id) THEN
   RAISE EXCEPTION 'Empresa ou sessão inválida.';
 END IF;
 IF app_private.has_permission(p_empresa_id,'FINANCEIRO_AUDITAR') THEN
  v_filtro:=p_entregador_id;
 ELSE
  IF p_entregador_id IS NOT NULL AND p_entregador_id<>v_uid THEN
   RAISE EXCEPTION 'Não autorizado a consultar outra prestação.';
  END IF;
  v_filtro:=v_uid;
 END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.id DESC),'[]'::jsonb)
 INTO v_json FROM (
  SELECT p.id,p.empresa_id,p.entregador_id,u.nome entregador_nome,
    p.inicio,p.fim,p.status,p.enviado_at,p.valores_esperados,
    p.dinheiro_declarado,p.pix_declarado,p.cartao_declarado,
    p.observacao_entregador,p.observacao_cd,
    coalesce((SELECT sum(x.valor) FROM public.prestacao_repasses_v109 x
      WHERE x.prestacao_id=p.id AND x.forma='DINHEIRO'),0) dinheiro_conferido,
    coalesce((SELECT sum(x.valor) FROM public.prestacao_repasses_v109 x
      WHERE x.prestacao_id=p.id AND x.forma='PIX'),0) pix_conferido,
    coalesce((SELECT sum(x.valor) FROM public.prestacao_repasses_v109 x
      WHERE x.prestacao_id=p.id AND x.forma='CARTAO'),0) cartao_conferido,
    coalesce((SELECT sum(x.taxa_cartao_autorizada) FROM public.prestacao_repasses_v109 x
      WHERE x.prestacao_id=p.id),0) taxas_autorizadas,
    greatest(0,coalesce((p.valores_esperados->>'dinheiro')::numeric,0)-
       coalesce((SELECT sum(x.valor) FROM public.prestacao_repasses_v109 x
         WHERE x.prestacao_id=p.id AND x.forma='DINHEIRO'),0)) pendente_dinheiro,
    greatest(0,coalesce((p.valores_esperados->>'pix_entregador')::numeric,0)-
       coalesce((SELECT sum(x.valor) FROM public.prestacao_repasses_v109 x
         WHERE x.prestacao_id=p.id AND x.forma='PIX'),0)) pendente_pix,
    greatest(0,coalesce((p.valores_esperados->>'cartao_entregador')::numeric,0)-
       coalesce((SELECT sum(x.valor+x.taxa_cartao_autorizada) FROM public.prestacao_repasses_v109 x
         WHERE x.prestacao_id=p.id AND x.forma='CARTAO'),0)) pendente_cartao,
    (SELECT count(*) FROM public.prestacao_itens_v109 i
      WHERE i.prestacao_id=p.id AND i.destino='EMPRESA'
        AND i.conciliado_em IS NULL) itens_empresa_pendentes,
    (SELECT count(*) FROM public.prestacao_itens_v109 i WHERE i.prestacao_id=p.id) total_itens,
    (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id',i.id,'origem',i.origem,'origem_id',i.origem_id,'cliente_id',i.cliente_id,
      'cliente_nome',i.cliente_nome,'recebido_at',i.recebido_at,
      'forma',i.forma,'destino',i.destino,'valor',i.valor,
      'conciliado_em',i.conciliado_em,'referencia_conciliacao',i.referencia_conciliacao
    ) ORDER BY i.recebido_at,i.id),'[]'::jsonb)
     FROM public.prestacao_itens_v109 i WHERE i.prestacao_id=p.id) itens,
    (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id',x.id,'forma',x.forma,'valor',x.valor,
      'taxa_cartao_autorizada',x.taxa_cartao_autorizada,
      'referencia',x.referencia,'confirmado_at',x.confirmado_at
     ) ORDER BY x.confirmado_at),'[]'::jsonb)
     FROM public.prestacao_repasses_v109 x WHERE x.prestacao_id=p.id) repasses
  FROM public.prestacoes_contas_v109 p
  JOIN public.usuarios u ON u.id=p.entregador_id AND u.empresa_id=p.empresa_id
  WHERE p.empresa_id=p_empresa_id AND
    (v_filtro IS NULL OR p.entregador_id=v_filtro)
  ORDER BY p.id DESC LIMIT 100
 ) r;
 RETURN v_json;
END;
$list$;
REVOKE ALL ON FUNCTION public.listar_prestacoes_v109(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.listar_prestacoes_v109(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.registrar_repasse_cd_v109(
 p_empresa_id uuid,p_prestacao_id bigint,p_forma text,p_valor numeric,
 p_taxa_cartao numeric,p_referencia text,p_chave_operacao uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $rep$
DECLARE v_uid uuid:=auth.uid();v_p public.prestacoes_contas_v109%rowtype;
 v_devido numeric;v_pago numeric;v_valor numeric:=round(p_valor,2);
 v_taxa numeric:=round(coalesce(p_taxa_cartao,0),2);
 v_id bigint;v_pendente numeric;v_emp_pendente integer;
BEGIN
 IF v_uid IS NULL OR NOT app_private.is_empresa_member(p_empresa_id)
   OR NOT app_private.has_permission(p_empresa_id,'FINANCEIRO_AUDITAR') THEN
  RAISE EXCEPTION 'Somente o Financeiro/CD pode confirmar repasses.';
 END IF;
 IF p_chave_operacao IS NULL THEN RAISE EXCEPTION 'Identificador de operação obrigatório.'; END IF;
 IF p_forma NOT IN ('DINHEIRO','PIX','CARTAO') OR v_valor IS NULL OR v_valor<=0
   OR v_valor>100000000 OR v_taxa<0 OR v_taxa>100000000
   OR (p_forma<>'CARTAO' AND v_taxa<>0)
   OR length(coalesce(p_referencia,''))>250 THEN
  RAISE EXCEPTION 'Conferência de repasse inválida.';
 END IF;
 IF p_forma<>'DINHEIRO' AND length(trim(coalesce(p_referencia,'')))<4 THEN
  RAISE EXCEPTION 'Informe a referência da transferência/maquineta.';
 END IF;
 SELECT p.* INTO v_p FROM public.prestacoes_contas_v109 p
 WHERE p.id=p_prestacao_id AND p.empresa_id=p_empresa_id FOR UPDATE;
 IF v_p.id IS NULL THEN RAISE EXCEPTION 'Prestação não encontrada.'; END IF;
 SELECT r.id INTO v_id FROM public.prestacao_repasses_v109 r
 WHERE r.empresa_id=p_empresa_id AND r.chave_operacao=p_chave_operacao;
 IF v_id IS NOT NULL THEN
  RETURN jsonb_build_object('repasse_id',v_id,'ja_confirmado',true);
 END IF;
 IF v_p.status='CONFERIDA' THEN RAISE EXCEPTION 'Prestação já encerrada.'; END IF;
 v_devido:=coalesce((v_p.valores_esperados->>
  CASE p_forma WHEN 'DINHEIRO' THEN 'dinheiro'
   WHEN 'PIX' THEN 'pix_entregador'
   ELSE 'cartao_entregador' END)::numeric,0);
 SELECT coalesce(sum(r.valor+r.taxa_cartao_autorizada),0) INTO v_pago
 FROM public.prestacao_repasses_v109 r
 WHERE r.prestacao_id=v_p.id AND r.forma=p_forma;
 IF v_valor+v_taxa>v_devido-v_pago+0.005 THEN
  RAISE EXCEPTION 'Valor superior ao saldo pendente deste meio (R$ %).',
    greatest(0,v_devido-v_pago);
 END IF;
 INSERT INTO public.prestacao_repasses_v109(
  empresa_id,prestacao_id,forma,valor,taxa_cartao_autorizada,
  referencia,confirmado_por,chave_operacao
 ) VALUES(
  p_empresa_id,v_p.id,p_forma,v_valor,v_taxa,
  nullif(trim(coalesce(p_referencia,'')),''),v_uid,p_chave_operacao
 ) RETURNING id INTO v_id;
 SELECT coalesce(sum(i.valor),0)-
    coalesce((SELECT sum(r.valor+r.taxa_cartao_autorizada)
      FROM public.prestacao_repasses_v109 r WHERE r.prestacao_id=v_p.id),0)
 INTO v_pendente FROM public.prestacao_itens_v109 i
 WHERE i.prestacao_id=v_p.id AND i.destino='ENTREGADOR';
 SELECT count(*) INTO v_emp_pendente FROM public.prestacao_itens_v109 i
 WHERE i.prestacao_id=v_p.id AND i.destino='EMPRESA' AND i.conciliado_em IS NULL;
 UPDATE public.prestacoes_contas_v109
 SET status=CASE WHEN v_pendente<=0.009 AND v_emp_pendente=0 THEN 'CONFERIDA'
                 ELSE 'PARCIAL' END,updated_at=now()
 WHERE id=v_p.id;
 INSERT INTO public.auditoria_eventos(empresa_id,usuario_id,entidade,entidade_id,acao,dados)
 VALUES(p_empresa_id,v_uid,'PRESTACAO',v_p.id::text,'REPASSE_CD_CONFIRMADO_V109',
   jsonb_build_object('repasse_id',v_id,'forma',p_forma,'valor',v_valor,
    'taxa_cartao',v_taxa,'referencia',p_referencia,'saldo_pendente',greatest(0,v_pendente)));
 RETURN jsonb_build_object('repasse_id',v_id,'ja_confirmado',false,
    'pendente',greatest(0,v_pendente));
END;
$rep$;
REVOKE ALL ON FUNCTION public.registrar_repasse_cd_v109(
 uuid,bigint,text,numeric,numeric,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.registrar_repasse_cd_v109(
 uuid,bigint,text,numeric,numeric,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.conciliar_credito_empresa_v109(
 p_empresa_id uuid,p_item_id bigint,p_referencia text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $conc$
DECLARE v_uid uuid:=auth.uid();v_i public.prestacao_itens_v109%rowtype;
 v_pendente numeric;v_emp_pendente int;
BEGIN
 IF v_uid IS NULL OR NOT app_private.is_empresa_member(p_empresa_id)
   OR NOT app_private.has_permission(p_empresa_id,'FINANCEIRO_AUDITAR') THEN
  RAISE EXCEPTION 'Somente o Financeiro/CD pode conciliar transações.';
 END IF;
 IF length(trim(coalesce(p_referencia,'')))<4 OR length(p_referencia)>250 THEN
  RAISE EXCEPTION 'Informe ID da transação, comprovante ou referência bancária.';
 END IF;
 SELECT * INTO v_i FROM public.prestacao_itens_v109 i
 WHERE i.empresa_id=p_empresa_id AND i.id=p_item_id FOR UPDATE;
 IF v_i.id IS NULL OR v_i.destino<>'EMPRESA' OR v_i.forma NOT IN ('PIX','CARTAO') THEN
  RAISE EXCEPTION 'Transação corporativa inválida.';
 END IF;
 IF v_i.conciliado_em IS NOT NULL THEN
  RETURN jsonb_build_object('conciliado',true,'ja_conciliado',true,'item_id',v_i.id);
 END IF;
 UPDATE public.prestacao_itens_v109
 SET conciliado_em=now(),conciliado_por=v_uid,
     referencia_conciliacao=trim(p_referencia)
 WHERE id=v_i.id AND empresa_id=p_empresa_id;
 SELECT coalesce(sum(i.valor),0)-
   coalesce((SELECT sum(r.valor+r.taxa_cartao_autorizada)
     FROM public.prestacao_repasses_v109 r
     WHERE r.prestacao_id=v_i.prestacao_id),0) INTO v_pendente
 FROM public.prestacao_itens_v109 i
 WHERE i.prestacao_id=v_i.prestacao_id AND i.destino='ENTREGADOR';
 SELECT count(*) INTO v_emp_pendente FROM public.prestacao_itens_v109 i
 WHERE i.prestacao_id=v_i.prestacao_id AND i.destino='EMPRESA'
   AND i.conciliado_em IS NULL;
 UPDATE public.prestacoes_contas_v109
 SET status=CASE WHEN v_pendente<=0.009 AND v_emp_pendente=0
                 THEN 'CONFERIDA' ELSE 'PARCIAL' END,updated_at=now()
 WHERE id=v_i.prestacao_id;
 INSERT INTO public.auditoria_eventos(empresa_id,usuario_id,entidade,entidade_id,acao,dados)
 VALUES(p_empresa_id,v_uid,'PRESTACAO',v_i.prestacao_id::text,
  'RECEBIMENTO_EMPRESA_CONCILIADO_V109',
  jsonb_build_object('item_id',v_i.id,'origem',v_i.origem,'origem_id',v_i.origem_id,
   'valor',v_i.valor,'forma',v_i.forma,'referencia',p_referencia));
 RETURN jsonb_build_object('conciliado',true,'ja_conciliado',false,'item_id',v_i.id);
END;
$conc$;
REVOKE ALL ON FUNCTION public.conciliar_credito_empresa_v109(uuid,bigint,text)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.conciliar_credito_empresa_v109(uuid,bigint,text)
 TO authenticated;

-- V108 permanece disponível para consultar histórico, mas o envio legado por dia
-- não pode registrar uma segunda prestação das mesmas transações.
REVOKE EXECUTE ON FUNCTION public.enviar_prestacao_v108(
 uuid,date,numeric,numeric,numeric,text,text,text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.conferir_prestacao_v108(
 uuid,bigint,numeric,numeric,numeric,numeric,numeric,numeric,text,boolean)
 FROM authenticated;
