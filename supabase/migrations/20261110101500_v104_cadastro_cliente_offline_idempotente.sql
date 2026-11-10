-- V104: idempotencia aditiva para cadastro de clientes em campo offline.
-- Nao modifica tabelas existentes nem registra operacoes reais na instalacao.
CREATE TABLE IF NOT EXISTS app_private.mobile_offline_clientes (
  empresa_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  operacao_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'CLIENTE_CADASTRO' CHECK (tipo = 'CLIENTE_CADASTRO'),
  hash_payload text NOT NULL,
  resultado jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, usuario_id, operacao_id)
);

ALTER TABLE app_private.mobile_offline_clientes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.mobile_offline_clientes FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mobile_sincronizar_cliente_offline(
  p_empresa_id uuid,
  p_operacao_id uuid,
  p_dados jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hash text;
  v_registro app_private.mobile_offline_clientes%ROWTYPE;
  v_resultado jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
  IF p_operacao_id IS NULL THEN RAISE EXCEPTION 'Identificador de operação obrigatório'; END IF;
  IF jsonb_typeof(p_dados) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Dados de cadastro inválidos';
  END IF;
  IF octet_length(p_dados::text) > 6000 THEN
    RAISE EXCEPTION 'Dados de cadastro excedem o limite';
  END IF;
  IF NOT app_private.is_empresa_member(p_empresa_id) THEN
    RAISE EXCEPTION 'Usuário não pertence à empresa';
  END IF;
  IF NOT app_private.has_permission(p_empresa_id, 'CLIENTE_MOBILE_CADASTRAR') THEN
    RAISE EXCEPTION 'Usuário sem permissão para cadastrar clientes';
  END IF;
  IF length(btrim(coalesce(p_dados->>'nome',''))) < 3 THEN
    RAISE EXCEPTION 'Informe o nome do cliente';
  END IF;

  v_hash := md5(p_dados::text);
  INSERT INTO app_private.mobile_offline_clientes(
    empresa_id, usuario_id, operacao_id, hash_payload
  )
  VALUES (p_empresa_id, v_uid, p_operacao_id, v_hash)
  ON CONFLICT (empresa_id, usuario_id, operacao_id) DO NOTHING;

  SELECT * INTO v_registro
    FROM app_private.mobile_offline_clientes
    WHERE empresa_id = p_empresa_id
      AND usuario_id = v_uid
      AND operacao_id = p_operacao_id
    FOR UPDATE;

  IF NOT FOUND OR v_registro.hash_payload <> v_hash THEN
    RAISE EXCEPTION 'CONFLITO_OPERACAO_ID: identificador reutilizado com dados diferentes';
  END IF;
  IF v_registro.resultado IS NOT NULL THEN
    RETURN v_registro.resultado || jsonb_build_object('repetida', true);
  END IF;

  -- A rotina oficial ja valida tenant, autorizacao e duplicidade de CPF/CNPJ.
  -- A transacao que grava o comprovante e cria o cliente e atomica.
  v_resultado := public.mobile_criar_cliente(
    p_empresa_id,
    p_dados->>'nome',
    nullif(btrim(coalesce(p_dados->>'cpf_cnpj','')), ''),
    nullif(btrim(coalesce(p_dados->>'telefone','')), ''),
    nullif(btrim(coalesce(p_dados->>'logradouro','')), ''),
    nullif(btrim(coalesce(p_dados->>'numero','')), ''),
    nullif(btrim(coalesce(p_dados->>'complemento','')), ''),
    nullif(btrim(coalesce(p_dados->>'bairro','')), ''),
    nullif(btrim(coalesce(p_dados->>'cidade','')), ''),
    nullif(btrim(coalesce(p_dados->>'uf','')), ''),
    nullif(btrim(coalesce(p_dados->>'cep','')), '')
  );

  UPDATE app_private.mobile_offline_clientes
  SET resultado = v_resultado, atualizado_em = now()
  WHERE empresa_id = p_empresa_id
    AND usuario_id = v_uid
    AND operacao_id = p_operacao_id;

  RETURN v_resultado || jsonb_build_object('repetida', false);
END;
$$;

REVOKE ALL ON FUNCTION public.mobile_sincronizar_cliente_offline(uuid,uuid,jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mobile_sincronizar_cliente_offline(uuid,uuid,jsonb)
  TO authenticated;
