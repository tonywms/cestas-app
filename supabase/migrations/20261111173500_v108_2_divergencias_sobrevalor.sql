-- V108.2: permitir prestacao com sobra/falta sem inventar repasse corporativo.
CREATE OR REPLACE FUNCTION public.enviar_prestacao_v108(
 p_empresa_id uuid,p_data date,
 p_dinheiro numeric,p_pix numeric,p_cartao numeric,
 p_comprovante_pix text DEFAULT NULL,p_comprovante_cartao text DEFAULT NULL,
 p_observacao text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE v_uid uuid:=auth.uid();v_res jsonb;v_prestacao public.prestacoes_contas_v108%rowtype;
  v_pix_esperado numeric;v_cartao_esperado numeric;v_dinheiro_esperado numeric;
BEGIN
 IF v_uid IS NULL OR NOT app_private.is_empresa_member(p_empresa_id)
   OR NOT app_private.has_permission(p_empresa_id,'PAGAMENTO_REGISTRAR') THEN
  RAISE EXCEPTION 'Sem permissão para prestar contas.';
 END IF;
 IF p_data IS NULL OR p_data>(now() AT TIME ZONE 'America/Fortaleza')::date
   OR p_data<(now() AT TIME ZONE 'America/Fortaleza')::date-90 THEN
  RAISE EXCEPTION 'Data fora do período permitido (últimos 90 dias).';
 END IF;
 IF p_dinheiro IS NULL OR p_pix IS NULL OR p_cartao IS NULL OR
    p_dinheiro<0 OR p_pix<0 OR p_cartao<0 OR
    p_dinheiro>100000000 OR p_pix>100000000 OR p_cartao>100000000 THEN
  RAISE EXCEPTION 'Valores declarados inválidos.';
 END IF;
 IF length(coalesce(p_observacao,''))>1500 OR
    length(coalesce(p_comprovante_pix,''))>250 OR
    length(coalesce(p_comprovante_cartao,''))>250 THEN
  RAISE EXCEPTION 'Observação ou referência de comprovante muito longa.';
 END IF;
 PERFORM pg_advisory_xact_lock(
   hashtextextended('prestacao-v108:'||p_empresa_id::text||':'||v_uid::text||':'||p_data::text,0)
 );
 v_res:=app_private.resumo_prestacao_v108(p_empresa_id,v_uid,p_data);
 IF (v_res->>'sem_classificacao')::numeric<>0 THEN
  RAISE EXCEPTION 'Há recebimentos sem destinatário identificado. Solicite classificação ao Financeiro.';
 END IF;
 v_pix_esperado := (v_res->>'pix_entregador')::numeric;
 v_cartao_esperado := (v_res->>'cartao_entregador')::numeric;
 v_dinheiro_esperado := (v_res->>'dinheiro')::numeric;
 -- Diferenças para MAIS ou MENOS devem ser declaradas e auditadas.
 -- Mas não existe repasse de PIX/cartão corporativo pelo entregador.
 IF (v_pix_esperado<=0 AND p_pix>0) OR
    (v_cartao_esperado<=0 AND p_cartao>0) THEN
  RAISE EXCEPTION 'PIX/cartão registrados na empresa não devem ser repassados novamente.';
 END IF;
 IF p_pix>0 AND coalesce(trim(p_comprovante_pix),'')='' THEN
  RAISE EXCEPTION 'Informe a referência do comprovante de repasse PIX.';
 END IF;
 IF p_cartao>0 AND coalesce(trim(p_comprovante_cartao),'')='' THEN
  RAISE EXCEPTION 'Informe a referência do repasse do cartão.';
 END IF;
 SELECT * INTO v_prestacao FROM public.prestacoes_contas_v108 p
 WHERE p.empresa_id=p_empresa_id AND p.entregador_id=v_uid
  AND p.data_referencia=p_data FOR UPDATE;
 IF v_prestacao.id IS NOT NULL AND v_prestacao.status IN ('CONFERIDA','COM_DIVERGENCIA') THEN
  RAISE EXCEPTION 'Prestação conferida pelo CD: bloqueada para edição.';
 END IF;
 INSERT INTO public.prestacoes_contas_v108(
  empresa_id,entregador_id,data_referencia,status,valores_esperados,
  dinheiro_declarado,pix_repassado,cartao_repassado,
  comprovante_pix,comprovante_cartao,observacao_entregador,enviado_at,updated_at
 ) VALUES (
  p_empresa_id,v_uid,p_data,'ENVIADA',v_res,round(p_dinheiro,2),round(p_pix,2),
  round(p_cartao,2),nullif(trim(p_comprovante_pix),''),
  nullif(trim(p_comprovante_cartao),''),nullif(trim(p_observacao),''),now(),now()
 )
 ON CONFLICT (empresa_id,entregador_id,data_referencia) DO UPDATE SET
   status='ENVIADA',valores_esperados=EXCLUDED.valores_esperados,
   dinheiro_declarado=EXCLUDED.dinheiro_declarado,pix_repassado=EXCLUDED.pix_repassado,
   cartao_repassado=EXCLUDED.cartao_repassado,comprovante_pix=EXCLUDED.comprovante_pix,
   comprovante_cartao=EXCLUDED.comprovante_cartao,
   observacao_entregador=EXCLUDED.observacao_entregador,
   enviado_at=now(),updated_at=now(),observacao_cd=NULL,
   conferido_por=NULL,conferido_at=NULL
 RETURNING * INTO v_prestacao;
 INSERT INTO public.auditoria_eventos(empresa_id,usuario_id,entidade,entidade_id,acao,dados)
 VALUES(p_empresa_id,v_uid,'PRESTACAO',v_prestacao.id::text,'PRESTACAO_ENVIADA_V108',
  jsonb_build_object('data',p_data,'esperado',v_res,'dinheiro',p_dinheiro,'pix',p_pix,'cartao',p_cartao));
 RETURN jsonb_build_object('id',v_prestacao.id,'status',v_prestacao.status);
END;
$$;

