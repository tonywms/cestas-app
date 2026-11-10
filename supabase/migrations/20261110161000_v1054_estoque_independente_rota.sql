-- V105.4 | Estoque móvel e recebimento independentes de rota.
-- A escolha indica apenas o contexto de carga, sem cancelar ou transferir rotas.
-- Segurança preservada: empresa, identidade do entregador e status da carga.
CREATE OR REPLACE FUNCTION public.mobile_definir_carga_escolhida(
  p_empresa_id uuid, p_carga_id bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT app_private.is_empresa_member(p_empresa_id) THEN
    RAISE EXCEPTION 'Sessao ou empresa invalida.';
  END IF;
  IF NOT app_private.has_permission(p_empresa_id,'CARGA_VISUALIZAR') THEN
    RAISE EXCEPTION 'Sem permissao para escolher cargas.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.cargas c
    WHERE c.empresa_id = p_empresa_id
      AND c.id = p_carga_id
      AND c.entregador_id = v_uid
      AND c.status IN ('ABERTA','EM_ROTA')
  ) THEN
    RAISE EXCEPTION 'Carga indisponivel ou pertencente a outro entregador.';
  END IF;

  -- Regra V105.4: uma rota PLANEJADA/EM_ROTA em outra carga nao bloqueia
  -- o recebimento ou a selecao das cargas pertencentes ao entregador.
  -- Nao modifica rotas, volumes, movimentos de estoque nem status das cargas.
  INSERT INTO app_private.mobile_carga_escolhida
    (empresa_id, usuario_id, carga_id, updated_at)
  VALUES (p_empresa_id, v_uid, p_carga_id, now())
  ON CONFLICT (empresa_id,usuario_id)
    DO UPDATE SET carga_id = excluded.carga_id, updated_at = now();
END;
$function$;

REVOKE ALL ON FUNCTION public.mobile_definir_carga_escolhida(uuid,bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mobile_definir_carga_escolhida(uuid,bigint) TO authenticated;
