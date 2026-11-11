-- V108.1: evitar falso fechamento se o CD diverge da declaração; bloquear formas não modeladas.
CREATE OR REPLACE FUNCTION app_private.resumo_prestacao_v108(
 p_empresa_id uuid,p_entregador_id uuid,p_data date
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
 v_inicio timestamptz;
 v_fim timestamptz;
 v_res jsonb;
BEGIN
 IF p_data IS NULL THEN RAISE EXCEPTION 'Data obrigatória.'; END IF;
 IF p_data > (now() AT TIME ZONE 'America/Fortaleza')::date THEN
  RAISE EXCEPTION 'Data futura não permitida.';
 END IF;
 v_inicio := (p_data::timestamp AT TIME ZONE 'America/Fortaleza');
 v_fim := ((p_data+1)::timestamp AT TIME ZONE 'America/Fortaleza');
 WITH movimentos AS (
   SELECT vr.forma_pagamento forma,vr.destino_recebimento_v108 destino,
     vr.valor::numeric valor
   FROM public.venda_recebimentos vr
   WHERE vr.empresa_id=p_empresa_id AND vr.recebido_por=p_entregador_id
     AND vr.created_at>=v_inicio AND vr.created_at<v_fim
   UNION ALL
   SELECT pa.forma_pagamento,pa.destino_recebimento_v108,pa.valor
   FROM public.pagamentos pa
   WHERE pa.empresa_id=p_empresa_id AND pa.recebido_por=p_entregador_id
     AND pa.created_at>=v_inicio AND pa.created_at<v_fim
   UNION ALL
   SELECT fe.forma_pagamento,CASE
     WHEN fe.forma_pagamento='DINHEIRO' THEN 'ENTREGADOR'
     ELSE COALESCE(
       (SELECT pa.destino_recebimento_v108 FROM public.pagamentos pa
         WHERE pa.id=fe.origem_id AND fe.tipo_origem='PAGAMENTO_PARCELA'
           AND pa.empresa_id=fe.empresa_id),
       (SELECT pa.destino_recebimento_v108 FROM public.pagamentos pa
         JOIN public.recebimentos_cliente rc ON rc.id=pa.recebimento_id
         WHERE fe.tipo_origem='RECEBIMENTO_CLIENTE' AND rc.id=fe.origem_id
           AND pa.empresa_id=fe.empresa_id ORDER BY pa.id LIMIT 1)
     ) END,
     -fe.valor
   FROM public.financeiro_estornos fe
   WHERE fe.empresa_id=p_empresa_id AND fe.recebido_por_original=p_entregador_id
     AND fe.origem_created_at>=v_inicio AND fe.origem_created_at<v_fim
 )
 SELECT jsonb_build_object(
   'dinheiro',coalesce(sum(valor) FILTER (WHERE forma='DINHEIRO'),0),
   'pix_empresa',coalesce(sum(valor) FILTER (WHERE forma='PIX' AND destino='EMPRESA'),0),
   'pix_entregador',coalesce(sum(valor) FILTER (WHERE forma='PIX' AND destino='ENTREGADOR'),0),
   'cartao_empresa',coalesce(sum(valor) FILTER (WHERE forma='CARTAO' AND destino='EMPRESA'),0),
   'cartao_entregador',coalesce(sum(valor) FILTER (WHERE forma='CARTAO' AND destino='ENTREGADOR'),0),
   'sem_classificacao',coalesce(sum(abs(valor)) FILTER (WHERE
        ((forma IN ('PIX','CARTAO') AND destino IS NULL) OR forma NOT IN ('DINHEIRO','PIX','CARTAO'))),0),
   'total_recebido',coalesce(sum(valor),0),
   'quantidade_movimentos',count(*)
 ) INTO v_res FROM movimentos;
 RETURN v_res;
END;
$$;


CREATE OR REPLACE FUNCTION public.conferir_prestacao_v108(
 p_empresa_id uuid,p_id bigint,p_dinheiro numeric,p_pix numeric,p_cartao numeric,
 p_pix_empresa numeric DEFAULT 0,p_cartao_empresa numeric DEFAULT 0,
 p_taxa_cartao numeric DEFAULT 0,p_observacao text DEFAULT NULL,
 p_devolver boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE v_uid uuid:=auth.uid();v_p public.prestacoes_contas_v108%rowtype;
  v_res jsonb;v_div numeric;v_esperado_cartao numeric;v_status text;
BEGIN
 IF v_uid IS NULL OR NOT app_private.is_empresa_member(p_empresa_id) OR
  NOT app_private.has_permission(p_empresa_id,'FINANCEIRO_AUDITAR') THEN
  RAISE EXCEPTION 'Sem permissão para conferir prestação.';
 END IF;
 IF p_dinheiro IS NULL OR p_pix IS NULL OR p_cartao IS NULL OR p_taxa_cartao IS NULL
 OR p_pix_empresa IS NULL OR p_cartao_empresa IS NULL OR
 p_dinheiro<0 OR p_pix<0 OR p_cartao<0 OR p_taxa_cartao<0 OR
 p_pix_empresa<0 OR p_cartao_empresa<0 THEN
  RAISE EXCEPTION 'Conferência com valores inválidos.';
 END IF;
 IF length(coalesce(p_observacao,''))>1500 THEN RAISE EXCEPTION 'Observação muito longa.';END IF;
 SELECT * INTO v_p FROM public.prestacoes_contas_v108 p
 WHERE p.empresa_id=p_empresa_id AND p.id=p_id FOR UPDATE;
 IF v_p.id IS NULL OR v_p.status NOT IN ('ENVIADA','DEVOLVIDA') THEN
  RAISE EXCEPTION 'Prestação inexistente, já conferida ou bloqueada.';
 END IF;
 IF p_devolver AND length(trim(coalesce(p_observacao,'')))<8 THEN
   RAISE EXCEPTION 'Informe motivo para devolver ao entregador.';
 END IF;
 -- Se houve nova venda ou estorno após envio, exige nova prestação.
 v_res:=app_private.resumo_prestacao_v108(p_empresa_id,v_p.entregador_id,v_p.data_referencia);
 IF v_res<>v_p.valores_esperados THEN
  RAISE EXCEPTION 'Há movimentações novas no período. Solicite reenvio antes de conferir.';
 END IF;
 v_esperado_cartao:= (v_res->>'cartao_entregador')::numeric - p_taxa_cartao;
 IF v_esperado_cartao<0 THEN RAISE EXCEPTION 'Taxa acima do cartão esperado.';END IF;
 v_div:=abs(p_dinheiro - (v_res->>'dinheiro')::numeric)
      +abs(p_pix - (v_res->>'pix_entregador')::numeric)
      +abs(p_cartao - v_esperado_cartao)
      +abs(p_pix_empresa - (v_res->>'pix_empresa')::numeric)
      +abs(p_cartao_empresa - (v_res->>'cartao_empresa')::numeric)
      +abs(p_dinheiro - v_p.dinheiro_declarado)
      +abs(p_pix - v_p.pix_repassado)
      +abs(p_cartao - v_p.cartao_repassado);
 v_status:=CASE WHEN p_devolver THEN 'DEVOLVIDA'
   WHEN v_div<=0.009 THEN 'CONFERIDA'
   ELSE 'COM_DIVERGENCIA' END;
 UPDATE public.prestacoes_contas_v108
 SET status=v_status,
   dinheiro_conferido=CASE WHEN p_devolver THEN NULL ELSE round(p_dinheiro,2) END,
   pix_conferido=CASE WHEN p_devolver THEN NULL ELSE round(p_pix,2) END,
   cartao_conferido=CASE WHEN p_devolver THEN NULL ELSE round(p_cartao,2) END,
   pix_empresa_conciliado=CASE WHEN p_devolver THEN NULL ELSE round(p_pix_empresa,2) END,
   cartao_empresa_conciliado=CASE WHEN p_devolver THEN NULL ELSE round(p_cartao_empresa,2) END,
   taxa_cartao_autorizada=CASE WHEN p_devolver THEN 0 ELSE round(p_taxa_cartao,2) END,
   observacao_cd=nullif(trim(coalesce(p_observacao,'')),''),
   conferido_por=v_uid,conferido_at=now(),updated_at=now()
 WHERE id=v_p.id;
 INSERT INTO public.auditoria_eventos(empresa_id,usuario_id,entidade,entidade_id,acao,dados)
 VALUES(p_empresa_id,v_uid,'PRESTACAO',v_p.id::text,'PRESTACAO_CONFERIDA_CD_V108',
  jsonb_build_object('status',v_status,'divergencia_total',v_div,'taxa_cartao',p_taxa_cartao));
 RETURN jsonb_build_object('id',v_p.id,'status',v_status,'divergencia',v_div);
END;
$$;


CREATE OR REPLACE FUNCTION public.classificar_recebimento_v108(
 p_empresa_id uuid,p_origem text,p_id bigint,p_destino text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE v_uid uuid:=auth.uid();v_forma text;v_linhas integer;
BEGIN
 IF v_uid IS NULL OR NOT app_private.is_empresa_member(p_empresa_id) OR
    NOT app_private.has_permission(p_empresa_id,'FINANCEIRO_AUDITAR') THEN
   RAISE EXCEPTION 'Sem permissão para classificar recebimentos antigos.';
 END IF;
 IF p_destino NOT IN ('EMPRESA','ENTREGADOR') THEN
   RAISE EXCEPTION 'Titular inválido.';
 END IF;
 IF p_origem='VENDA' THEN
  UPDATE public.venda_recebimentos
   SET destino_recebimento_v108=p_destino
   WHERE id=p_id AND empresa_id=p_empresa_id AND destino_recebimento_v108 IS NULL
     AND forma_pagamento IN ('PIX','CARTAO');
 ELSIF p_origem='COBRANCA' THEN
  UPDATE public.pagamentos
   SET destino_recebimento_v108=p_destino
   WHERE id=p_id AND empresa_id=p_empresa_id AND destino_recebimento_v108 IS NULL
     AND forma_pagamento IN ('PIX','CARTAO');
 ELSE
   RAISE EXCEPTION 'Origem inválida.';
 END IF;
 GET DIAGNOSTICS v_linhas=ROW_COUNT;
 IF v_linhas<>1 THEN
   RAISE EXCEPTION 'Lançamento não encontrado, já classificado ou inválido.';
 END IF;
 INSERT INTO public.auditoria_eventos(empresa_id,usuario_id,entidade,entidade_id,acao,dados)
 VALUES(p_empresa_id,v_uid,'RECEBIMENTO',p_origem||'-'||p_id::text,
   'TITULAR_CLASSIFICADO_MANUALMENTE_V108',
   jsonb_build_object('origem',p_origem,'id',p_id,'titular',p_destino));
 RETURN jsonb_build_object('classificado',true,'origem',p_origem,'id',p_id,'titular',p_destino);
END;
$$;

