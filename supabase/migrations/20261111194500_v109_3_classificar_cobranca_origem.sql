-- V109.3: classificar a COBRANÇA na origem, não cada parcela que ela abateu.
-- Uma cobrança de R$ 400 rateada entre 4 parcelas representa UM recebimento.
CREATE OR REPLACE FUNCTION public.classificar_recebimento_origem_v109(
 p_empresa_id uuid,p_origem text,p_id bigint,p_destino text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $cl$
DECLARE v_uid uuid:=auth.uid();v_linhas int;
BEGIN
 IF v_uid IS NULL OR NOT app_private.is_empresa_member(p_empresa_id)
    OR NOT app_private.has_permission(p_empresa_id,'FINANCEIRO_AUDITAR') THEN
   RAISE EXCEPTION 'A classificação exige acesso ao Financeiro do CD.';
 END IF;
 IF p_destino NOT IN ('EMPRESA','ENTREGADOR') OR p_id IS NULL OR p_id<1 THEN
   RAISE EXCEPTION 'Titular ou registro inválido.';
 END IF;
 IF p_origem='VENDA' THEN
  UPDATE public.venda_recebimentos
   SET destino_recebimento_v108=p_destino
   WHERE empresa_id=p_empresa_id AND id=p_id
     AND forma_pagamento IN ('PIX','CARTAO')
     AND destino_recebimento_v108 IS NULL;
 ELSIF p_origem='COBRANCA' THEN
  UPDATE public.recebimentos_cliente
   SET destino_recebimento_v108=p_destino
   WHERE empresa_id=p_empresa_id AND id=p_id
     AND forma_pagamento IN ('PIX','CARTAO')
     AND destino_recebimento_v108 IS NULL;
 ELSIF p_origem='PARCELA' THEN
  UPDATE public.pagamentos
   SET destino_recebimento_v108=p_destino
   WHERE empresa_id=p_empresa_id AND id=p_id
     AND recebimento_id IS NULL
     AND forma_pagamento IN ('PIX','CARTAO')
     AND destino_recebimento_v108 IS NULL;
 ELSE
  RAISE EXCEPTION 'Origem financeira inválida.';
 END IF;
 GET DIAGNOSTICS v_linhas=ROW_COUNT;
 IF v_linhas<>1 THEN
  RAISE EXCEPTION 'Recebimento não encontrado, já classificado ou não permitido.';
 END IF;
 INSERT INTO public.auditoria_eventos(empresa_id,usuario_id,entidade,entidade_id,acao,dados)
 VALUES(p_empresa_id,v_uid,'RECEBIMENTO',p_origem||'-'||p_id::text,
  'TITULAR_ORIGEM_FINANCEIRA_V109',jsonb_build_object(
   'origem',p_origem,'id',p_id,'destinatario',p_destino));
 RETURN jsonb_build_object('classificado',true,'origem',p_origem,
   'id',p_id,'destinatario',p_destino);
END;
$cl$;
REVOKE ALL ON FUNCTION public.classificar_recebimento_origem_v109(
 uuid,text,bigint,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.classificar_recebimento_origem_v109(
 uuid,text,bigint,text) TO authenticated;
