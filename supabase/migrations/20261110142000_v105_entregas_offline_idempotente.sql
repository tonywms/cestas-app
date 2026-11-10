-- V105: ledger de entrega offline; aplicacao atomica por UUID, sem duplicar baixa.
-- Todas as rotinas de estoque existentes continuam sendo a fonte das validacoes.
CREATE TABLE IF NOT EXISTS app_private.mobile_offline_entregas (
  empresa_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  operacao_id uuid NOT NULL,
  hash_payload text NOT NULL,
  modo text NOT NULL CHECK (modo IN ('QUANTIDADE','VOLUME')),
  resultado jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id,usuario_id,operacao_id)
);
ALTER TABLE app_private.mobile_offline_entregas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.mobile_offline_entregas FROM PUBLIC,anon,authenticated;

-- Consulta antes da validacao de credito: permite devolver o comprovante de uma
-- operacao ja efetivada, mesmo que as condicoes financeiras tenham mudado.
CREATE OR REPLACE FUNCTION public.mobile_status_entrega_offline(
  p_empresa_id uuid,p_operacao_id uuid,p_dados jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE v_uid uuid:=auth.uid(); v_row app_private.mobile_offline_entregas%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
  IF NOT app_private.is_empresa_member(p_empresa_id) OR
     NOT app_private.has_permission(p_empresa_id,'ENTREGA_REALIZAR') THEN
    RAISE EXCEPTION 'Sem acesso à operação';
  END IF;
  IF p_operacao_id IS NULL OR jsonb_typeof(p_dados) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Operação inválida';
  END IF;
  SELECT * INTO v_row FROM app_private.mobile_offline_entregas
  WHERE empresa_id=p_empresa_id AND usuario_id=v_uid AND operacao_id=p_operacao_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_row.hash_payload <> md5(p_dados::text) THEN
    RAISE EXCEPTION 'CONFLITO_OPERACAO_ID: UUID utilizado com dados distintos';
  END IF;
  IF v_row.resultado IS NULL THEN RETURN NULL; END IF;
  RETURN v_row.resultado || jsonb_build_object('repetida',true);
END; $$;

CREATE OR REPLACE FUNCTION public.mobile_sincronizar_entrega_offline(
  p_empresa_id uuid,p_operacao_id uuid,p_dados jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_uid uuid:=auth.uid();
  v_modo text; v_exigir_bipagem boolean;
  v_row app_private.mobile_offline_entregas%ROWTYPE;
  v_hash text; v_res jsonb; v_codes text[];
  v_carga_id bigint; v_cliente_id bigint; v_tipo_id bigint;
  v_rota_id bigint; v_qtd int; v_obs text;
  v_bloqueio int:=2; v_tolerancia int:=0; v_permitir_excecao bool:=true;
  v_atrasos bigint:=0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
  IF p_operacao_id IS NULL OR jsonb_typeof(p_dados) IS DISTINCT FROM 'object'
     OR octet_length(p_dados::text)>12000 THEN
    RAISE EXCEPTION 'Operação offline inválida';
  END IF;
  IF NOT app_private.is_empresa_member(p_empresa_id) OR
     NOT app_private.has_permission(p_empresa_id,'ENTREGA_REALIZAR') THEN
    RAISE EXCEPTION 'Usuário sem acesso à entrega';
  END IF;
  v_modo:=p_dados->>'modo';
  IF v_modo NOT IN ('QUANTIDADE','VOLUME') THEN
    RAISE EXCEPTION 'Modo de entrega não suportado';
  END IF;
  SELECT ec.exigir_bipagem_entrega INTO v_exigir_bipagem
  FROM public.empresa_configuracoes ec
  WHERE ec.empresa_id=p_empresa_id AND ec.modo_controle_carga=v_modo;
  IF NOT FOUND THEN RAISE EXCEPTION 'Configuração da empresa mudou; solicite revisão'; END IF;

  v_hash:=md5(p_dados::text);
  INSERT INTO app_private.mobile_offline_entregas
    (empresa_id,usuario_id,operacao_id,hash_payload,modo)
  VALUES(p_empresa_id,v_uid,p_operacao_id,v_hash,v_modo)
  ON CONFLICT(empresa_id,usuario_id,operacao_id) DO NOTHING;

  SELECT * INTO v_row FROM app_private.mobile_offline_entregas
  WHERE empresa_id=p_empresa_id AND usuario_id=v_uid AND operacao_id=p_operacao_id
  FOR UPDATE;
  IF NOT FOUND OR v_row.hash_payload<>v_hash OR v_row.modo<>v_modo THEN
    RAISE EXCEPTION 'CONFLITO_OPERACAO_ID: operação reenviada com outros dados';
  END IF;
  IF v_row.resultado IS NOT NULL THEN
    RETURN v_row.resultado || jsonb_build_object('repetida',true);
  END IF;

  -- Os campos sao checados antes dos casts para evitar coercoes inadvertidas.
  IF jsonb_typeof(p_dados->'cargaId')<>'number' OR
     jsonb_typeof(p_dados->'clienteId')<>'number' OR
     jsonb_typeof(p_dados->'tipoCestaId')<>'number' OR
     jsonb_typeof(p_dados->'quantidade')<>'number' THEN
    RAISE EXCEPTION 'Carga, cliente, cesta ou quantidade inválidos';
  END IF;
  v_carga_id:=(p_dados->>'cargaId')::bigint;
  v_cliente_id:=(p_dados->>'clienteId')::bigint;
  v_tipo_id:=(p_dados->>'tipoCestaId')::bigint;
  v_qtd:=(p_dados->>'quantidade')::int;
  IF v_carga_id<=0 OR v_cliente_id<=0 OR v_tipo_id<=0 OR v_qtd<1 OR v_qtd>200 THEN
    RAISE EXCEPTION 'Identificadores ou quantidade fora do limite';
  END IF;
  IF p_dados->>'rotaClienteId' IS NOT NULL THEN
    v_rota_id:=(p_dados->>'rotaClienteId')::bigint;
    IF v_rota_id<=0 THEN RAISE EXCEPTION 'Parada da rota inválida'; END IF;
  END IF;
  v_obs:=nullif(btrim(coalesce(p_dados->>'observacao','')),'');
  IF length(coalesce(v_obs,''))>500 THEN RAISE EXCEPTION 'Observação muito longa'; END IF;

  -- Validacao financeira obrigatoria DENTRO da transacao SQL.
  -- Impede que chamadas diretas da RPC contornem a verificacao do app.
  SELECT coalesce(ec.credito_bloqueio_qtd_atrasos,2),
         coalesce(ec.credito_dias_tolerancia,0),
         coalesce(ec.credito_permitir_excecao,true)
  INTO v_bloqueio,v_tolerancia,v_permitir_excecao
  FROM public.empresa_configuracoes ec WHERE ec.empresa_id=p_empresa_id;

  SELECT count(*) INTO v_atrasos FROM public.parcelas pa
  WHERE pa.empresa_id=p_empresa_id AND pa.cliente_id=v_cliente_id
    AND pa.status IN ('ABERTA','PARCIAL')
    AND pa.vencimento < ((now() AT TIME ZONE 'America/Fortaleza')::date
                       - greatest(0,coalesce(v_tolerancia,0)))
    AND greatest(0,coalesce(pa.valor,0)-coalesce(pa.valor_pago,0))>0;
  IF v_atrasos >= coalesce(v_bloqueio,2)
     AND NOT (
       coalesce(v_permitir_excecao,true)
       AND EXISTS(
         SELECT 1 FROM public.credito_liberacoes cl
         WHERE cl.empresa_id=p_empresa_id AND cl.cliente_id=v_cliente_id
           AND cl.status='ATIVA' AND cl.valido_ate>now()
       )
     ) THEN
    RAISE EXCEPTION 'ENTREGA BLOQUEADA POR CRÉDITO: cliente com % parcela(s) vencida(s)',v_atrasos;
  END IF;

  IF v_modo='QUANTIDADE' THEN
    v_res:=public.registrar_entrega_quantidade(
      p_empresa_id,v_carga_id,v_cliente_id,v_tipo_id,v_qtd,v_obs,v_rota_id);
  ELSE
    IF jsonb_typeof(p_dados->'codigosVolume') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Lista de volumes inválida';
    END IF;
    SELECT COALESCE(array_agg(upper(btrim(c.valor)) ORDER BY c.ordinal),ARRAY[]::text[])
    INTO v_codes
    FROM jsonb_array_elements_text(p_dados->'codigosVolume') WITH ORDINALITY AS c(valor,ordinal);
    IF cardinality(v_codes)>200 OR EXISTS(
       SELECT 1 FROM unnest(v_codes) v WHERE length(v)>120 OR length(v)<1
    ) THEN RAISE EXCEPTION 'Códigos de volume inválidos'; END IF;
    IF coalesce(v_exigir_bipagem,false) THEN
      IF cardinality(v_codes)<>v_qtd OR
         (SELECT count(DISTINCT x) FROM unnest(v_codes) x)<>v_qtd THEN
        RAISE EXCEPTION 'Volumes divergentes ou duplicados';
      END IF;
    ELSIF cardinality(v_codes)>0 THEN
      RAISE EXCEPTION 'Empresa não exige bipagem para esta operação';
    END IF;
    v_res:=public.registrar_entrega_volume(
      p_empresa_id,v_carga_id,v_cliente_id,v_tipo_id,
      CASE WHEN v_exigir_bipagem THEN NULL ELSE v_qtd END,
      CASE WHEN v_exigir_bipagem THEN v_codes ELSE NULL END,
      v_obs,v_rota_id);
  END IF;
  UPDATE app_private.mobile_offline_entregas
  SET resultado=v_res,atualizado_em=now()
  WHERE empresa_id=p_empresa_id AND usuario_id=v_uid AND operacao_id=p_operacao_id;
  RETURN v_res || jsonb_build_object('repetida',false);
END; $$;

REVOKE ALL ON FUNCTION public.mobile_status_entrega_offline(uuid,uuid,jsonb)
FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.mobile_sincronizar_entrega_offline(uuid,uuid,jsonb)
FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mobile_status_entrega_offline(uuid,uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mobile_sincronizar_entrega_offline(uuid,uuid,jsonb) TO authenticated;
