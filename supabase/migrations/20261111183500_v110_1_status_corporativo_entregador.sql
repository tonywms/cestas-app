-- V110.1: leitura de status do PIX/cartão empresarial pelo próprio entregador.
-- Só mostra recebimentos que auth.uid() registrou. Não permite confirmar o banco.
CREATE OR REPLACE FUNCTION public.resumo_creditos_entregador_v110(
 p_empresa_id uuid,p_inicio date,p_fim date
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $r$
DECLARE v_uid uuid:=auth.uid();v_out jsonb;
BEGIN
 IF v_uid IS NULL OR NOT app_private.is_empresa_member(p_empresa_id)
   OR NOT app_private.has_permission(p_empresa_id,'PAGAMENTO_REGISTRAR') THEN
  RAISE EXCEPTION 'Não autorizado a consultar status dos próprios recebimentos.';
 END IF;
 PERFORM app_private.validar_periodo_prestacao_v109(p_inicio,p_fim);
 WITH movimentos AS (
  SELECT m.origem,m.origem_id,m.forma,m.valor,
    (cc.id IS NOT NULL OR pi.conciliado_em IS NOT NULL) conciliado
  FROM app_private.movimentos_prestacao_v109(p_empresa_id,v_uid,p_inicio,p_fim) m
  LEFT JOIN public.creditos_corporativos_v110 cc
    ON cc.empresa_id=p_empresa_id AND cc.origem=m.origem AND cc.origem_id=m.origem_id
  LEFT JOIN public.prestacao_itens_v109 pi
    ON pi.empresa_id=p_empresa_id AND pi.origem=m.origem AND pi.origem_id=m.origem_id
  WHERE m.destino='EMPRESA' AND m.forma IN ('PIX','CARTAO')
 )
 SELECT jsonb_build_object(
  'valor_pendente',coalesce(sum(valor) FILTER(WHERE NOT conciliado),0),
  'valor_conciliado',coalesce(sum(valor) FILTER(WHERE conciliado),0),
  'pendentes',count(*) FILTER(WHERE NOT conciliado),
  'conciliados',count(*) FILTER(WHERE conciliado),
  'pix_pendente',coalesce(sum(valor) FILTER(WHERE NOT conciliado AND forma='PIX'),0),
  'cartao_pendente',coalesce(sum(valor) FILTER(WHERE NOT conciliado AND forma='CARTAO'),0)
 ) INTO v_out FROM movimentos;
 RETURN v_out;
END;
$r$;
REVOKE ALL ON FUNCTION public.resumo_creditos_entregador_v110(uuid,date,date)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resumo_creditos_entregador_v110(uuid,date,date)
 TO authenticated;
