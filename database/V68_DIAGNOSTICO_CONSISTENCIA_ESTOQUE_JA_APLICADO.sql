-- CESTAS APP - V68
-- DIAGNOSTICO DE CONSISTENCIA DO ESTOQUE
-- Aplicado remotamente no Supabase em 02/11/2026.
-- Somente leitura: não altera saldos, cargas, volumes, entregas, retornos ou avarias.

create or replace function app_private.diagnostico_consistencia_estoque_impl(
  p_empresa_id uuid,
  p_limite integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_modo text := 'QUANTIDADE';
  v_limite integer := greatest(10, least(coalesce(p_limite, 100), 250));
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Sessão inválida.';
  end if;

  if not app_private.is_empresa_member(p_empresa_id) then
    raise exception 'Usuário não pertence à empresa.';
  end if;

  if not (
    app_private.has_permission(p_empresa_id, 'ESTOQUE_VISUALIZAR')
    or app_private.has_permission(p_empresa_id, 'ESTOQUE_MOVIMENTAR')
    or app_private.has_permission(p_empresa_id, 'ESTOQUE_AJUSTAR')
    or app_private.has_permission(p_empresa_id, 'CARGA_VISUALIZAR')
    or app_private.has_permission(p_empresa_id, 'CARGA_VISUALIZAR_TODAS')
    or app_private.has_permission(p_empresa_id, 'CARGA_GERENCIAR')
  ) then
    raise exception 'Usuário sem permissão para diagnosticar estoque.';
  end if;

  select coalesce(ec.modo_controle_carga, 'QUANTIDADE')
    into v_modo
  from public.empresa_configuracoes ec
  where ec.empresa_id = p_empresa_id;

  with entregas_por_item as (
    select
      ei.empresa_id,
      ei.carga_item_id,
      coalesce(sum(ei.quantidade), 0)::integer as qtd_entrega
    from public.entrega_itens ei
    join public.entregas e
      on e.id = ei.entrega_id
     and e.empresa_id = ei.empresa_id
    where ei.empresa_id = p_empresa_id
      and e.status = 'CONCLUIDA'
    group by ei.empresa_id, ei.carga_item_id
  ),
  volume_stats as (
    select
      cv.empresa_id,
      cv.carga_id,
      cv.tipo_cesta_id,
      count(*)::integer as total_volumes,
      count(*) filter (where cv.status = 'EM_CARGA')::integer as em_carga,
      count(*) filter (where cv.status = 'ENTREGUE')::integer as entregues,
      count(*) filter (where cv.status = 'RETORNADO')::integer as retornados,
      count(*) filter (where cv.status = 'AVARIADO')::integer as avariados,
      count(*) filter (where cv.status = 'CANCELADO')::integer as cancelados
    from public.cesta_volumes cv
    where cv.empresa_id = p_empresa_id
    group by cv.empresa_id, cv.carga_id, cv.tipo_cesta_id
  ),
  itens as (
    select
      c.id as carga_id,
      c.codigo as carga_codigo,
      c.status as carga_status,
      c.created_at as carga_created_at,
      ci.id as carga_item_id,
      ci.tipo_cesta_id,
      coalesce(tc.nome, 'Tipo de cesta') as tipo_nome,
      coalesce(ci.quantidade_carregada, 0) as carregada,
      coalesce(ci.quantidade_entregue, 0) as entregue,
      coalesce(ci.quantidade_retornada, 0) as retornada,
      coalesce(ci.quantidade_avariada, 0) as avariada,
      coalesce(ci.quantidade_carregada, 0)
        - coalesce(ci.quantidade_entregue, 0)
        - coalesce(ci.quantidade_retornada, 0)
        - coalesce(ci.quantidade_avariada, 0) as saldo_item,
      coalesce(epi.qtd_entrega, 0) as entrega_itens,
      coalesce(vs.total_volumes, 0) as total_volumes,
      coalesce(vs.em_carga, 0) as vol_em_carga,
      coalesce(vs.entregues, 0) as vol_entregue,
      coalesce(vs.retornados, 0) as vol_retornado,
      coalesce(vs.avariados, 0) as vol_avariado,
      coalesce(vs.cancelados, 0) as vol_cancelado
    from public.carga_itens ci
    join public.cargas c
      on c.id = ci.carga_id
     and c.empresa_id = ci.empresa_id
    left join public.tipos_cesta tc
      on tc.id = ci.tipo_cesta_id
     and tc.empresa_id = ci.empresa_id
    left join entregas_por_item epi
      on epi.empresa_id = ci.empresa_id
     and epi.carga_item_id = ci.id
    left join volume_stats vs
      on vs.empresa_id = ci.empresa_id
     and vs.carga_id = ci.carga_id
     and vs.tipo_cesta_id = ci.tipo_cesta_id
    where ci.empresa_id = p_empresa_id
  ),
  achados_raw as (
    select
      'CRITICO'::text as severidade,
      'SALDO_NEGATIVO'::text as codigo,
      'Saldo de carga negativo'::text as titulo,
      format('Carga %s • %s: carregado %s, entregue %s, retornado %s, avariado %s.', carga_codigo, tipo_nome, carregada, entregue, retornada, avariada) as detalhe,
      carga_id,
      carga_codigo,
      tipo_cesta_id,
      carga_created_at as referencia_at
    from itens
    where saldo_item < 0

    union all

    select
      'CRITICO','CARGA_ENCERRADA_COM_SALDO','Carga encerrada com saldo residual',
      format('Carga %s está %s, mas ainda possui %s cesta(s) em posse no item %s.', carga_codigo, carga_status, saldo_item, tipo_nome),
      carga_id,carga_codigo,tipo_cesta_id,carga_created_at
    from itens
    where carga_status in ('FINALIZADA','CANCELADA') and saldo_item <> 0

    union all

    select
      'CRITICO','ENTREGA_DIVERGENTE','Entrega não reconcilia com a carga',
      format('Carga %s • %s: carga_itens informa %s entregue(s), enquanto entrega_itens soma %s.', carga_codigo, tipo_nome, entregue, entrega_itens),
      carga_id,carga_codigo,tipo_cesta_id,carga_created_at
    from itens
    where entregue <> entrega_itens

    union all

    select
      'CRITICO','VOLUME_ATIVO_INCOMPLETO','Carga ativa sem cobertura total de volumes',
      format('Carga %s • %s: %s cesta(s) carregada(s), mas %s volume(s) vinculado(s).', carga_codigo, tipo_nome, carregada, total_volumes),
      carga_id,carga_codigo,tipo_cesta_id,carga_created_at
    from itens
    where v_modo = 'VOLUME'
      and carga_status in ('ABERTA','EM_ROTA')
      and total_volumes <> carregada

    union all

    select
      'CRITICO','VOLUME_EM_CARGA_DIVERGENTE','Volumes em posse não conferem',
      format('Carga %s • %s: saldo numérico %s e volumes EM_CARGA %s.', carga_codigo, tipo_nome, saldo_item, vol_em_carga),
      carga_id,carga_codigo,tipo_cesta_id,carga_created_at
    from itens
    where total_volumes = carregada
      and carregada > 0
      and carga_status <> 'CANCELADA'
      and vol_em_carga <> saldo_item

    union all

    select
      'CRITICO','VOLUME_ENTREGUE_DIVERGENTE','Volumes entregues não conferem',
      format('Carga %s • %s: quantidade entregue %s e volumes ENTREGUE %s.', carga_codigo, tipo_nome, entregue, vol_entregue),
      carga_id,carga_codigo,tipo_cesta_id,carga_created_at
    from itens
    where total_volumes = carregada
      and carregada > 0
      and vol_entregue <> entregue

    union all

    select
      'CRITICO','VOLUME_RETORNO_DIVERGENTE','Volumes retornados não conferem',
      format('Carga %s • %s: quantidade retornada %s e volumes RETORNADO %s.', carga_codigo, tipo_nome, retornada, vol_retornado),
      carga_id,carga_codigo,tipo_cesta_id,carga_created_at
    from itens
    where total_volumes = carregada
      and carregada > 0
      and carga_status <> 'CANCELADA'
      and vol_retornado <> retornada

    union all

    select
      'CRITICO','VOLUME_AVARIA_DIVERGENTE','Volumes avariados não conferem',
      format('Carga %s • %s: quantidade avariada %s e volumes AVARIADO %s.', carga_codigo, tipo_nome, avariada, vol_avariado),
      carga_id,carga_codigo,tipo_cesta_id,carga_created_at
    from itens
    where total_volumes = carregada
      and carregada > 0
      and vol_avariado <> avariada

    union all

    select
      'CRITICO','VOLUME_CANCELADO_DIVERGENTE','Cancelamento físico não confere',
      format('Carga %s • %s: quantidade carregada %s e volumes CANCELADO %s.', carga_codigo, tipo_nome, carregada, vol_cancelado),
      carga_id,carga_codigo,tipo_cesta_id,carga_created_at
    from itens
    where total_volumes = carregada
      and carregada > 0
      and carga_status = 'CANCELADA'
      and vol_cancelado <> carregada

    union all

    select
      'LEGADO','COBERTURA_VOLUME_PARCIAL','Histórico com rastreio individual parcial',
      format('Carga %s • %s: existem %s volume(s) para %s cesta(s) carregada(s). O saldo numérico está fechado, mas o histórico individual é anterior à rastreabilidade completa.', carga_codigo, tipo_nome, total_volumes, carregada),
      carga_id,carga_codigo,tipo_cesta_id,carga_created_at
    from itens
    where carga_status in ('FINALIZADA','CANCELADA')
      and total_volumes > 0
      and total_volumes < carregada

    union all

    select
      'CRITICO','SALDO_CENTRAL_NEGATIVO','Estoque central negativo',
      format('%s possui saldo central %s.', coalesce(tc.nome,'Tipo de cesta'), s.quantidade),
      null::bigint,null::text,s.tipo_cesta_id,s.updated_at
    from public.estoque_central_saldos s
    left join public.tipos_cesta tc
      on tc.id=s.tipo_cesta_id and tc.empresa_id=s.empresa_id
    where s.empresa_id=p_empresa_id and s.quantidade < 0
  ),
  ledger as (
    select
      m.tipo_cesta_id,
      coalesce(sum(case
        when m.tipo_movimento in ('ENTRADA_CENTRAL','AJUSTE_CENTRAL_ENTRADA','RETORNO_CARGA_CENTRAL') then m.quantidade
        when m.tipo_movimento in ('SAIDA_CENTRAL_CARGA','AJUSTE_CENTRAL_SAIDA') then -m.quantidade
        else 0
      end),0)::integer as saldo_ledger
    from public.movimentacoes_estoque m
    where m.empresa_id=p_empresa_id
    group by m.tipo_cesta_id
  ),
  baseline as (
    select
      s.tipo_cesta_id,
      coalesce(tc.codigo,'') as codigo,
      coalesce(tc.nome,'Tipo de cesta') as nome,
      s.quantidade::integer as saldo_atual,
      coalesce(l.saldo_ledger,0)::integer as movimento_liquido_rastreado,
      (s.quantidade-coalesce(l.saldo_ledger,0))::integer as baseline_legado
    from public.estoque_central_saldos s
    left join ledger l on l.tipo_cesta_id=s.tipo_cesta_id
    left join public.tipos_cesta tc on tc.id=s.tipo_cesta_id and tc.empresa_id=s.empresa_id
    where s.empresa_id=p_empresa_id
  ),
  resumo as (
    select
      (select count(*) from public.cargas c where c.empresa_id=p_empresa_id)::integer as cargas_total,
      (select count(*) from public.cargas c where c.empresa_id=p_empresa_id and c.status in ('ABERTA','EM_ROTA'))::integer as cargas_ativas,
      (select count(*) from itens)::integer as itens_carga,
      (select coalesce(sum(s.quantidade),0) from public.estoque_central_saldos s where s.empresa_id=p_empresa_id)::integer as saldo_central,
      (select coalesce(sum(saldo_item),0) from itens where carga_status in ('ABERTA','EM_ROTA'))::integer as saldo_em_cargas,
      (select coalesce(sum(entregue),0) from itens)::integer as entregues,
      (select coalesce(sum(retornada),0) from itens)::integer as retornadas,
      (select coalesce(sum(avariada),0) from itens)::integer as avariadas,
      (select count(*) from achados_raw where severidade='CRITICO')::integer as criticos,
      (select count(*) from achados_raw where severidade='LEGADO')::integer as legados
  )
  select jsonb_build_object(
    'gerado_em', now(),
    'modo_controle', coalesce(v_modo,'QUANTIDADE'),
    'status', case when r.criticos=0 then 'APROVADO' else 'CRITICO' end,
    'resumo', jsonb_build_object(
      'cargas_total',r.cargas_total,
      'cargas_ativas',r.cargas_ativas,
      'itens_carga',r.itens_carga,
      'saldo_central',r.saldo_central,
      'saldo_em_cargas',r.saldo_em_cargas,
      'entregues',r.entregues,
      'retornadas',r.retornadas,
      'avariadas',r.avariadas,
      'criticos',r.criticos,
      'legados',r.legados
    ),
    'baseline', coalesce((select jsonb_agg(jsonb_build_object(
      'tipo_cesta_id',b.tipo_cesta_id,
      'codigo',b.codigo,
      'nome',b.nome,
      'saldo_atual',b.saldo_atual,
      'movimento_liquido_rastreado',b.movimento_liquido_rastreado,
      'baseline_legado',b.baseline_legado
    ) order by b.nome) from baseline b),'[]'::jsonb),
    'achados', coalesce((select jsonb_agg(jsonb_build_object(
      'severidade',a.severidade,
      'codigo',a.codigo,
      'titulo',a.titulo,
      'detalhe',a.detalhe,
      'carga_id',a.carga_id,
      'carga_codigo',a.carga_codigo,
      'tipo_cesta_id',a.tipo_cesta_id,
      'referencia_at',a.referencia_at
    ) order by case a.severidade when 'CRITICO' then 1 else 2 end, a.referencia_at desc nulls last)
      from (
        select *
        from achados_raw
        order by case severidade when 'CRITICO' then 1 else 2 end,
                 referencia_at desc nulls last
        limit v_limite
      ) a),'[]'::jsonb)
  ) into v_result
  from resumo r;

  return v_result;
end;
$function$;

create or replace function public.diagnostico_consistencia_estoque(
  p_empresa_id uuid,
  p_limite integer default 100
)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select app_private.diagnostico_consistencia_estoque_impl(
    p_empresa_id,
    p_limite
  );
$function$;

-- V68 security hardening: only the public wrapper is callable by authenticated users.
revoke all on function app_private.diagnostico_consistencia_estoque_impl(uuid,integer) from public;
revoke all on function app_private.diagnostico_consistencia_estoque_impl(uuid,integer) from anon;
revoke all on function app_private.diagnostico_consistencia_estoque_impl(uuid,integer) from authenticated;

revoke all on function public.diagnostico_consistencia_estoque(uuid,integer) from public;
revoke all on function public.diagnostico_consistencia_estoque(uuid,integer) from anon;
grant execute on function public.diagnostico_consistencia_estoque(uuid,integer) to authenticated;
