-- CESTAS APP V107 — fluxo financeiro ANTES da entrega física (sem rota)
-- Migração aditiva. Não remove cargas, vendas, volumes nem permissões.
-- A origem interna da cesta permanece apenas para rastreabilidade do banco.
ALTER TABLE public.venda_fluxos_campo
  ALTER COLUMN rota_id DROP NOT NULL,
  ALTER COLUMN rota_cliente_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS venda_direta_pendente_unica_v107
ON public.venda_fluxos_campo(empresa_id,entregador_id,cliente_id)
WHERE rota_cliente_id IS NULL AND status = 'AGUARDANDO_ENTREGA';

CREATE OR REPLACE FUNCTION public.mobile_preparar_venda_direta_v107(
  p_empresa_id uuid,p_cliente_id bigint,p_tipo_cesta_id bigint,
  p_quantidade integer,p_tipo_venda text,p_forma_pagamento text DEFAULT NULL,
  p_valor_entrada numeric DEFAULT 0,p_quantidade_parcelas integer DEFAULT NULL,
  p_primeiro_vencimento date DEFAULT NULL,p_observacao text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $func$
DECLARE
  v_uid uuid := auth.uid();
  v_tipo public.tipos_cesta%rowtype;
  v_carga_id bigint;
  v_saldo integer;
  v_modo text;
  v_exigir_bipagem boolean;
  v_exigir_recebimento boolean;
  v_tipo_venda text := upper(trim(coalesce(p_tipo_venda,'')));
  v_forma text := nullif(upper(trim(coalesce(p_forma_pagamento,''))),'');
  v_entrada numeric(12,2) := round(coalesce(p_valor_entrada,0),2);
  v_total numeric(12,2);
  v_atrasos integer := 0;
  v_bloqueio integer := 2;
  v_tolerancia integer := 0;
  v_excecao boolean := false;
  v_fluxo public.venda_fluxos_campo%rowtype;
BEGIN
  IF v_uid IS NULL OR NOT app_private.is_empresa_member(p_empresa_id) THEN
    RAISE EXCEPTION 'Sessão ou empresa inválida.';
  END IF;
  IF NOT app_private.has_permission(p_empresa_id,'ENTREGA_REALIZAR')
     OR NOT app_private.can_register_mobile_payment(p_empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão para vender e registrar pagamentos.';
  END IF;
  IF p_quantidade IS NULL OR p_quantidade < 1 OR p_quantidade > 100 THEN
    RAISE EXCEPTION 'Quantidade inválida.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clientes cl
    WHERE cl.empresa_id=p_empresa_id AND cl.id=p_cliente_id AND cl.ativo=true) THEN
    RAISE EXCEPTION 'Cliente não encontrado ou inativo.';
  END IF;
  SELECT * INTO v_tipo FROM public.tipos_cesta tc
  WHERE tc.empresa_id=p_empresa_id AND tc.id=p_tipo_cesta_id AND tc.ativo=true;
  IF v_tipo.id IS NULL OR coalesce(v_tipo.valor_venda,0)<=0 THEN
    RAISE EXCEPTION 'Tipo de cesta ou preço de venda inválido.';
  END IF;
  SELECT ec.modo_controle_carga,ec.exigir_bipagem_entrega,ec.exigir_bipagem_carga,
         ec.credito_bloqueio_qtd_atrasos,ec.credito_dias_tolerancia
  INTO v_modo,v_exigir_bipagem,v_exigir_recebimento,v_bloqueio,v_tolerancia
  FROM public.empresa_configuracoes ec WHERE ec.empresa_id=p_empresa_id;
  IF v_modo NOT IN ('VOLUME','QUANTIDADE') OR v_modo IS NULL THEN
    RAISE EXCEPTION 'Configuração de estoque indisponível.';
  END IF;
  v_exigir_bipagem := v_modo='VOLUME' AND coalesce(v_exigir_bipagem,false);
  v_exigir_recebimento := v_modo='VOLUME' AND coalesce(v_exigir_recebimento,false);
  v_bloqueio := coalesce(v_bloqueio,2);
  v_tolerancia := coalesce(v_tolerancia,0);
  v_total := round(p_quantidade::numeric*v_tipo.valor_venda,2);

  IF v_tipo_venda NOT IN ('AVISTA','CREDIARIO','SALDO_ABERTO') THEN
    RAISE EXCEPTION 'Tipo de venda inválido.';
  END IF;
  IF v_forma IS NOT NULL AND v_forma NOT IN ('DINHEIRO','PIX','CARTAO','TRANSFERENCIA','OUTRO') THEN
    RAISE EXCEPTION 'Forma de pagamento inválida.';
  END IF;
  IF v_tipo_venda='AVISTA' THEN
    IF v_forma IS NULL THEN RAISE EXCEPTION 'Informe a forma de pagamento.'; END IF;
    v_entrada := v_total;
  ELSE
    IF p_primeiro_vencimento IS NULL THEN
      RAISE EXCEPTION 'Informe a próxima data de cobrança.';
    END IF;
    IF p_primeiro_vencimento < current_date THEN
      RAISE EXCEPTION 'A data de cobrança não pode estar no passado.';
    END IF;
    IF v_entrada < 0 OR v_entrada >= v_total THEN
      RAISE EXCEPTION 'O valor recebido hoje deve ser menor que o total da venda.';
    END IF;
    IF v_entrada>0 AND v_forma IS NULL THEN
      RAISE EXCEPTION 'Informe a forma de pagamento do valor recebido.';
    END IF;
    IF v_entrada=0 THEN v_forma := NULL; END IF;
    IF v_tipo_venda='CREDIARIO' AND
      (p_quantidade_parcelas IS NULL OR p_quantidade_parcelas<1 OR p_quantidade_parcelas>120) THEN
      RAISE EXCEPTION 'Quantidade de parcelas inválida.';
    END IF;
    SELECT count(*)::integer INTO v_atrasos FROM public.parcelas p
    WHERE p.empresa_id=p_empresa_id AND p.cliente_id=p_cliente_id
      AND p.status IN ('ABERTA','PARCIAL')
      AND p.vencimento < (current_date-v_tolerancia);
    SELECT EXISTS(SELECT 1 FROM public.credito_liberacoes cl
      WHERE cl.empresa_id=p_empresa_id AND cl.cliente_id=p_cliente_id
      AND cl.status='ATIVA' AND cl.valido_ate>now()) INTO v_excecao;
    IF v_atrasos >= v_bloqueio AND NOT v_excecao THEN
      RAISE EXCEPTION 'Crédito bloqueado: % cobrança(s) em atraso.',v_atrasos;
    END IF;
  END IF;

  -- A carga não faz parte da operação do vendedor; é só uma origem técnica
  -- necessária ao modelo legado de entrega_itens e cesta_volumes.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('venda-direta-v107:'||p_empresa_id::text||':'||v_uid::text,0)
  );
  SELECT f.* INTO v_fluxo FROM public.venda_fluxos_campo f
  WHERE f.empresa_id=p_empresa_id AND f.entregador_id=v_uid
    AND f.cliente_id=p_cliente_id AND f.rota_cliente_id IS NULL
    AND f.status='AGUARDANDO_ENTREGA'
  ORDER BY f.id DESC LIMIT 1 FOR UPDATE;
  IF v_fluxo.id IS NOT NULL THEN
    RETURN jsonb_build_object('fluxo_id',v_fluxo.id,'ja_preparado',true);
  END IF;

  SELECT c.id,(ci.quantidade_carregada-ci.quantidade_entregue-
               ci.quantidade_retornada-ci.quantidade_avariada)
  INTO v_carga_id,v_saldo
  FROM public.cargas c
  JOIN public.carga_itens ci ON ci.empresa_id=c.empresa_id AND ci.carga_id=c.id
  WHERE c.empresa_id=p_empresa_id AND c.entregador_id=v_uid
    AND c.status IN ('ABERTA','EM_ROTA')
    AND ci.tipo_cesta_id=p_tipo_cesta_id
    AND (NOT v_exigir_recebimento OR c.recebida_at IS NOT NULL)
    AND (ci.quantidade_carregada-ci.quantidade_entregue-
         ci.quantidade_retornada-ci.quantidade_avariada)>=p_quantidade
    AND (v_modo<>'VOLUME' OR
         (SELECT count(*) FROM public.cesta_volumes cv
          WHERE cv.empresa_id=p_empresa_id AND cv.carga_id=c.id
            AND cv.tipo_cesta_id=p_tipo_cesta_id AND cv.status='EM_CARGA')>=p_quantidade)
  ORDER BY c.id,ci.id LIMIT 1 FOR UPDATE OF ci;
  IF v_carga_id IS NULL THEN
    RAISE EXCEPTION 'Estoque físico insuficiente para esta quantidade. Confira as cestas recebidas.';
  END IF;

  INSERT INTO public.venda_fluxos_campo(
    empresa_id,rota_id,rota_cliente_id,cliente_id,entregador_id,carga_id,
    tipo_cesta_id,quantidade,tipo_venda,forma_pagamento,valor_total,
    valor_entrada,quantidade_parcelas,primeiro_vencimento,observacao,
    modo_controle,exigir_bipagem,status
  ) VALUES (
    p_empresa_id,NULL,NULL,p_cliente_id,v_uid,v_carga_id,
    p_tipo_cesta_id,p_quantidade,v_tipo_venda,v_forma,v_total,v_entrada,
    CASE WHEN v_tipo_venda='CREDIARIO' THEN p_quantidade_parcelas ELSE NULL END,
    CASE WHEN v_tipo_venda='AVISTA' THEN NULL ELSE p_primeiro_vencimento END,
    nullif(trim(coalesce(p_observacao,'')),''),
    v_modo,v_exigir_bipagem,'AGUARDANDO_ENTREGA'
  ) RETURNING * INTO v_fluxo;
  INSERT INTO public.auditoria_eventos(empresa_id,usuario_id,entidade,entidade_id,acao,dados)
  VALUES(p_empresa_id,v_uid,'VENDA_FLUXO',v_fluxo.id::text,
    'VENDA_DIRETA_PREPARADA_V107',
    jsonb_build_object('cliente_id',p_cliente_id,'tipo_cesta_id',p_tipo_cesta_id,
      'quantidade',p_quantidade,'valor_total',v_total,'valor_entrada',v_entrada,
      'tipo_venda',v_tipo_venda,'carga_origem_tecnica',v_carga_id,
      'sem_rota',true,'sem_baixa_fisica',true));
  RETURN jsonb_build_object('fluxo_id',v_fluxo.id,'valor_total',v_total,'ja_preparado',false);
