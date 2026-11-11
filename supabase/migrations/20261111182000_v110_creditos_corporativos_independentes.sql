-- CESTAS APP V110 | PIX e CARTAO da empresa conciliados diretamente pelo CD.
-- Migração aditiva: SEM lancamentos financeiros, baixas ou classificacao automatica.
-- Para empresa: pagamento registrado ≠ credito bancario conciliado.
CREATE TABLE IF NOT EXISTS public.creditos_corporativos_v110 (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  origem text NOT NULL CHECK(origem IN ('VENDA','COBRANCA','PARCELA')),
  origem_id bigint NOT NULL,
  cliente_id bigint NOT NULL REFERENCES public.clientes(id),
  recebido_por uuid NOT NULL REFERENCES public.usuarios(id),
  forma text NOT NULL CHECK(forma IN ('PIX','CARTAO')),
  valor numeric(14,2) NOT NULL CHECK(valor>0),
  recebido_at timestamptz NOT NULL,
  referencia text NOT NULL CHECK(char_length(btrim(referencia)) BETWEEN 4 AND 250),
  conciliado_por uuid NOT NULL REFERENCES public.usuarios(id),
  conciliado_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id,origem,origem_id)
);
ALTER TABLE public.creditos_corporativos_v110 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.creditos_corporativos_v110 FROM PUBLIC,anon,authenticated;
CREATE INDEX IF NOT EXISTS creditos_corporativos_empresa_data_v110
  ON public.creditos_corporativos_v110(empresa_id,recebido_at DESC);

