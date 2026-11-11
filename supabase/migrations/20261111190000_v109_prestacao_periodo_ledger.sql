-- CESTAS APP V109 | Prestação de contas por período, extrato e saldo acumulado.
-- ADITIVA. Não gera vendas, recebimentos, baixa de estoque ou repasses.
-- Data local: America/Fortaleza. Cobrança distribuída em várias parcelas é UMA
-- movimentação, usando recebimentos_cliente; pagamentos vinculados são ignorados
-- na soma para impedir duplicidade.
ALTER TABLE public.recebimentos_cliente
 ADD COLUMN IF NOT EXISTS destino_recebimento_v108 text;
ALTER TABLE public.recebimentos_cliente
 DROP CONSTRAINT IF EXISTS recebimentos_cliente_destino_v109_ck;
ALTER TABLE public.recebimentos_cliente
 ADD CONSTRAINT recebimentos_cliente_destino_v109_ck
 CHECK (destino_recebimento_v108 IS NULL OR destino_recebimento_v108 IN ('EMPRESA','ENTREGADOR'));
DROP TRIGGER IF EXISTS trg_recebimento_cliente_destino_v109 ON public.recebimentos_cliente;
CREATE TRIGGER trg_recebimento_cliente_destino_v109
 BEFORE INSERT ON public.recebimentos_cliente FOR EACH ROW
 EXECUTE FUNCTION app_private.definir_destino_recebimento_v108();

CREATE TABLE IF NOT EXISTS public.prestacoes_contas_v109 (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 empresa_id uuid NOT NULL REFERENCES public.empresas(id),
 entregador_id uuid NOT NULL REFERENCES public.usuarios(id),
 inicio date NOT NULL,
 fim date NOT NULL,
 status text NOT NULL DEFAULT 'ENVIADA'
   CHECK (status IN ('ENVIADA','PARCIAL','CONFERIDA','DEVOLVIDA')),
 valores_esperados jsonb NOT NULL,
 dinheiro_declarado numeric(14,2) NOT NULL DEFAULT 0 CHECK(dinheiro_declarado>=0),
 pix_declarado numeric(14,2) NOT NULL DEFAULT 0 CHECK(pix_declarado>=0),
 cartao_declarado numeric(14,2) NOT NULL DEFAULT 0 CHECK(cartao_declarado>=0),
 observacao_entregador text,
 observacao_cd text,
 enviado_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(empresa_id,entregador_id,inicio,fim),
 CHECK (fim>=inicio AND fim-inicio<=90)
);
CREATE INDEX IF NOT EXISTS prestacoes_v109_cd_idx
 ON public.prestacoes_contas_v109(empresa_id,status,enviado_at DESC);
CREATE TABLE IF NOT EXISTS public.prestacao_itens_v109 (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 prestacao_id bigint NOT NULL REFERENCES public.prestacoes_contas_v109(id) ON DELETE RESTRICT,
 empresa_id uuid NOT NULL REFERENCES public.empresas(id),
 origem text NOT NULL CHECK(origem IN ('VENDA','COBRANCA','PARCELA')),
 origem_id bigint NOT NULL,
 cliente_id bigint NOT NULL REFERENCES public.clientes(id),
 cliente_nome text NOT NULL,
 recebido_at timestamptz NOT NULL,
 forma text NOT NULL,
 destino text NOT NULL CHECK(destino IN ('EMPRESA','ENTREGADOR')),
 valor numeric(14,2) NOT NULL CHECK(valor>0),
 conciliado_em timestamptz,
 conciliado_por uuid REFERENCES public.usuarios(id),
 referencia_conciliacao text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(empresa_id,origem,origem_id)
);
CREATE INDEX IF NOT EXISTS prestacao_itens_v109_prestacao_idx
 ON public.prestacao_itens_v109(prestacao_id,recebido_at);
