-- CESTAS APP V106.2 — PROPOSTA PARA HOMOLOGACAO ISOLADA (NAO APLICADA)
-- Objetivo: uma entrega a partir do estoque do entregador, alocando cestas
-- de quaisquer cargas ja recebidas. Carga de origem e atributo de rastreio.
-- PRE-REQUISITO: homologar recibos sem bipagem; ate la permanece o criterio
-- legado (sem bipagem obrigatoria = saldos ativos presumidos recebidos).
-- NAO RODAR NO SUPABASE COMPARTILHADO SEM TESTES TRANSACIONAIS.
--
-- O cabecalho entregas.carga_id e NOT NULL no esquema atual: usa a primeira
-- origem exclusivamente para compatibilidade; ENTREGA_ITENS e CESTA_VOLUMES
-- preservam TODAS as origens reais. Relatorios devem agregar por entrega_itens.

CREATE TABLE IF NOT EXISTS app_private.entrega_movel_requisicoes_v106 (
  empresa_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  requisicao_id uuid NOT NULL,
  entrega_id bigint NOT NULL,
  resultado jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, usuario_id, requisicao_id)
);
REVOKE ALL ON TABLE app_private.entrega_movel_requisicoes_v106 FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.registrar_entrega_estoque_movel_v106(
  p_empresa_id uuid,
  p_cliente_id bigint,
  p_tipo_cesta_id bigint,
  p_quantidade integer,
  p_codigos_volume text[] DEFAULT NULL,
  p_observacao text DEFAULT NULL,
  p_rota_cliente_id bigint DEFAULT NULL,
  p_requisicao_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $body$
DECLARE
  v_uid uuid := auth.uid();
  v_modo text;
  v_exige_carga boolean;
  v_exige_entrega boolean;
  v_rota_id bigint;
  v_codigos text[];
  v_distintos integer;
  v_total integer := 0;
  v_resto integer := 0;
  v_consumido integer := 0;
  v_saldo_item integer;
  v_pegar integer;
  v_origens jsonb := '[]'::jsonb;
  v_parte jsonb;
  v_ci record;
  v_ids uuid[];
  v_primeira_carga bigint;
  v_entrega_id bigint;
  v_atualizados integer;
  v_resultado jsonb;
  v_existente jsonb;
BEGIN
  IF v_uid IS NULL OR NOT app_private.is_empresa_member(p_empresa_id) THEN
    RAISE EXCEPTION 'Sessão ou empresa inválida.';
  END IF;
  IF NOT app_private.has_permission(p_empresa_id, 'ENTREGA_REALIZAR') THEN
    RAISE EXCEPTION 'Sem permissão para entregar cestas.';
  END IF;
  IF p_requisicao_id IS NULL THEN
    RAISE EXCEPTION 'Operação sem identificador de segurança. Reabra a venda.';
  END IF;
  IF p_quantidade IS NULL OR p_quantidade < 1 OR p_quantidade > 1000 THEN
    RAISE EXCEPTION 'Quantidade inválida.';
  END IF;
  IF p_tipo_cesta_id IS NULL OR p_tipo_cesta_id <= 0 THEN
    RAISE EXCEPTION 'Tipo de cesta inválido.';
  END IF;

  -- Idempotencia e serializacao das entregas por entregador.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('entrega-movel-v106:' || p_empresa_id::text || ':' || v_uid::text, 0)
  );
  SELECT r.resultado INTO v_existente
  FROM app_private.entrega_movel_requisicoes_v106 r
  WHERE r.empresa_id = p_empresa_id AND r.usuario_id = v_uid
    AND r.requisicao_id = p_requisicao_id;
  IF FOUND THEN RETURN v_existente; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.clientes cl WHERE cl.empresa_id=p_empresa_id
      AND cl.id=p_cliente_id AND cl.ativo=true
  ) THEN
    RAISE EXCEPTION 'Cliente inválido ou inativo.';
  END IF;

  SELECT ec.modo_controle_carga,ec.exigir_bipagem_carga,ec.exigir_bipagem_entrega
  INTO v_modo,v_exige_carga,v_exige_entrega
  FROM public.empresa_configuracoes ec WHERE ec.empresa_id=p_empresa_id;
  IF v_modo NOT IN ('QUANTIDADE','VOLUME') OR v_modo IS NULL THEN
    RAISE EXCEPTION 'Configuração de estoque inválida.';
  END IF;
  v_exige_carga := coalesce(v_exige_carga,false);
  v_exige_entrega := v_modo='VOLUME' AND coalesce(v_exige_entrega,false);

  IF v_exige_entrega AND
    NOT app_private.has_permission(p_empresa_id,'ENTREGA_BIPAR_VOLUME') THEN
    RAISE EXCEPTION 'Sem permissão para bipar volumes.';
  END IF;

  SELECT coalesce(array_agg(upper(btrim(x.codigo))), ARRAY[]::text[])
    INTO v_codigos
  FROM unnest(coalesce(p_codigos_volume,ARRAY[]::text[])) AS x(codigo);
  SELECT count(DISTINCT t.codigo) INTO v_distintos
    FROM unnest(v_codigos) t(codigo);
  IF EXISTS (SELECT 1 FROM unnest(v_codigos) t(codigo) WHERE t.codigo='') OR
     v_distintos <> cardinality(v_codigos) THEN
    RAISE EXCEPTION 'Códigos vazios ou duplicados.';
  END IF;
  IF v_modo <> 'VOLUME' AND cardinality(v_codigos)>0 THEN
    RAISE EXCEPTION 'Bipagem incompatível com o modo quantidade.';
  END IF;
  IF v_exige_entrega AND cardinality(v_codigos)<>p_quantidade THEN
    RAISE EXCEPTION 'Bipe exatamente a quantidade de volumes a entregar.';
  END IF;
  IF cardinality(v_codigos)>0 AND cardinality(v_codigos)<>p_quantidade THEN
    RAISE EXCEPTION 'Quantidade e volumes informados são diferentes.';
  END IF;

  IF p_rota_cliente_id IS NOT NULL THEN
    SELECT rc.rota_id INTO v_rota_id
    FROM public.rota_clientes rc
    JOIN public.rotas r ON r.id=rc.rota_id AND r.empresa_id=rc.empresa_id
    WHERE rc.id=p_rota_cliente_id AND rc.empresa_id=p_empresa_id
      AND rc.cliente_id=p_cliente_id AND rc.status IN ('PENDENTE','EM_ATENDIMENTO')
      AND r.entregador_id=v_uid AND r.status IN ('PLANEJADA','EM_ROTA')
    FOR UPDATE OF rc;
    IF v_rota_id IS NULL THEN
      RAISE EXCEPTION 'Atendimento não pertence à rota atual do entregador.';
    END IF;
  END IF;

  v_resto := p_quantidade;
  FOR v_ci IN
    SELECT ci.id item_id, c.id origem_id, ci.quantidade_carregada
           - ci.quantidade_entregue - ci.quantidade_retornada
           - ci.quantidade_avariada AS saldo_item
    FROM public.carga_itens ci
    JOIN public.cargas c ON c.id=ci.carga_id AND c.empresa_id=ci.empresa_id
    WHERE c.empresa_id=p_empresa_id AND c.entregador_id=v_uid
      AND c.status IN ('ABERTA','EM_ROTA')
      AND ci.tipo_cesta_id=p_tipo_cesta_id
      AND (NOT v_exige_carga OR c.recebida_at IS NOT NULL)
      AND ci.quantidade_carregada > ci.quantidade_entregue
          + ci.quantidade_retornada + ci.quantidade_avariada
    ORDER BY c.id,ci.id
    FOR UPDATE OF ci
  LOOP
    v_saldo_item := v_ci.saldo_item;
    v_total := v_total + v_saldo_item;
    v_ids := ARRAY[]::uuid[];
    IF v_modo='VOLUME' AND cardinality(v_codigos)>0 THEN
      -- Bipagem explicita: codigo decide a origem, nunca a rota ou uma carga escolhida.
      SELECT coalesce(array_agg(x.id),ARRAY[]::uuid[]) INTO v_ids
      FROM (
        SELECT cv.id FROM public.cesta_volumes cv
        WHERE cv.empresa_id=p_empresa_id AND cv.carga_id=v_ci.origem_id
          AND cv.tipo_cesta_id=p_tipo_cesta_id AND cv.status='EM_CARGA'
          AND upper(btrim(cv.codigo_volume))=ANY(v_codigos)
        ORDER BY cv.id FOR UPDATE OF cv
      ) x;
      v_pegar := cardinality(v_ids);
    ELSE
      v_pegar := least(v_resto,v_saldo_item);
      IF v_modo='VOLUME' AND v_pegar>0 THEN
        SELECT coalesce(array_agg(x.id),ARRAY[]::uuid[]) INTO v_ids
        FROM (
          SELECT cv.id FROM public.cesta_volumes cv
          WHERE cv.empresa_id=p_empresa_id AND cv.carga_id=v_ci.origem_id
            AND cv.tipo_cesta_id=p_tipo_cesta_id AND cv.status='EM_CARGA'
          ORDER BY cv.created_at,cv.id
          LIMIT v_pegar FOR UPDATE OF cv
        ) x;
        IF cardinality(v_ids)<>v_pegar THEN
          RAISE EXCEPTION 'Divergência entre saldo e volumes disponíveis da origem %.',v_ci.origem_id;
        END IF;
      END IF;
    END IF;

    IF v_pegar>v_saldo_item OR v_pegar>v_resto THEN
      RAISE EXCEPTION 'Conferência de estoque inconsistente. Nenhum volume foi baixado.';
    END IF;
    IF v_pegar>0 THEN
      v_primeira_carga := coalesce(v_primeira_carga,v_ci.origem_id);
      v_origens := v_origens || jsonb_build_array(jsonb_build_object(
        'carga_id',v_ci.origem_id,
        'item_id',v_ci.item_id,
        'quantidade',v_pegar,
        'ids',to_jsonb(v_ids)
      ));
      v_resto := v_resto-v_pegar;
      v_consumido := v_consumido+v_pegar;
    END IF;
  END LOOP;

  IF v_consumido<>p_quantidade OR v_resto<>0 THEN
    RAISE EXCEPTION 'Estoque disponível ou volumes físicos insuficientes.';
  END IF;
  -- Quando o usuario escaneia, a contagem fechada acima impede codigos de
  -- outro entregador, outro tipo, outra carga ainda nao recebida ou ja entregue.

  INSERT INTO public.entregas (
    empresa_id,carga_id,entregador_id,cliente_id,rota_cliente_id,
    status,entregue_at,observacao
  ) VALUES (
    p_empresa_id,v_primeira_carga,v_uid,p_cliente_id,p_rota_cliente_id,
    'CONCLUIDA',now(),nullif(btrim(coalesce(p_observacao,'')),'')
  ) RETURNING id INTO v_entrega_id;

  FOR v_parte IN SELECT value FROM jsonb_array_elements(v_origens)
  LOOP
    v_pegar := (v_parte->>'quantidade')::integer;
    UPDATE public.carga_itens ci
      SET quantidade_entregue=ci.quantidade_entregue+v_pegar,
          updated_at=now()
    WHERE ci.id=(v_parte->>'item_id')::bigint AND ci.empresa_id=p_empresa_id
      AND ci.quantidade_carregada-ci.quantidade_entregue
          -ci.quantidade_retornada-ci.quantidade_avariada>=v_pegar;
    GET DIAGNOSTICS v_atualizados=ROW_COUNT;
    IF v_atualizados<>1 THEN
      RAISE EXCEPTION 'Saldo da origem mudou. Operação cancelada.';
    END IF;

    INSERT INTO public.entrega_itens (
      empresa_id,entrega_id,carga_item_id,tipo_cesta_id,quantidade
    ) VALUES (
      p_empresa_id,v_entrega_id,(v_parte->>'item_id')::bigint,
      p_tipo_cesta_id,v_pegar
    );

    IF v_modo='VOLUME' THEN
      SELECT coalesce(array_agg(q.id::uuid),ARRAY[]::uuid[]) INTO v_ids
      FROM jsonb_array_elements_text(v_parte->'ids') AS q(id);
      UPDATE public.cesta_volumes cv
      SET status='ENTREGUE',entrega_id=v_entrega_id,
          entregue_at=now(),updated_at=now()
      WHERE cv.empresa_id=p_empresa_id AND cv.id=ANY(v_ids)
        AND cv.status='EM_CARGA';
      GET DIAGNOSTICS v_atualizados=ROW_COUNT;
      IF v_atualizados<>v_pegar THEN
        RAISE EXCEPTION 'Volumes alterados durante a entrega. Operação cancelada.';
      END IF;
    END IF;

    INSERT INTO public.movimentacoes_estoque (
      empresa_id,tipo_cesta_id,carga_id,usuario_id,tipo_movimento,
      quantidade,referencia,observacao
    ) VALUES (
      p_empresa_id,p_tipo_cesta_id,(v_parte->>'carga_id')::bigint,
      v_uid,'SAIDA_CARGA_ENTREGA',v_pegar,
      'ENTREGA-'||v_entrega_id::text,
      'Baixa de estoque móvel consolidado, origem preservada para rastreio.'
    );
  END LOOP;

  IF p_rota_cliente_id IS NOT NULL THEN
    UPDATE public.rota_clientes
      SET status='ENTREGUE',atendido_at=now(),updated_at=now()
    WHERE empresa_id=p_empresa_id AND id=p_rota_cliente_id;
    UPDATE public.rotas
      SET status='EM_ROTA',iniciada_at=coalesce(iniciada_at,now()),updated_at=now()
    WHERE empresa_id=p_empresa_id AND id=v_rota_id AND status='PLANEJADA';
  END IF;

  v_resultado := jsonb_build_object(
    'entrega_id',v_entrega_id,
    'quantidade',p_quantidade,
    'saldo_anterior',v_total,
    'saldo_atual',v_total-p_quantidade,
    'rota_cliente_id',p_rota_cliente_id,
    'total_origens',jsonb_array_length(v_origens)
  );
  INSERT INTO app_private.entrega_movel_requisicoes_v106 (
    empresa_id,usuario_id,requisicao_id,entrega_id,resultado
  ) VALUES (
    p_empresa_id,v_uid,p_requisicao_id,v_entrega_id,v_resultado
  );
  RETURN v_resultado;
END;
$body$;

REVOKE ALL ON FUNCTION public.registrar_entrega_estoque_movel_v106(
  uuid,bigint,bigint,integer,text[],text,bigint,uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_entrega_estoque_movel_v106(
  uuid,bigint,bigint,integer,text[],text,bigint,uuid
) TO authenticated;