CREATE OR REPLACE FUNCTION app_private.recebedores_corporativos_v110(
  p_empresa_id uuid,p_inicio date,p_fim date
) RETURNS TABLE(entregador_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $rc$
WITH janela AS (
  SELECT p_inicio::timestamp AT TIME ZONE 'America/Fortaleza' ini,
         (p_fim+1)::timestamp AT TIME ZONE 'America/Fortaleza' fim
)
SELECT DISTINCT z.entregador_id FROM (
  SELECT vr.recebido_por entregador_id FROM public.venda_recebimentos vr,janelA j
  WHERE vr.empresa_id=p_empresa_id AND vr.created_at>=j.ini AND vr.created_at<j.fim
    AND vr.forma_pagamento IN ('PIX','CARTAO') AND vr.destino_recebimento_v108='EMPRESA'
  UNION
  SELECT rc.recebido_por FROM public.recebimentos_cliente rc,janela j
  WHERE rc.empresa_id=p_empresa_id AND rc.created_at>=j.ini AND rc.created_at<j.fim
    AND rc.forma_pagamento IN ('PIX','CARTAO') AND rc.destino_recebimento_v108='EMPRESA'
  UNION
  SELECT pa.recebido_por FROM public.pagamentos pa,janela j
  WHERE pa.empresa_id=p_empresa_id AND pa.created_at>=j.ini AND pa.created_at<j.fim
    AND pa.recebimento_id IS NULL AND pa.forma_pagamento IN ('PIX','CARTAO')
    AND pa.destino_recebimento_v108='EMPRESA'
) z WHERE z.entregador_id IS NOT NULL;
$rc$;
REVOKE ALL ON FUNCTION app_private.recebedores_corporativos_v110(uuid,date,date)
 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.listar_creditos_corporativos_v110(
 p_empresa_id uuid,p_inicio date,p_fim date
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $list$
DECLARE
 v_uid uuid:=auth.uid();v_data jsonb;
BEGIN
 IF v_uid IS NULL OR NOT app_private.is_empresa_member(p_empresa_id)
   OR NOT app_private.has_permission(p_empresa_id,'FINANCEIRO_AUDITAR') THEN
  RAISE EXCEPTION 'Somente Financeiro/CD pode consultar os créditos corporativos.';
 END IF;
 PERFORM app_private.validar_periodo_prestacao_v109(p_inicio,p_fim);
 WITH movimentos AS (
   SELECT m.origem,m.origem_id,m.cliente_id,m.cliente_nome,m.recebido_at,
     m.forma,m.destino,m.valor,e.entregador_id,
     u.nome AS entregador_nome,
     cc.id AS confirmacao_id,cc.referencia AS confirmacao_referencia,
     cc.conciliado_at AS confirmacao_data,
     pi.id AS item_prestacao_id,pi.prestacao_id,
     pi.conciliado_em AS prestacao_conciliada_em,
     pi.referencia_conciliacao AS prestacao_referencia
   FROM app_private.recebedores_corporativos_v110(p_empresa_id,p_inicio,p_fim) e
   CROSS JOIN LATERAL app_private.movimentos_prestacao_v109(
     p_empresa_id,e.entregador_id,p_inicio,p_fim
   ) m
   LEFT JOIN public.usuarios u ON u.id=e.entregador_id
   LEFT JOIN public.creditos_corporativos_v110 cc
    ON cc.empresa_id=p_empresa_id AND cc.origem=m.origem AND cc.origem_id=m.origem_id
   LEFT JOIN public.prestacao_itens_v109 pi
    ON pi.empresa_id=p_empresa_id AND pi.origem=m.origem AND pi.origem_id=m.origem_id
   WHERE m.destino='EMPRESA' AND m.forma IN ('PIX','CARTAO')
 ), totals AS (
   SELECT count(*) AS transacoes,
     coalesce(sum(valor),0) total,
     count(*) FILTER (WHERE confirmacao_id IS NULL AND prestacao_conciliada_em IS NULL) pendentes,
     coalesce(sum(valor) FILTER (WHERE confirmacao_id IS NULL AND prestacao_conciliada_em IS NULL),0) valor_pendente,
     count(*) FILTER (WHERE confirmacao_id IS NOT NULL OR prestacao_conciliada_em IS NOT NULL) conciliados,
     coalesce(sum(valor) FILTER (WHERE confirmacao_id IS NOT NULL OR prestacao_conciliada_em IS NOT NULL),0) valor_conciliado
   FROM movimentos
 )
 SELECT to_jsonb(t)||jsonb_build_object(
   'inicio',p_inicio,'fim',p_fim,
   'movimentos',coalesce((
     SELECT jsonb_agg(to_jsonb(x) ORDER BY x.recebido_at DESC,x.origem_id DESC)
     FROM (
       SELECT m.origem,m.origem_id,m.cliente_nome,m.cliente_id,
         m.entregador_id,m.entregador_nome,m.recebido_at,m.forma,m.valor,
         m.prestacao_id,
         (m.confirmacao_id IS NOT NULL OR m.prestacao_conciliada_em IS NOT NULL) AS conciliado,
         coalesce(m.confirmacao_referencia,m.prestacao_referencia) AS referencia,
         coalesce(m.confirmacao_data,m.prestacao_conciliada_em) AS conciliado_at
       FROM movimentos m ORDER BY m.recebido_at DESC,m.origem_id DESC LIMIT 250
     ) x
   ),'[]'::jsonb),
   'detalhe_limitado',t.transacoes>250
 ) INTO v_data FROM totals t;
 RETURN v_data;
END;
$list$;
REVOKE ALL ON FUNCTION public.listar_creditos_corporativos_v110(uuid,date,date)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.listar_creditos_corporativos_v110(uuid,date,date)
 TO authenticated;

CREATE OR REPLACE FUNCTION public.conciliar_credito_direto_v110(
 p_empresa_id uuid,p_origem text,p_origem_id bigint,p_referencia text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $confirm$
DECLARE
 v_uid uuid:=auth.uid();
 v_recebedor uuid;v_forma text;v_data timestamptz;
 v_id bigint;v_item public.prestacao_itens_v109%rowtype;
 v_m record;
 v_valor numeric;v_cliente_id bigint;
 v_ja_conciliado boolean:=false;
BEGIN
 IF v_uid IS NULL OR NOT app_private.is_empresa_member(p_empresa_id)
   OR NOT app_private.has_permission(p_empresa_id,'FINANCEIRO_AUDITAR') THEN
  RAISE EXCEPTION 'Sem permissão para conciliar créditos da empresa.';
 END IF;
 IF p_origem NOT IN ('VENDA','COBRANCA','PARCELA') OR p_origem_id IS NULL OR p_origem_id<=0
    OR length(btrim(coalesce(p_referencia,'')))<4
    OR length(btrim(coalesce(p_referencia,'')))>250 THEN
  RAISE EXCEPTION 'Origem ou referência bancária inválida.';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(
   'credito-v110:'||p_empresa_id::text||':'||p_origem||':'||p_origem_id::text,0));
 SELECT cc.id INTO v_id FROM public.creditos_corporativos_v110 cc
  WHERE cc.empresa_id=p_empresa_id AND cc.origem=p_origem
    AND cc.origem_id=p_origem_id;
 IF v_id IS NOT NULL THEN
  RETURN jsonb_build_object('conciliado',true,'ja_conciliado',true,
    'origem',p_origem,'origem_id',p_origem_id,'confirmacao_id',v_id);
 END IF;
 IF p_origem='VENDA' THEN
  SELECT vr.recebido_por,vr.forma_pagamento,vr.created_at
   INTO v_recebedor,v_forma,v_data FROM public.venda_recebimentos vr
   WHERE vr.empresa_id=p_empresa_id AND vr.id=p_origem_id
     AND vr.destino_recebimento_v108='EMPRESA';
 ELSIF p_origem='COBRANCA' THEN
  SELECT rc.recebido_por,rc.forma_pagamento,rc.created_at
   INTO v_recebedor,v_forma,v_data FROM public.recebimentos_cliente rc
   WHERE rc.empresa_id=p_empresa_id AND rc.id=p_origem_id
     AND rc.destino_recebimento_v108='EMPRESA';
 ELSE
  SELECT pa.recebido_por,pa.forma_pagamento,pa.created_at
   INTO v_recebedor,v_forma,v_data FROM public.pagamentos pa
   WHERE pa.empresa_id=p_empresa_id AND pa.id=p_origem_id
     AND pa.recebimento_id IS NULL AND pa.destino_recebimento_v108='EMPRESA';
 END IF;
 IF v_recebedor IS NULL OR v_forma NOT IN ('PIX','CARTAO') OR v_data IS NULL THEN
  RAISE EXCEPTION 'Recebimento corporativo inexistente ou ainda não classificado.';
 END IF;

 SELECT m.* INTO v_m FROM app_private.movimentos_prestacao_v109(
  p_empresa_id,v_recebedor,
  (v_data AT TIME ZONE 'America/Fortaleza')::date,
  (v_data AT TIME ZONE 'America/Fortaleza')::date
 ) m WHERE m.origem=p_origem AND m.origem_id=p_origem_id AND m.destino='EMPRESA'
   AND m.forma IN ('PIX','CARTAO') AND m.valor>0;
 IF v_m.origem_id IS NULL THEN
  RAISE EXCEPTION 'Este lançamento não possui saldo confirmado e elegível para conciliação.';
 END IF;
 v_valor:=round(v_m.valor,2);
 v_cliente_id:=v_m.cliente_id;
 SELECT * INTO v_item FROM public.prestacao_itens_v109 i
  WHERE i.empresa_id=p_empresa_id AND i.origem=p_origem
    AND i.origem_id=p_origem_id FOR UPDATE;
 IF v_item.id IS NOT NULL THEN
  IF v_item.conciliado_em IS NOT NULL THEN
   RETURN jsonb_build_object('conciliado',true,'ja_conciliado',true,
     'prestacao_item_id',v_item.id);
  END IF;
  PERFORM public.conciliar_credito_empresa_v109(p_empresa_id,v_item.id,p_referencia);
  RETURN jsonb_build_object('conciliado',true,'ja_conciliado',false,
    'prestacao_item_id',v_item.id);
 END IF;
 INSERT INTO public.creditos_corporativos_v110(
   empresa_id,origem,origem_id,cliente_id,recebido_por,forma,
   valor,recebido_at,referencia,conciliado_por
 ) VALUES (
   p_empresa_id,p_origem,p_origem_id,v_cliente_id,v_recebedor,v_forma,
   v_valor,v_data,btrim(p_referencia),v_uid
 ) RETURNING id INTO v_id;
 INSERT INTO public.auditoria_eventos(empresa_id,usuario_id,entidade,entidade_id,acao,dados)
 VALUES(p_empresa_id,v_uid,'RECEBIMENTO',p_origem||'-'||p_origem_id::text,
   'CREDITO_CORPORATIVO_CONCILIADO_V110',jsonb_build_object(
   'confirmacao_id',v_id,'forma',v_forma,'valor',v_valor,
   'referencia',btrim(p_referencia),'sem_repasse_entregador',true));
 RETURN jsonb_build_object('conciliado',true,'ja_conciliado',false,
   'confirmacao_id',v_id,'origem',p_origem,'origem_id',p_origem_id);
END;
$confirm$;
REVOKE ALL ON FUNCTION public.conciliar_credito_direto_v110(uuid,text,bigint,text)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.conciliar_credito_direto_v110(uuid,text,bigint,text)
 TO authenticated;

-- Se mais tarde o crédito entrar num protocolo de prestação, preservar a
-- confirmação anterior (sem lançar nova conciliação ou cobrar outro repasse).
CREATE OR REPLACE FUNCTION app_private.herdar_conciliacao_v110()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $inherit$
DECLARE v_cc public.creditos_corporativos_v110%rowtype;
BEGIN
 IF NEW.destino='EMPRESA' AND NEW.forma IN ('PIX','CARTAO') THEN
  SELECT cc.* INTO v_cc FROM public.creditos_corporativos_v110 cc
   WHERE cc.empresa_id=NEW.empresa_id AND cc.origem=NEW.origem
     AND cc.origem_id=NEW.origem_id;
  IF v_cc.id IS NOT NULL THEN
   IF round(v_cc.valor,2)<>round(NEW.valor,2) THEN
    RAISE EXCEPTION 'O crédito foi alterado após conciliação. Solicite auditoria financeira.';
   END IF;
   NEW.conciliado_em:=v_cc.conciliado_at;
   NEW.conciliado_por:=v_cc.conciliado_por;
   NEW.referencia_conciliacao:=v_cc.referencia;
  END IF;
 END IF;
 RETURN NEW;
END;
$inherit$;
DROP TRIGGER IF EXISTS trg_prestacao_herdar_conciliacao_v110
 ON public.prestacao_itens_v109;
CREATE TRIGGER trg_prestacao_herdar_conciliacao_v110
 BEFORE INSERT ON public.prestacao_itens_v109 FOR EACH ROW
 EXECUTE FUNCTION app_private.herdar_conciliacao_v110();
