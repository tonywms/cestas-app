-- V109.4: usuarios e um cadastro global; empresa valida em p.empresa_id.
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
  JOIN public.usuarios u ON u.id=p.entregador_id
  WHERE p.empresa_id=p_empresa_id AND
    (v_filtro IS NULL OR p.entregador_id=v_filtro)
  ORDER BY p.id DESC LIMIT 100
 ) r;
 RETURN v_json;
END;
$list$;
