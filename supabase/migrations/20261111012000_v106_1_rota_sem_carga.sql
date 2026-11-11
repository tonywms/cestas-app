-- CESTAS APP V106.1 | Rota do entregador independente de carga
-- Migracao ADITIVA: nao altera registros existentes, estoque, cargas ou rotas antigas.
-- Uma rota nova nao informa carga_id. Para rotas legadas, o campo historico
-- permanece intacto e nao pode controlar vendas, recebimentos ou atendimento.
CREATE OR REPLACE FUNCTION public.mobile_iniciar_rota_sem_carga_v106(
  p_empresa_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_rota public.rotas%rowtype;
  v_codigo text;
BEGIN
  IF v_uid IS NULL OR NOT app_private.is_empresa_member(p_empresa_id) THEN
    RAISE EXCEPTION 'Sessao ou empresa invalida.';
  END IF;
  IF NOT app_private.has_permission(p_empresa_id, 'ROTA_MOBILE_GERENCIAR_PROPRIA') THEN
    RAISE EXCEPTION 'Sem permissao para iniciar sua rota.';
  END IF;

  -- Evita duas rotas serem criadas simultaneamente em abas diferentes.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('rota-v106:' || p_empresa_id::text || ':' || v_uid::text, 0)
  );

  SELECT r.* INTO v_rota
  FROM public.rotas r
  WHERE r.empresa_id = p_empresa_id
    AND r.entregador_id = v_uid
    AND r.status IN ('PLANEJADA', 'EM_ROTA')
  ORDER BY r.created_at, r.id
  LIMIT 1
  FOR UPDATE;

  IF v_rota.id IS NOT NULL THEN
    IF v_rota.status = 'PLANEJADA' THEN
      UPDATE public.rotas r
      SET status = 'EM_ROTA',
          iniciada_at = coalesce(r.iniciada_at, now()),
          updated_at = now()
      WHERE r.id = v_rota.id
        AND r.empresa_id = p_empresa_id
        AND r.entregador_id = v_uid
        AND r.status = 'PLANEJADA'
      RETURNING * INTO v_rota;
    END IF;
    RETURN jsonb_build_object(
      'rota_id', v_rota.id,
      'codigo', v_rota.codigo,
      'ja_existia', true
    );
  END IF;

  v_codigo := 'RTM-' ||
    to_char(now() AT TIME ZONE 'America/Fortaleza', 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.rotas (
    empresa_id, codigo, entregador_id, data_rota,
    status, observacao, iniciada_at, origem, carga_id, criada_por
  )
  VALUES (
    p_empresa_id, v_codigo, v_uid,
    (now() AT TIME ZONE 'America/Fortaleza')::date,
    'EM_ROTA', 'Rota independente do recebimento de cargas.',
    now(), 'MOBILE', NULL, v_uid
  )
  RETURNING * INTO v_rota;

  INSERT INTO public.auditoria_eventos (
    empresa_id, usuario_id, entidade, entidade_id, acao, dados
  ) VALUES (
    p_empresa_id, v_uid, 'ROTA', v_rota.id::text,
    'ROTA_MOBILE_INICIADA_SEM_CARGA',
    jsonb_build_object('codigo', v_rota.codigo, 'origem', 'MOBILE')
  );

  RETURN jsonb_build_object(
    'rota_id', v_rota.id,
    'codigo', v_rota.codigo,
    'ja_existia', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.mobile_iniciar_rota_sem_carga_v106(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mobile_iniciar_rota_sem_carga_v106(uuid)
  TO authenticated;