CREATE TABLE IF NOT EXISTS public.prestacao_repasses_v109 (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 empresa_id uuid NOT NULL REFERENCES public.empresas(id),
 prestacao_id bigint NOT NULL REFERENCES public.prestacoes_contas_v109(id) ON DELETE RESTRICT,
 forma text NOT NULL CHECK(forma IN ('DINHEIRO','PIX','CARTAO')),
 valor numeric(14,2) NOT NULL CHECK(valor>0),
 taxa_cartao_autorizada numeric(14,2) NOT NULL DEFAULT 0 CHECK(taxa_cartao_autorizada>=0),
 referencia text,
 confirmado_por uuid NOT NULL REFERENCES public.usuarios(id),
 chave_operacao uuid NOT NULL,
 confirmado_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(empresa_id,chave_operacao),
 CHECK(forma='CARTAO' OR taxa_cartao_autorizada=0)
);
CREATE INDEX IF NOT EXISTS prestacao_repasses_v109_id_idx ON public.prestacao_repasses_v109(prestacao_id);
-- Todo acesso financeiro ocorre via RPC autenticada e autorizada. Sem API REST direta.
ALTER TABLE public.prestacoes_contas_v109 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestacao_itens_v109 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestacao_repasses_v109 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.prestacoes_contas_v109,public.prestacao_itens_v109,
 public.prestacao_repasses_v109 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION app_private.movimentos_prestacao_v109(
 p_empresa_id uuid,p_entregador uuid,p_inicio date,p_fim date
) RETURNS TABLE(
 origem text,origem_id bigint,cliente_id bigint,cliente_nome text,
 recebido_at timestamptz,forma text,destino text,valor numeric
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $mv$
 WITH janela AS (
  SELECT (p_inicio::timestamp AT TIME ZONE 'America/Fortaleza') AS inicio_ts,
         ((p_fim+1)::timestamp AT TIME ZONE 'America/Fortaleza') AS fim_ts
 ),
 brutos AS (
  SELECT 'VENDA'::text origem,vr.id origem_id,vr.cliente_id,cl.nome cliente_nome,
   vr.created_at recebido_at,vr.forma_pagamento forma,
   CASE WHEN vr.forma_pagamento='DINHEIRO' THEN 'ENTREGADOR'
        ELSE vr.destino_recebimento_v108 END destino,
   greatest(0,vr.valor-coalesce((
     SELECT sum(fe.valor) FROM public.financeiro_estornos fe
     WHERE fe.empresa_id=vr.empresa_id AND fe.origem_id=vr.id
       AND fe.tipo_origem IN ('VENDA_RECEBIMENTO','RECEBIMENTO_VENDA')
   ),0))::numeric valor
  FROM public.venda_recebimentos vr
  JOIN public.clientes cl ON cl.id=vr.cliente_id AND cl.empresa_id=vr.empresa_id
  CROSS JOIN janela j
  WHERE vr.empresa_id=p_empresa_id AND vr.recebido_por=p_entregador
    AND vr.created_at>=j.inicio_ts AND vr.created_at<j.fim_ts
  UNION ALL
  SELECT 'COBRANCA',rc.id,rc.cliente_id,cl.nome,rc.created_at,rc.forma_pagamento,
   CASE WHEN rc.forma_pagamento='DINHEIRO' THEN 'ENTREGADOR'
        ELSE coalesce(rc.destino_recebimento_v108,
          (SELECT CASE WHEN min(pa.destino_recebimento_v108)=max(pa.destino_recebimento_v108)
             AND count(*)=count(pa.destino_recebimento_v108)
             THEN min(pa.destino_recebimento_v108) ELSE NULL END
           FROM public.pagamentos pa WHERE pa.empresa_id=rc.empresa_id
             AND pa.recebimento_id=rc.id))
   END,
   greatest(0,rc.valor - coalesce((
     SELECT sum(fe.valor) FROM public.financeiro_estornos fe
     WHERE fe.empresa_id=rc.empresa_id AND fe.tipo_origem='RECEBIMENTO_CLIENTE'
       AND fe.origem_id=rc.id
   ),0))::numeric
  FROM public.recebimentos_cliente rc
  JOIN public.clientes cl ON cl.id=rc.cliente_id AND cl.empresa_id=rc.empresa_id
  CROSS JOIN janela j
  WHERE rc.empresa_id=p_empresa_id AND rc.recebido_por=p_entregador
    AND rc.created_at>=j.inicio_ts AND rc.created_at<j.fim_ts
  UNION ALL
  SELECT 'PARCELA',pa.id,pa.cliente_id,cl.nome,pa.created_at,pa.forma_pagamento,
    CASE WHEN pa.forma_pagamento='DINHEIRO' THEN 'ENTREGADOR'
         ELSE pa.destino_recebimento_v108 END,
    greatest(0,pa.valor-coalesce((
      SELECT sum(fe.valor) FROM public.financeiro_estornos fe
      WHERE fe.empresa_id=pa.empresa_id AND fe.tipo_origem='PAGAMENTO_PARCELA'
        AND fe.origem_id=pa.id
    ),0))::numeric
  FROM public.pagamentos pa
  JOIN public.clientes cl ON cl.id=pa.cliente_id AND cl.empresa_id=pa.empresa_id
  CROSS JOIN janela j
  WHERE pa.empresa_id=p_empresa_id AND pa.recebido_por=p_entregador
    AND pa.recebimento_id IS NULL
    AND pa.created_at>=j.inicio_ts AND pa.created_at<j.fim_ts
 )
 SELECT b.origem,b.origem_id,b.cliente_id,b.cliente_nome,b.recebido_at,
   b.forma,b.destino,b.valor FROM brutos b WHERE b.valor>0;
$mv$;
REVOKE ALL ON FUNCTION app_private.movimentos_prestacao_v109(uuid,uuid,date,date)
 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION app_private.validar_periodo_prestacao_v109(
 p_inicio date,p_fim date
) RETURNS void LANGUAGE plpgsql STABLE SET search_path TO '' AS $vp$
BEGIN
 IF p_inicio IS NULL OR p_fim IS NULL OR p_inicio>p_fim OR p_fim-p_inicio>90
    OR p_fim>(now() AT TIME ZONE 'America/Fortaleza')::date
    OR p_inicio<(now() AT TIME ZONE 'America/Fortaleza')::date-366 THEN
  RAISE EXCEPTION 'Selecione um período válido de até 91 dias dentro dos últimos 12 meses.';
 END IF;
END;
$vp$;
REVOKE ALL ON FUNCTION app_private.validar_periodo_prestacao_v109(date,date)
 FROM PUBLIC,anon,authenticated;

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
      AND p.inicio<p_inicio
   GROUP BY p.id
 ) z WHERE z.pendente>0;
 RETURN v_res || jsonb_build_object('pendentes_anteriores',v_pendentes,
    'saldo_pendente_anterior',v_carry);
END;
$res$;
REVOKE ALL ON FUNCTION public.resumo_periodo_prestacao_v109(uuid,date,date,uuid)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resumo_periodo_prestacao_v109(uuid,date,date,uuid)
 TO authenticated;

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
 SELECT p.id INTO v_prestacao_id FROM public.prestacoes_contas_v109 p
 WHERE p.empresa_id=p_empresa_id AND p.entregador_id=v_uid
   AND p.inicio=p_inicio AND p.fim=p_fim FOR UPDATE;
 IF FOUND THEN
  RETURN jsonb_build_object('prestacao_id',v_prestacao_id,'ja_enviada',true);
 END IF;
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
REVOKE ALL ON FUNCTION public.enviar_prestacao_periodo_v109(
 uuid,date,date,numeric,numeric,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.enviar_prestacao_periodo_v109(
 uuid,date,date,numeric,numeric,numeric,text) TO authenticated;
