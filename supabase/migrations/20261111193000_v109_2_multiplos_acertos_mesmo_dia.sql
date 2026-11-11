-- V109.2 - Vários acertos por dia ou intervalo. Cada recebimento permanece
-- único por (empresa, origem, id), sem dupla cobrança.
ALTER TABLE public.prestacoes_contas_v109
 DROP CONSTRAINT IF EXISTS prestacoes_contas_v109_empresa_id_entregador_id_inicio_fim_key;

CREATE OR REPLACE FUNCTION public.resumo_periodo_prestacao_v109(
 p_empresa_id uuid,p_inicio date,p_fim date,p_entregador_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $res$
DECLARE
 v_uid uuid:=auth.uid();v_entregador uuid:=coalesce(p_entregador_id,auth.uid());
 v_res jsonb;v_pendentes jsonb;v_carry numeric;
BEGIN
 IF v_uid IS NULL OR NOT app_private.is_empresa_member(p_empresa_id) THEN
  RAISE EXCEPTION 'Sessão ou empresa inválida.';
 END IF;
 IF v_entregador<>v_uid AND NOT app_private.has_permission(p_empresa_id,'FINANCEIRO_AUDITAR') THEN
  RAISE EXCEPTION 'Sem permissão para consultar outro entregador.';
 END IF;
 PERFORM app_private.validar_periodo_prestacao_v109(p_inicio,p_fim);
 WITH movimentos AS (
  SELECT m.*,i.prestacao_id
  FROM app_private.movimentos_prestacao_v109(p_empresa_id,v_entregador,p_inicio,p_fim) m
  LEFT JOIN public.prestacao_itens_v109 i ON i.empresa_id=p_empresa_id
   AND i.origem=m.origem AND i.origem_id=m.origem_id
 ), agregados AS (
  SELECT coalesce(sum(valor),0) total_recebido,count(*) qtde,
    coalesce(sum(valor) FILTER (WHERE forma='DINHEIRO'),0) dinheiro,
    coalesce(sum(valor) FILTER (WHERE forma='PIX' AND destino='EMPRESA'),0) pix_empresa,
    coalesce(sum(valor) FILTER (WHERE forma='PIX' AND destino='ENTREGADOR'),0) pix_entregador,
    coalesce(sum(valor) FILTER (WHERE forma='CARTAO' AND destino='EMPRESA'),0) cartao_empresa,
    coalesce(sum(valor) FILTER (WHERE forma='CARTAO' AND destino='ENTREGADOR'),0) cartao_entregador,
    coalesce(sum(valor) FILTER (WHERE (forma IN ('PIX','CARTAO') AND destino IS NULL)
      OR forma NOT IN ('DINHEIRO','PIX','CARTAO')),0) sem_classificacao,
    coalesce(sum(valor) FILTER (WHERE prestacao_id IS NOT NULL),0) ja_prestado,
    coalesce(sum(valor) FILTER (WHERE prestacao_id IS NULL),0) ainda_nao_prestado
  FROM movimentos
 )
 SELECT to_jsonb(a) || jsonb_build_object(
   'inicio',p_inicio,'fim',p_fim,
   'movimentos',coalesce((
    SELECT jsonb_agg(to_jsonb(z) ORDER BY z.recebido_at,z.origem_id) FROM (
      SELECT m.* FROM movimentos m
      ORDER BY m.recebido_at DESC,m.origem_id DESC LIMIT 500
    ) z
   ),'[]'::jsonb),
   'detalhe_limitado',a.qtde>500
 ) INTO v_res FROM agregados a;
 -- Saldo a repassar de prestações anteriores, descontando somente repasses
 -- que o CD efetivamente confirmou; nunca pelo que foi declarado.
 SELECT coalesce(jsonb_agg(to_jsonb(z) ORDER BY z.inicio), '[]'::jsonb),
        coalesce(sum(z.pendente),0)
 INTO v_pendentes,v_carry FROM (
   SELECT p.id,p.inicio,p.fim,p.status,
     greatest(0,coalesce(sum(i.valor) FILTER (WHERE i.destino='ENTREGADOR'),0) -
       coalesce((SELECT sum(r.valor+r.taxa_cartao_autorizada)
                 FROM public.prestacao_repasses_v109 r
                 WHERE r.prestacao_id=p.id),0))::numeric pendente
   FROM public.prestacoes_contas_v109 p
   JOIN public.prestacao_itens_v109 i ON i.prestacao_id=p.id
   WHERE p.empresa_id=p_empresa_id AND p.entregador_id=v_entregador
      AND p.inicio<=p_fim
   GROUP BY p.id
 ) z WHERE z.pendente>0;
 RETURN v_res || jsonb_build_object('pendentes_anteriores',v_pendentes,
    'saldo_pendente_anterior',v_carry);
END;
$res$;

CREATE OR REPLACE FUNCTION public.enviar_prestacao_periodo_v109(
 p_empresa_id uuid,p_inicio date,p_fim date,p_dinheiro_declarado numeric,
 p_pix_declarado numeric,p_cartao_declarado numeric,p_observacao text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $send$
DECLARE v_uid uuid:=auth.uid();v_prestacao_id bigint;v_totais jsonb;v_qtde int;v_incertos numeric;
BEGIN
 IF v_uid IS NULL OR NOT app_private.is_empresa_member(p_empresa_id)
    OR NOT app_private.has_permission(p_empresa_id,'PAGAMENTO_REGISTRAR') THEN
  RAISE EXCEPTION 'Sem permissão para prestar contas.';
 END IF;
 PERFORM app_private.validar_periodo_prestacao_v109(p_inicio,p_fim);
 IF p_dinheiro_declarado IS NULL OR p_pix_declarado IS NULL OR p_cartao_declarado IS NULL
  OR p_dinheiro_declarado<0 OR p_pix_declarado<0 OR p_cartao_declarado<0
  OR greatest(p_dinheiro_declarado,p_pix_declarado,p_cartao_declarado)>100000000
  OR length(coalesce(p_observacao,''))>1500 THEN
  RAISE EXCEPTION 'Valores ou observações inválidos.';
 END IF;
 PERFORM pg_advisory_xact_lock(
  hashtextextended('prestacao-v109:'||p_empresa_id::text||':'||v_uid::text,0)
 );
 WITH novos AS (
  SELECT m.* FROM app_private.movimentos_prestacao_v109(p_empresa_id,v_uid,p_inicio,p_fim) m
  WHERE NOT EXISTS(SELECT 1 FROM public.prestacao_itens_v109 i
    WHERE i.empresa_id=p_empresa_id AND i.origem=m.origem AND i.origem_id=m.origem_id)
 )
 SELECT jsonb_build_object(
  'dinheiro',coalesce(sum(valor) FILTER(WHERE forma='DINHEIRO'),0),
  'pix_empresa',coalesce(sum(valor) FILTER(WHERE forma='PIX' AND destino='EMPRESA'),0),
  'pix_entregador',coalesce(sum(valor) FILTER(WHERE forma='PIX' AND destino='ENTREGADOR'),0),
  'cartao_empresa',coalesce(sum(valor) FILTER(WHERE forma='CARTAO' AND destino='EMPRESA'),0),
  'cartao_entregador',coalesce(sum(valor) FILTER(WHERE forma='CARTAO' AND destino='ENTREGADOR'),0),
  'total',coalesce(sum(valor),0),'quantidade',count(*)),
  count(*)::int,
  coalesce(sum(valor) FILTER(WHERE (forma IN ('PIX','CARTAO') AND destino IS NULL)
     OR forma NOT IN ('DINHEIRO','PIX','CARTAO')),0)
 INTO v_totais,v_qtde,v_incertos FROM novos;
 IF v_qtde=0 THEN RAISE EXCEPTION 'Nenhum novo recebimento disponível neste período.'; END IF;
 IF v_incertos>0 THEN
  RAISE EXCEPTION 'Há R$ % com destinatário não identificado. Solicite classificação ao CD.',v_incertos;
 END IF;

 INSERT INTO public.prestacoes_contas_v109(
  empresa_id,entregador_id,inicio,fim,status,valores_esperados,
  dinheiro_declarado,pix_declarado,cartao_declarado,observacao_entregador
 ) VALUES (
  p_empresa_id,v_uid,p_inicio,p_fim,'ENVIADA',v_totais,
  round(p_dinheiro_declarado,2),round(p_pix_declarado,2),
  round(p_cartao_declarado,2),nullif(btrim(coalesce(p_observacao,'')),'')
 ) RETURNING id INTO v_prestacao_id;

 INSERT INTO public.prestacao_itens_v109(
  prestacao_id,empresa_id,origem,origem_id,cliente_id,cliente_nome,
  recebido_at,forma,destino,valor
 )
 SELECT v_prestacao_id,p_empresa_id,m.origem,m.origem_id,m.cliente_id,m.cliente_nome,
   m.recebido_at,m.forma,m.destino,round(m.valor,2)
 FROM app_private.movimentos_prestacao_v109(p_empresa_id,v_uid,p_inicio,p_fim) m
 WHERE NOT EXISTS(SELECT 1 FROM public.prestacao_itens_v109 i
    WHERE i.empresa_id=p_empresa_id AND i.origem=m.origem AND i.origem_id=m.origem_id);

 INSERT INTO public.auditoria_eventos(empresa_id,usuario_id,entidade,entidade_id,acao,dados)
 VALUES(p_empresa_id,v_uid,'PRESTACAO',v_prestacao_id::text,'PRESTACAO_PERIODO_ENVIADA_V109',
   jsonb_build_object('inicio',p_inicio,'fim',p_fim,'totais',v_totais));
 RETURN jsonb_build_object('prestacao_id',v_prestacao_id,'ja_enviada',false);
END;
$send$;

