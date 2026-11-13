-- V117 | Consulta protegida do comprovante interno de repasse do entregador ao CD.
-- SOMENTE LEITURA: não gera pagamento, não altera saldo e não reabre prestação.
CREATE OR REPLACE FUNCTION public.obter_comprovante_repasse_cd_v117(
  p_empresa_id uuid, p_prestacao_id bigint, p_repasse_id bigint
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO ''
AS $v117$
DECLARE
  v_resultado jsonb;
BEGIN
  IF auth.uid() IS NULL
     OR NOT app_private.is_empresa_member(p_empresa_id)
     OR NOT app_private.has_permission(p_empresa_id,'FINANCEIRO_AUDITAR')
  THEN
    RAISE EXCEPTION 'Acesso restrito ao Financeiro do CD.';
  END IF;
  IF p_prestacao_id IS NULL OR p_prestacao_id < 1
     OR p_repasse_id IS NULL OR p_repasse_id < 1 THEN
    RETURN NULL;
  END IF;
  SELECT jsonb_build_object(
    'protocolo', 'RP-'||lpad(r.id::text,6,'0'),
    'repasse_id',r.id,
    'prestacao_id',p.id,
    'empresa_id',p.empresa_id,
    'entregador_nome',u_ent.nome,
    'conferido_por_nome',u_cd.nome,
    'periodo_inicio',p.inicio,
    'periodo_fim',p.fim,
    'enviado_at',p.enviado_at,
    'forma',r.forma,
    'valor',r.valor,
    'taxa_cartao_autorizada',r.taxa_cartao_autorizada,
    'referencia',r.referencia,
    'confirmado_at',r.confirmado_at
  )
  INTO v_resultado
  FROM public.prestacao_repasses_v109 r
  JOIN public.prestacoes_contas_v109 p
    ON p.id=r.prestacao_id AND p.empresa_id=r.empresa_id
  JOIN public.usuarios u_ent ON u_ent.id=p.entregador_id
  JOIN public.usuarios u_cd ON u_cd.id=r.confirmado_por
  WHERE r.empresa_id=p_empresa_id
    AND r.prestacao_id=p_prestacao_id
    AND r.id=p_repasse_id;
  RETURN v_resultado;
END;
$v117$;
REVOKE ALL ON FUNCTION public.obter_comprovante_repasse_cd_v117(uuid,bigint,bigint)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.obter_comprovante_repasse_cd_v117(uuid,bigint,bigint)
  TO authenticated;
