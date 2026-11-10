-- CESTAS APP V105.5.5
-- APLICACAO MANUAL SOMENTE EM BASE DE HOMOLOGACAO ISOLADA.
-- NAO EXECUTAR NA BASE COMPARTILHADA COM A PRODUCAO.
-- Corrige guard de rotas para conferir somente a carga a ser finalizada.
-- Preserva as permissoes, volumes, movimento de estoque e todas as demais validacoes.
-- SQL nao executado automaticamente pela branch Preview.
--
-- Antes de executar, configurar na MESMA transacao da migracao:
--   SET LOCAL cestas.v10555_ambiente_isolado = 'CONFIRMADO';
-- Essa variavel NAO deve ser definida no banco compartilhado.
--
-- Exemplo para uso consciente em base ISOLADA:
--   BEGIN;
--   SET LOCAL cestas.v10555_ambiente_isolado = 'CONFIRMADO';
--   [executar SOMENTE o bloco DO abaixo]
--   COMMIT;
--
DO $cestas_v10555$
DECLARE
  v_obj regprocedure := to_regprocedure('app_private.finalizar_carga_estoque_impl_v82(uuid,bigint,jsonb)');
  v_def_original text;
  v_def_normalizada text;
  v_antigo text :=
      'and r.entregador_id = v_carga.entregador_id' || E'\n' ||
      '      and r.status in (''PLANEJADA'', ''EM_ROTA'')';
  v_novo text :=
      'and r.entregador_id = v_carga.entregador_id' || E'\n' ||
      '      and r.carga_id = p_carga_id' || E'\n' ||
      '      and r.status in (''PLANEJADA'', ''EM_ROTA'')';
  v_matches integer;
BEGIN
  IF current_setting('cestas.v10555_ambiente_isolado', true) IS DISTINCT FROM 'CONFIRMADO' THEN
    RAISE EXCEPTION 'V105.5.5 BLOQUEADA: esta SQL so pode ser usada com autorizacao explicita em banco ISOLADO de homologacao.';
  END IF;
  IF v_obj IS NULL THEN
    RAISE EXCEPTION 'V105.5.5 BLOQUEADA: funcao original de fechamento nao encontrada.';
  END IF;
  SELECT pg_get_functiondef(v_obj) INTO v_def_original;
  IF md5(v_def_original) <> '89eb6658217b2316b85fb02ea63ac66e' THEN
    RAISE EXCEPTION 'V105.5.5 BLOQUEADA: a funcao SQL mudou. Nao sobrescrever uma versao diferente.';
  END IF;
  IF position('SECURITY DEFINER' in v_def_original) = 0 OR position('SET search_path TO' in v_def_original) = 0 THEN
    RAISE EXCEPTION 'V105.5.5 BLOQUEADA: protecoes de seguranca ausentes ou divergentes.';
  END IF;
  v_def_normalizada := replace(v_def_original, E'\r\n', E'\n');
  v_matches := (length(v_def_normalizada) - length(replace(v_def_normalizada, v_antigo, ''))) / length(v_antigo);
  IF v_matches <> 1 THEN
    RAISE EXCEPTION 'V105.5.5 BLOQUEADA: filtro de rota nao encontrado exatamente uma vez, ocorrencias %.', v_matches;
  END IF;
  EXECUTE replace(v_def_normalizada, v_antigo, v_novo);
  IF position(v_novo IN replace(pg_get_functiondef(v_obj), E'\r\n', E'\n')) = 0 THEN
    RAISE EXCEPTION 'V105.5.5 BLOQUEADA: validacao posterior da regra falhou.';
  END IF;
  RAISE NOTICE 'V105.5.5 aplicado a funcao %, sem alterar dados existentes.', v_obj;
END
$cestas_v10555$;

-- Consulta de auditoria SOMENTE LEITURA apos a aplicacao:
-- SELECT position('and r.carga_id = p_carga_id'
--   IN pg_get_functiondef('app_private.finalizar_carga_estoque_impl_v82(uuid,bigint,jsonb)'::regprocedure)) > 0
--   AS rota_filtrada_pela_carga;