END;
$func$;

CREATE OR REPLACE FUNCTION public.mobile_concluir_venda_direta_v107(
  p_empresa_id uuid,p_fluxo_id bigint,p_codigos_volume text[] DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $func$
DECLARE
  v_uid uuid := auth.uid();
  v_fluxo public.venda_fluxos_campo%rowtype;
  v_valor_atual numeric(12,2);
BEGIN
  IF v_uid IS NULL OR NOT app_private.is_empresa_member(p_empresa_id) THEN
    RAISE EXCEPTION 'Sessão ou empresa inválida.';
  END IF;
  IF NOT app_private.has_permission(p_empresa_id,'ENTREGA_REALIZAR')
     OR NOT app_private.can_register_mobile_payment(p_empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão para concluir esta venda.';
  END IF;
  SELECT * INTO v_fluxo FROM public.venda_fluxos_campo f
  WHERE f.id=p_fluxo_id AND f.empresa_id=p_empresa_id AND f.entregador_id=v_uid
    AND f.rota_cliente_id IS NULL AND f.rota_id IS NULL
  FOR UPDATE;
  IF v_fluxo.id IS NULL THEN RAISE EXCEPTION 'Venda direta não encontrada.'; END IF;
  IF v_fluxo.status='CONCLUIDO' THEN
    RETURN app_private.mobile_concluir_venda_rota_impl(p_empresa_id,p_fluxo_id,p_codigos_volume);
  END IF;
  IF v_fluxo.status<>'AGUARDANDO_ENTREGA' THEN
    RAISE EXCEPTION 'Esta venda não está mais aguardando entrega.';
  END IF;
  SELECT round(tc.valor_venda*v_fluxo.quantidade,2) INTO v_valor_atual
  FROM public.tipos_cesta tc WHERE tc.empresa_id=p_empresa_id
    AND tc.id=v_fluxo.tipo_cesta_id AND tc.ativo=true;
  IF coalesce(v_valor_atual,0)<>v_fluxo.valor_total THEN
    RAISE EXCEPTION 'O preço da cesta mudou. Cancele o rascunho e revise os valores antes de entregar.';
  END IF;
  -- A função legada concentra ENTREGA + VOLUME + VENDA + RECEBIMENTO
  -- no mesmo contexto transacional. Se alguma validação falhar, tudo reverte.
  RETURN app_private.mobile_concluir_venda_rota_impl(p_empresa_id,p_fluxo_id,p_codigos_volume);
END;
$func$;

CREATE OR REPLACE FUNCTION public.mobile_cancelar_venda_direta_v107(
  p_empresa_id uuid,p_fluxo_id bigint,p_motivo text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $func$
DECLARE
  v_uid uuid := auth.uid();
  v_fluxo public.venda_fluxos_campo%rowtype;
  v_motivo text := btrim(coalesce(p_motivo,''));
BEGIN
  IF v_uid IS NULL OR NOT app_private.is_empresa_member(p_empresa_id) THEN
    RAISE EXCEPTION 'Sessão ou empresa inválida.';
  END IF;
  IF NOT app_private.has_permission(p_empresa_id,'ENTREGA_REALIZAR')
     OR NOT app_private.can_register_mobile_payment(p_empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão para cancelar venda.';
  END IF;
  IF length(v_motivo)<8 OR length(v_motivo)>500 THEN
    RAISE EXCEPTION 'Informe justificativa de 8 a 500 caracteres.';
  END IF;
  SELECT * INTO v_fluxo FROM public.venda_fluxos_campo f
  WHERE f.id=p_fluxo_id AND f.empresa_id=p_empresa_id AND f.entregador_id=v_uid
    AND f.rota_cliente_id IS NULL AND f.rota_id IS NULL FOR UPDATE;
  IF v_fluxo.id IS NULL THEN RAISE EXCEPTION 'Venda direta não encontrada.'; END IF;
  IF v_fluxo.status='CANCELADO' THEN
    RETURN jsonb_build_object('cancelado',true,'cliente_id',v_fluxo.cliente_id,
      'tipo_cesta_id',v_fluxo.tipo_cesta_id,'ja_cancelado',true);
  END IF;
  IF v_fluxo.status<>'AGUARDANDO_ENTREGA' OR v_fluxo.entrega_id IS NOT NULL
    OR v_fluxo.venda_id IS NOT NULL THEN
    RAISE EXCEPTION 'Venda já concluída ou com efeitos: cancelamento indisponível.';
  END IF;
  UPDATE public.venda_fluxos_campo SET status='CANCELADO',cancelado_at=now(),
    cancelado_por=v_uid,cancelamento_motivo=v_motivo,updated_at=now()
  WHERE id=v_fluxo.id;
  INSERT INTO public.auditoria_eventos(empresa_id,usuario_id,entidade,entidade_id,acao,dados)
  VALUES(p_empresa_id,v_uid,'VENDA_FLUXO',v_fluxo.id::text,
    'VENDA_DIRETA_PREPARADA_CANCELADA',
    jsonb_build_object('cliente_id',v_fluxo.cliente_id,
      'motivo',v_motivo,'efeitos_operacionais',false));
  RETURN jsonb_build_object('cancelado',true,'cliente_id',v_fluxo.cliente_id,
    'tipo_cesta_id',v_fluxo.tipo_cesta_id,'ja_cancelado',false);
END;
$func$;

REVOKE ALL ON FUNCTION public.mobile_preparar_venda_direta_v107(
  uuid,bigint,bigint,integer,text,text,numeric,integer,date,text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mobile_preparar_venda_direta_v107(
  uuid,bigint,bigint,integer,text,text,numeric,integer,date,text
) TO authenticated;
REVOKE ALL ON FUNCTION public.mobile_concluir_venda_direta_v107(
  uuid,bigint,text[]
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mobile_concluir_venda_direta_v107(
  uuid,bigint,text[]
) TO authenticated;
REVOKE ALL ON FUNCTION public.mobile_cancelar_venda_direta_v107(
  uuid,bigint,text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mobile_cancelar_venda_direta_v107(
  uuid,bigint,text
) TO authenticated;
