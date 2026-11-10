-- V105.2: venda de rota + entrega fisica offline, indivisiveis e idempotentes.
-- A transacao de ponta a ponta usa as MESMAS funcoes de negocio do fluxo online.
CREATE TABLE IF NOT EXISTS app_private.mobile_offline_vendas_rota (
  empresa_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  operacao_id uuid NOT NULL,
  hash_payload text NOT NULL,
  resultado jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  confirmado_em timestamptz,
  PRIMARY KEY (empresa_id,usuario_id,operacao_id)
);
ALTER TABLE app_private.mobile_offline_vendas_rota ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.mobile_offline_vendas_rota FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.mobile_sincronizar_venda_rota_offline(
  p_empresa_id uuid, p_operacao_id uuid, p_dados jsonb
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hash text;
  v_ledger app_private.mobile_offline_vendas_rota%ROWTYPE;
  v_rota_cliente bigint;
  v_cliente_id bigint;
  v_carga_id bigint;
  v_tipo_id bigint;
  v_quantidade integer;
  v_tipo_venda text;
  v_forma text;
  v_valor_entrada numeric(12,2);
  v_total_esperado numeric(12,2);
  v_total_atual numeric(12,2);
  v_parcelas integer;
  v_vencimento date;
  v_observacao text;
  v_modo text;
  v_exige boolean;
  v_codigos text[];
  v_preparado jsonb;
  v_concluido jsonb;
  v_fluxo_id bigint;
  v_fluxo public.venda_fluxos_campo%ROWTYPE;
  v_existe bigint;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
  IF p_operacao_id IS NULL OR jsonb_typeof(p_dados) IS DISTINCT FROM 'object'
    OR octet_length(p_dados::text) > 16000 THEN
    RAISE EXCEPTION 'Operação de venda offline inválida';
  END IF;
  IF NOT app_private.is_empresa_member(p_empresa_id)
    OR NOT app_private.has_permission(p_empresa_id,'ROTA_MOBILE_GERENCIAR_PROPRIA')
    OR NOT app_private.has_permission(p_empresa_id,'ENTREGA_REALIZAR')
    OR NOT app_private.can_register_mobile_payment(p_empresa_id) THEN
    RAISE EXCEPTION 'Permissão insuficiente para sincronizar venda';
  END IF;

  v_hash:=md5(p_dados::text);
  INSERT INTO app_private.mobile_offline_vendas_rota(
    empresa_id,usuario_id,operacao_id,hash_payload
  ) VALUES (p_empresa_id,v_uid,p_operacao_id,v_hash)
  ON CONFLICT(empresa_id,usuario_id,operacao_id) DO NOTHING;
  SELECT * INTO v_ledger FROM app_private.mobile_offline_vendas_rota
  WHERE empresa_id=p_empresa_id AND usuario_id=v_uid AND operacao_id=p_operacao_id
  FOR UPDATE;
  IF NOT FOUND OR v_ledger.hash_payload IS DISTINCT FROM v_hash THEN
    RAISE EXCEPTION 'CONFLITO_OPERACAO_ID: identificador reutilizado com outros dados';
  END IF;
  IF v_ledger.resultado IS NOT NULL THEN
    RETURN v_ledger.resultado || jsonb_build_object('repetida',true);
  END IF;

  IF jsonb_typeof(p_dados->'rotaClienteId') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_dados->'clienteId') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_dados->'cargaId') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_dados->'tipoCestaId') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_dados->'quantidade') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_dados->'valorTotalEsperado') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_dados->'valorEntrada') IS DISTINCT FROM 'number' THEN
    RAISE EXCEPTION 'Dados numéricos de venda inválidos';
  END IF;
  v_rota_cliente:=(p_dados->>'rotaClienteId')::bigint;
  v_cliente_id:=(p_dados->>'clienteId')::bigint;
  v_carga_id:=(p_dados->>'cargaId')::bigint;
  v_tipo_id:=(p_dados->>'tipoCestaId')::bigint;
  v_quantidade:=(p_dados->>'quantidade')::integer;
  v_total_esperado:=(p_dados->>'valorTotalEsperado')::numeric(12,2);
  v_valor_entrada:=(p_dados->>'valorEntrada')::numeric(12,2);
  IF v_rota_cliente<=0 OR v_cliente_id<=0 OR v_carga_id<=0 OR v_tipo_id<=0
     OR v_quantidade<1 OR v_quantidade>100 OR v_total_esperado<=0
     OR v_valor_entrada<0 THEN
    RAISE EXCEPTION 'Valores ou identificadores inválidos';
  END IF;

  v_tipo_venda:=p_dados->>'tipoVenda';
  v_forma:=nullif(btrim(coalesce(p_dados->>'formaPagamento','')),'');
  v_observacao:=nullif(btrim(coalesce(p_dados->>'observacao','')),'');
  IF v_tipo_venda NOT IN ('AVISTA','SALDO_ABERTO','CREDIARIO') OR
      length(coalesce(v_observacao,''))>500 OR
      (v_forma IS NOT NULL AND v_forma NOT IN ('PIX','DINHEIRO','CARTAO','TRANSFERENCIA','OUTRO')) THEN
    RAISE EXCEPTION 'Modalidade, pagamento ou observação inválidos';
  END IF;
  IF v_tipo_venda='CREDIARIO' THEN
    IF jsonb_typeof(p_dados->'quantidadeParcelas') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'Número de parcelas inválido';
    END IF;
    v_parcelas:=(p_dados->>'quantidadeParcelas')::integer;
    IF v_parcelas<1 OR v_parcelas>120 THEN RAISE EXCEPTION 'Parcelamento inválido'; END IF;
  ELSE v_parcelas:=NULL;
  END IF;
  IF v_tipo_venda<>'AVISTA' THEN
    IF (p_dados->>'primeiroVencimento') !~ '^\d{4}-\d{2}-\d{2}$' THEN
      RAISE EXCEPTION 'Data do primeiro vencimento inválida';
    END IF;
    v_vencimento:=(p_dados->>'primeiroVencimento')::date;
    IF v_valor_entrada>=v_total_esperado THEN RAISE EXCEPTION 'Entrada maior que saldo da venda'; END IF;
  ELSE
    v_vencimento:=NULL;
  END IF;

  -- Evita troca silenciosa de empresa, cliente e carga apos o registro offline.
  IF NOT EXISTS (
    SELECT 1 FROM public.rota_clientes rc
    JOIN public.rotas r ON r.empresa_id=rc.empresa_id AND r.id=rc.rota_id
    WHERE rc.id=v_rota_cliente AND rc.empresa_id=p_empresa_id
      AND rc.cliente_id=v_cliente_id
      AND r.entregador_id=v_uid
  ) THEN RAISE EXCEPTION 'Cliente ou rota mudou desde a operação offline'; END IF;

  SELECT round(tc.valor_venda*v_quantidade,2)
  INTO v_total_atual
  FROM public.tipos_cesta tc
  WHERE tc.empresa_id=p_empresa_id AND tc.id=v_tipo_id AND tc.ativo=true;
  IF v_total_atual IS NULL OR v_total_atual<>v_total_esperado THEN
    RAISE EXCEPTION 'Preço da cesta mudou durante o offline. Revisão obrigatória';
  END IF;

  SELECT ec.modo_controle_carga,ec.exigir_bipagem_entrega INTO v_modo,v_exige
  FROM public.empresa_configuracoes ec WHERE ec.empresa_id=p_empresa_id;
  IF v_modo IS NULL THEN RAISE EXCEPTION 'Configuração operacional indisponível'; END IF;
  v_exige := (v_modo='VOLUME' AND coalesce(v_exige,false));
  IF (p_dados->>'modoControle') IS DISTINCT FROM v_modo
    OR (p_dados->>'exigirBipagem')::boolean IS DISTINCT FROM v_exige THEN
    RAISE EXCEPTION 'Modo de bipagem alterado durante o offline. Revisão necessária';
  END IF;

  IF jsonb_typeof(p_dados->'codigosVolume') IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_dados->'codigosVolume')>100 THEN
    RAISE EXCEPTION 'Volumes inválidos';
  END IF;
  SELECT coalesce(array_agg(upper(btrim(t.codigo)) ORDER BY t.ordem),ARRAY[]::text[])
  INTO v_codigos FROM jsonb_array_elements_text(p_dados->'codigosVolume')
  WITH ORDINALITY AS t(codigo,ordem);
  IF EXISTS(SELECT 1 FROM unnest(v_codigos) AS x(codigo)
    WHERE length(x.codigo)<1 OR length(x.codigo)>120) THEN
    RAISE EXCEPTION 'Código de volume inválido';
  END IF;
  IF v_exige THEN
    IF cardinality(v_codigos)<>v_quantidade
      OR (SELECT count(DISTINCT x) FROM unnest(v_codigos) x)<>v_quantidade THEN
      RAISE EXCEPTION 'É necessário bipar cada volume apenas uma vez';
    END IF;
  ELSIF cardinality(v_codigos)>0 THEN
    RAISE EXCEPTION 'Bipagem não autorizada para esta empresa';
  END IF;

  -- Se ja houver outra preparacao para esta parada, nao sobrescreve negociacao alheia.
  SELECT f.id INTO v_existe
  FROM public.venda_fluxos_campo f
  WHERE f.empresa_id=p_empresa_id AND f.rota_cliente_id=v_rota_cliente
    AND f.status='AGUARDANDO_ENTREGA'
  LIMIT 1;
  IF v_existe IS NOT NULL THEN
    RAISE EXCEPTION 'Esta parada possui outra negociação pendente no banco. Revisão necessária';
  END IF;

  -- Preparacao e conclusao na mesma transacao. Falha em qualquer etapa faz
  -- ROLLBACK de venda, recebimento, estoque, auditoria e identificador.
  v_preparado:=public.mobile_preparar_venda_rota(
    p_empresa_id, v_rota_cliente, v_tipo_id, v_quantidade,
    v_tipo_venda, v_forma, v_valor_entrada, v_parcelas, v_vencimento,v_observacao
  );
  v_fluxo_id:=(v_preparado->>'fluxo_id')::bigint;
  SELECT * INTO v_fluxo FROM public.venda_fluxos_campo f
  WHERE f.empresa_id=p_empresa_id AND f.id=v_fluxo_id FOR UPDATE;
  IF NOT FOUND OR v_fluxo.carga_id<>v_carga_id OR v_fluxo.cliente_id<>v_cliente_id
    OR v_fluxo.valor_total<>v_total_esperado THEN
    RAISE EXCEPTION 'Carga, cliente ou preço divergiram. Operação revertida';
  END IF;
  v_concluido:=public.mobile_concluir_venda_rota(
    p_empresa_id,v_fluxo_id,CASE WHEN v_exige THEN v_codigos ELSE NULL END
  );
  IF v_concluido->>'status'<>'CONCLUIDO' OR
     nullif(v_concluido->>'entrega_id','') IS NULL OR
     nullif(v_concluido->>'venda_id','') IS NULL THEN
    RAISE EXCEPTION 'Confirmação da venda e entrega não retornou IDs válidos';
  END IF;

  UPDATE app_private.mobile_offline_vendas_rota
  SET resultado=v_concluido, confirmado_em=now()
  WHERE empresa_id=p_empresa_id AND usuario_id=v_uid AND operacao_id=p_operacao_id;
  RETURN v_concluido || jsonb_build_object('repetida',false);
END;
$$;

REVOKE ALL ON FUNCTION public.mobile_sincronizar_venda_rota_offline(uuid,uuid,jsonb)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mobile_sincronizar_venda_rota_offline(uuid,uuid,jsonb)
  TO authenticated;
