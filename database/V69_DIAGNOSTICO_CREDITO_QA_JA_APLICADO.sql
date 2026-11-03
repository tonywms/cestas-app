-- CESTAS APP - V69
-- CERTIFICACAO DE CREDITO / QA OPERACIONAL
-- Read-only diagnostic. Does not mutate financial data.

create schema if not exists app_private;

create or replace function app_private.diagnostico_credito_qa_impl(
  p_empresa_id uuid,
  p_limite integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_limite integer := greatest(10, least(coalesce(p_limite, 100), 250));
  v_alerta integer := 1;
  v_bloqueio integer := 2;
  v_tolerancia integer := 0;
  v_permitir_excecao boolean := true;
  v_validade integer := 7;
  v_hoje date := (now() at time zone 'America/Fortaleza')::date;
  v_limite_atraso date;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Sessão inválida.';
  end if;

  if not app_private.is_empresa_member(p_empresa_id) then
    raise exception 'Usuário não pertence à empresa.';
  end if;

  if not (
    app_private.has_permission(p_empresa_id, 'CREDITO_LIBERAR')
    or app_private.has_permission(p_empresa_id, 'PAGAMENTO_REGISTRAR')
    or app_private.has_permission(p_empresa_id, 'EMPRESA_CONFIGURAR')
  ) then
    raise exception 'Usuário sem permissão para diagnosticar crédito.';
  end if;

  select
    coalesce(max(ec.credito_alerta_qtd_atrasos), 1),
    coalesce(max(ec.credito_bloqueio_qtd_atrasos), 2),
    coalesce(max(ec.credito_dias_tolerancia), 0),
    coalesce(bool_or(ec.credito_permitir_excecao), true),
    coalesce(max(ec.credito_validade_excecao_dias), 7)
  into
    v_alerta,
    v_bloqueio,
    v_tolerancia,
    v_permitir_excecao,
    v_validade
  from public.empresa_configuracoes ec
  where ec.empresa_id = p_empresa_id;

  v_limite_atraso := v_hoje - greatest(v_tolerancia, 0);

  with parcelas_base as (
    select
      p.id,
      p.cliente_id,
      p.numero,
      p.vencimento,
      coalesce(p.valor, 0)::numeric as valor,
      coalesce(p.valor_pago, 0)::numeric as valor_pago,
      p.status,
      greatest(coalesce(p.valor,0)-coalesce(p.valor_pago,0),0)::numeric as saldo
    from public.parcelas p
    where p.empresa_id = p_empresa_id
  ),
  fin as (
    select
      pb.cliente_id,
      count(*) filter (
        where pb.status in ('ABERTA','PARCIAL') and pb.saldo > 0
      )::integer as abertas,
      count(*) filter (
        where pb.status in ('ABERTA','PARCIAL')
          and pb.saldo > 0
          and pb.vencimento < v_limite_atraso
      )::integer as vencidas,
      coalesce(sum(pb.saldo) filter (
        where pb.status in ('ABERTA','PARCIAL')
      ), 0)::numeric as saldo_aberto,
      coalesce(sum(pb.saldo) filter (
        where pb.status in ('ABERTA','PARCIAL')
          and pb.vencimento < v_limite_atraso
      ), 0)::numeric as saldo_vencido
    from parcelas_base pb
    group by pb.cliente_id
  ),
  excecoes as (
    select
      cl.id,
      cl.cliente_id,
      cl.motivo,
      cl.valido_ate,
      cl.status,
      cl.created_at,
      (cl.status='ATIVA' and cl.valido_ate > now()) as valida
    from public.credito_liberacoes cl
    where cl.empresa_id = p_empresa_id
  ),
  excecao_cliente as (
    select
      e.cliente_id,
      count(*) filter (where e.valida)::integer as validas,
      count(*) filter (where e.status='ATIVA' and e.valido_ate <= now())::integer as expiradas_ativas,
      max(e.valido_ate) filter (where e.valida) as valido_ate_max
    from excecoes e
    group by e.cliente_id
  ),
  clientes_credito as (
    select
      c.id as cliente_id,
      c.codigo,
      c.nome,
      coalesce(f.abertas,0) as abertas,
      coalesce(f.vencidas,0) as vencidas,
      coalesce(f.saldo_aberto,0)::numeric as saldo_aberto,
      coalesce(f.saldo_vencido,0)::numeric as saldo_vencido,
      coalesce(ec.validas,0) as excecoes_validas,
      ec.valido_ate_max,
      case
        when coalesce(f.vencidas,0) >= v_bloqueio
          and v_permitir_excecao
          and coalesce(ec.validas,0) > 0
          then 'LIBERADO_EXCECAO'
        when coalesce(f.vencidas,0) >= v_bloqueio
          then 'BLOQUEADO'
        when coalesce(f.vencidas,0) >= v_alerta
          then 'ALERTA'
        else 'LIBERADO'
      end as status_efetivo,
      case
        when coalesce(f.vencidas,0) >= v_bloqueio then 'BLOQUEADO'
        when coalesce(f.vencidas,0) >= v_alerta then 'ALERTA'
        else 'LIBERADO'
      end as status_base
    from public.clientes c
    left join fin f on f.cliente_id=c.id
    left join excecao_cliente ec on ec.cliente_id=c.id
    where c.empresa_id=p_empresa_id
      and c.ativo=true
  ),
  achados_raw as (
    select
      'CRITICO'::text severidade,
      'POLITICA_ALERTA_INVALIDA'::text codigo,
      'Limite de alerta inválido'::text titulo,
      format('Alerta configurado em %s. O valor deve ficar entre 1 e 100.', v_alerta) detalhe,
      null::bigint cliente_id,
      null::text cliente_codigo,
      null::text cliente_nome,
      null::timestamptz referencia_at
    where v_alerta < 1 or v_alerta > 100

    union all

    select 'CRITICO','POLITICA_BLOQUEIO_INVALIDA','Limite de bloqueio inválido',
      format('Bloqueio configurado em %s e alerta em %s. O bloqueio precisa ser maior que o alerta e no máximo 100.', v_bloqueio, v_alerta),
      null,null,null,null
    where v_bloqueio <= v_alerta or v_bloqueio > 100

    union all

    select 'CRITICO','POLITICA_TOLERANCIA_INVALIDA','Tolerância inválida',
      format('Tolerância configurada em %s dia(s). O valor deve ficar entre 0 e 90.', v_tolerancia),
      null,null,null,null
    where v_tolerancia < 0 or v_tolerancia > 90

    union all

    select 'CRITICO','POLITICA_VALIDADE_INVALIDA','Validade de exceção inválida',
      format('Validade configurada em %s dia(s). O valor deve ficar entre 1 e 365.', v_validade),
      null,null,null,null
    where v_validade < 1 or v_validade > 365

    union all

    select 'CRITICO','PARCELA_VALOR_PAGO_INVALIDO','Parcela com pagamento incompatível',
      format('Parcela nº %s possui valor %s e valor pago %s.', pb.numero, pb.valor, pb.valor_pago),
      c.id,c.codigo,c.nome,null
    from parcelas_base pb
    join public.clientes c on c.id=pb.cliente_id and c.empresa_id=p_empresa_id
    where pb.valor_pago < 0 or pb.valor_pago > pb.valor

    union all

    select 'CRITICO','PARCELA_PAGA_COM_SALDO','Parcela paga ainda possui saldo',
      format('Parcela nº %s está PAGA, mas ainda possui saldo calculado de R$ %s.', pb.numero, pb.saldo),
      c.id,c.codigo,c.nome,null
    from parcelas_base pb
    join public.clientes c on c.id=pb.cliente_id and c.empresa_id=p_empresa_id
    where pb.status='PAGA' and pb.saldo > 0.009

    union all

    select 'CRITICO','PARCELA_ABERTA_SEM_SALDO','Parcela aberta sem saldo',
      format('Parcela nº %s está %s, mas o saldo calculado é zero.', pb.numero, pb.status),
      c.id,c.codigo,c.nome,null
    from parcelas_base pb
    join public.clientes c on c.id=pb.cliente_id and c.empresa_id=p_empresa_id
    where pb.status in ('ABERTA','PARCIAL') and pb.saldo <= 0.009

    union all

    select 'CRITICO','EXCECOES_ATIVAS_DUPLICADAS','Mais de uma exceção válida para o mesmo cliente',
      format('%s possui %s liberações excepcionais válidas simultaneamente.', cc.nome, cc.excecoes_validas),
      cc.cliente_id,cc.codigo,cc.nome,cc.valido_ate_max
    from clientes_credito cc
    where cc.excecoes_validas > 1

    union all

    select 'ATENCAO','EXCECAO_ATIVA_EXPIRADA','Liberação marcada ativa já expirou',
      format('%s possui liberação com status ATIVA vencida em %s. O motor ignora a exceção, mas o registro pode ser revogado para manter o histórico limpo.', c.nome, to_char(e.valido_ate at time zone 'America/Fortaleza','DD/MM/YYYY HH24:MI')),
      c.id,c.codigo,c.nome,e.valido_ate
    from excecoes e
    join public.clientes c on c.id=e.cliente_id and c.empresa_id=p_empresa_id
    where e.status='ATIVA' and e.valido_ate <= now()

    union all

    select 'ATENCAO','EXCECAO_COM_POLITICA_DESATIVADA','Exceção ativa com política desativada',
      format('%s possui exceção válida, porém a empresa está com liberações excepcionais desativadas. A exceção não produz efeito.', cc.nome),
      cc.cliente_id,cc.codigo,cc.nome,cc.valido_ate_max
    from clientes_credito cc
    where not v_permitir_excecao and cc.excecoes_validas > 0

    union all

    select 'INFO','EXCECAO_SEM_BLOQUEIO_ATUAL','Exceção válida sem bloqueio atual',
      format('%s possui exceção válida até %s, mas hoje está %s pela regra base. A exceção permanece registrada, porém não altera o status atual.', cc.nome, to_char(cc.valido_ate_max at time zone 'America/Fortaleza','DD/MM/YYYY HH24:MI'), cc.status_base),
      cc.cliente_id,cc.codigo,cc.nome,cc.valido_ate_max
    from clientes_credito cc
    where cc.excecoes_validas > 0 and cc.status_base <> 'BLOQUEADO'
  ),
  resumo as (
    select
      (select count(*) from public.clientes c where c.empresa_id=p_empresa_id and c.ativo=true)::integer clientes_ativos,
      (select count(*) from parcelas_base pb where pb.status in ('ABERTA','PARCIAL') and pb.saldo>0)::integer parcelas_abertas,
      (select count(*) from parcelas_base pb where pb.status in ('ABERTA','PARCIAL') and pb.saldo>0 and pb.vencimento<v_limite_atraso)::integer parcelas_vencidas,
      (select coalesce(sum(pb.saldo),0) from parcelas_base pb where pb.status in ('ABERTA','PARCIAL'))::numeric saldo_aberto,
      (select coalesce(sum(pb.saldo),0) from parcelas_base pb where pb.status in ('ABERTA','PARCIAL') and pb.vencimento<v_limite_atraso)::numeric saldo_vencido,
      (select count(*) from excecoes e where e.valida)::integer excecoes_validas,
      (select count(*) from excecoes e where e.status='ATIVA' and e.valido_ate<=now())::integer excecoes_expiradas_ativas,
      (select count(*) from clientes_credito cc where cc.status_efetivo='LIBERADO')::integer liberados,
      (select count(*) from clientes_credito cc where cc.status_efetivo='ALERTA')::integer alertas,
      (select count(*) from clientes_credito cc where cc.status_efetivo='BLOQUEADO')::integer bloqueados,
      (select count(*) from clientes_credito cc where cc.status_efetivo='LIBERADO_EXCECAO')::integer liberados_excecao,
      (select count(*) from achados_raw ar where ar.severidade='CRITICO')::integer criticos,
      (select count(*) from achados_raw ar where ar.severidade='ATENCAO')::integer atencoes,
      (select count(*) from achados_raw ar where ar.severidade='INFO')::integer informativos
  )
  select jsonb_build_object(
    'gerado_em', now(),
    'status', case when r.criticos=0 then 'APROVADO' else 'CRITICO' end,
    'politica', jsonb_build_object(
      'alerta_qtd_atrasos',v_alerta,
      'bloqueio_qtd_atrasos',v_bloqueio,
      'dias_tolerancia',v_tolerancia,
      'permitir_excecao',v_permitir_excecao,
      'validade_excecao_dias',v_validade,
      'hoje',v_hoje,
      'limite_atraso',v_limite_atraso
    ),
    'resumo', jsonb_build_object(
      'clientes_ativos',r.clientes_ativos,
      'parcelas_abertas',r.parcelas_abertas,
      'parcelas_vencidas',r.parcelas_vencidas,
      'saldo_aberto',r.saldo_aberto,
      'saldo_vencido',r.saldo_vencido,
      'excecoes_validas',r.excecoes_validas,
      'excecoes_expiradas_ativas',r.excecoes_expiradas_ativas,
      'liberados',r.liberados,
      'alertas',r.alertas,
      'bloqueados',r.bloqueados,
      'liberados_excecao',r.liberados_excecao,
      'criticos',r.criticos,
      'atencoes',r.atencoes,
      'informativos',r.informativos
    ),
    'achados', coalesce((
      select jsonb_agg(jsonb_build_object(
        'severidade',x.severidade,
        'codigo',x.codigo,
        'titulo',x.titulo,
        'detalhe',x.detalhe,
        'cliente_id',x.cliente_id,
        'cliente_codigo',x.cliente_codigo,
        'cliente_nome',x.cliente_nome,
        'referencia_at',x.referencia_at
      ) order by case x.severidade when 'CRITICO' then 1 when 'ATENCAO' then 2 else 3 end, x.referencia_at desc nulls last)
      from (
        select * from achados_raw
        order by case severidade when 'CRITICO' then 1 when 'ATENCAO' then 2 else 3 end, referencia_at desc nulls last
        limit v_limite
      ) x
    ), '[]'::jsonb)
  ) into v_result
  from resumo r;

  return v_result;
end;
$$;

revoke all on function app_private.diagnostico_credito_qa_impl(uuid, integer) from public, anon, authenticated;

create or replace function public.diagnostico_credito_qa(
  p_empresa_id uuid,
  p_limite integer default 100
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.diagnostico_credito_qa_impl(p_empresa_id,p_limite);
$$;

revoke all on function public.diagnostico_credito_qa(uuid, integer) from public, anon;
grant execute on function public.diagnostico_credito_qa(uuid, integer) to authenticated, service_role;
