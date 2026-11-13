-- CESTAS APP V113: histórico imutável de confirmações corporativas.
-- Somente leitura. Nenhum efeito sobre valores, vendas, estoque ou repasses.
-- Origem e período limitados à empresa autorizada.
CREATE OR REPLACE FUNCTION public.historico_confirmacoes_cd_v113(
 p_empresa_id uuid,p_inicio date,p_fim date
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
 SET search_path TO '' AS $v113$
DECLARE
 v_uid uuid:=auth.uid();
 v_result jsonb;
BEGIN
 IF v_uid IS NULL OR NOT app_private.is_empresa_member(p_empresa_id)
   OR NOT app_private.has_permission(p_empresa_id,'FINANCEIRO_AUDITAR') THEN
  RAISE EXCEPTION 'Acesso restrito ao Financeiro do CD.';
 END IF;
 PERFORM app_private.validar_periodo_prestacao_v109(p_inicio,p_fim);
 WITH periodo AS (
  SELECT (p_inicio::timestamp AT TIME ZONE 'America/Fortaleza') AS dt_ini,
    ((p_fim+1)::timestamp AT TIME ZONE 'America/Fortaleza') AS dt_fim
 ), confirmacoes AS (
  SELECT cc.origem,cc.origem_id,cc.forma,cc.valor,
   cc.recebido_at,
   cl.nome AS cliente_nome,
   cc.conciliado_at AS confirmado_at,
   u.nome AS confirmado_por_nome,
   cc.conciliado_por AS confirmado_por_id,
   ('CD-'||lpad(cc.id::text,6,'0'))::text AS protocolo,
   cc.referencia,
   CASE WHEN cc.referencia LIKE 'CONF-MANUAL-CD-%'
     THEN 'MANUAL_CD' ELSE 'REFERENCIA_INFORMADA' END::text AS tipo_confirmacao,
   NULL::bigint AS prestacao_id
  FROM public.creditos_corporativos_v110 cc
  JOIN public.clientes cl ON cl.id=cc.cliente_id AND cl.empresa_id=cc.empresa_id
  JOIN public.usuarios u ON u.id=cc.conciliado_por
  CROSS JOIN periodo pe
  WHERE cc.empresa_id=p_empresa_id
    AND cc.recebido_at>=pe.dt_ini AND cc.recebido_at<pe.dt_fim
  UNION ALL
  SELECT pi.origem,pi.origem_id,pi.forma,pi.valor,
   pi.recebido_at,
   pi.cliente_nome,
   pi.conciliado_em,
   u.nome,
   pi.conciliado_por,
   ('PC-'||lpad(pi.prestacao_id::text,6,'0')||'-'||pi.id::text)::text,
   pi.referencia_conciliacao,
   'CONFERENCIA_PRESTACAO'::text,
   pi.prestacao_id
  FROM public.prestacao_itens_v109 pi
  JOIN public.usuarios u ON u.id=pi.conciliado_por
  CROSS JOIN periodo pe
  WHERE pi.empresa_id=p_empresa_id
    AND pi.destino='EMPRESA' AND pi.forma IN ('PIX','CARTAO')
    AND pi.conciliado_em IS NOT NULL
    AND pi.recebido_at>=pe.dt_ini AND pi.recebido_at<pe.dt_fim
    AND NOT EXISTS (
      SELECT 1 FROM public.creditos_corporativos_v110 cc
      WHERE cc.empresa_id=pi.empresa_id AND cc.origem=pi.origem
      AND cc.origem_id=pi.origem_id
    )
 )
 SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.confirmado_at DESC,c.origem_id DESC),'[]'::jsonb)
 INTO v_result FROM confirmacoes c;
 RETURN v_result;
END;
$v113$;
REVOKE ALL ON FUNCTION public.historico_confirmacoes_cd_v113(uuid,date,date)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.historico_confirmacoes_cd_v113(uuid,date,date)
 TO authenticated;
