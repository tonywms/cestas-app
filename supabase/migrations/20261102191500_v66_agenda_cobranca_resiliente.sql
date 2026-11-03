-- CESTAS APP - V66
-- AGENDA DE COBRANCA RESILIENTE / ENCERRAMENTO SEM SALDO
-- Data: 02/11/2026
--
-- Objetivos:
-- 1) impedir nova parada de cobranca para cliente sem saldo em aberto;
-- 2) permitir concluir com seguranca uma parada de cobranca cujo saldo foi quitado
--    por outro canal antes da visita, sem criar pagamento ficticio;
-- 3) preservar tenant, ownership, permissoes, auditoria e idempotencia.

create or replace function app_private.mobile_concluir_cobranca_sem_saldo_impl(
  p_empresa_id uuid,
  p_rota_cliente_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_parada public.rota_clientes%rowtype;
  v_rota public.rotas%rowtype;
  v_tem_saldo boolean := false;
begin
  if v_uid is null then
    raise exception 'Sessão inválida.';
  end if;

  if not app_private.is_empresa_member(p_empresa_id) then
    raise exception 'Usuário não pertence à empresa.';
  end if;

  if not app_private.has_permission(p_empresa_id, 'ROTA_MOBILE_GERENCIAR_PROPRIA') then
    raise exception 'Usuário sem permissão para gerenciar a própria rota.';
  end if;

  if not app_private.can_register_mobile_payment(p_empresa_id) then
    raise exception 'Usuário sem permissão para registrar recebimentos.';
  end if;

  select rc.*
    into v_parada
  from public.rota_clientes rc
  where rc.id = p_rota_cliente_id
    and rc.empresa_id = p_empresa_id
    and coalesce(rc.observacao, '') like '[COBRANCA]%'
  for update;

  if v_parada.id is null then
    raise exception 'Cobrança da rota não encontrada.';
  end if;

  select r.*
    into v_rota
  from public.rotas r
  where r.id = v_parada.rota_id
    and r.empresa_id = p_empresa_id
    and r.entregador_id = v_uid
  for update;

  if v_rota.id is null then
    raise exception 'Esta cobrança não pertence à sua rota.';
  end if;

  if v_parada.status = 'ENTREGUE' then
    return jsonb_build_object(
      'rota_id', v_rota.id,
      'rota_cliente_id', v_parada.id,
      'cliente_id', v_parada.cliente_id,
      'status', 'ENTREGUE',
      'ja_concluida', true,
      'pagamento_criado', false
    );
  end if;

  if v_parada.status not in ('PENDENTE', 'EM_ATENDIMENTO') then
    raise exception 'Esta parada de cobrança não está disponível para conclusão.';
  end if;

  if v_rota.status not in ('PLANEJADA', 'EM_ROTA') then
    raise exception 'A rota desta cobrança não está mais ativa.';
  end if;

  select exists(
    select 1
    from public.parcelas p
    where p.empresa_id = p_empresa_id
      and p.cliente_id = v_parada.cliente_id
      and p.status in ('ABERTA', 'PARCIAL')
      and (p.valor - coalesce(p.valor_pago, 0)) > 0.005
  ) into v_tem_saldo;

  if v_tem_saldo then
    raise exception 'Cliente ainda possui saldo em aberto. Registre o recebimento antes de concluir a cobrança.';
  end if;

  update public.rota_clientes
     set status = 'ENTREGUE',
         atendido_at = now(),
         updated_at = now(),
         observacao = concat(
           coalesce(observacao, '[COBRANCA]'),
           ' | Cobrança encerrada sem recebimento: saldo já quitado em ',
           to_char(now() at time zone 'America/Fortaleza', 'DD/MM/YYYY HH24:MI')
         )
   where id = v_parada.id
     and empresa_id = p_empresa_id;

  insert into public.auditoria_eventos(
    empresa_id,
    usuario_id,
    entidade,
    entidade_id,
    acao,
    dados
  ) values (
    p_empresa_id,
    v_uid,
    'ROTA_CLIENTE',
    v_parada.id::text,
    'COBRANCA_ROTA_CONCLUIDA_SEM_SALDO',
    jsonb_build_object(
      'rota_id', v_rota.id,
      'cliente_id', v_parada.cliente_id,
      'motivo', 'SALDO_JA_QUITADO',
      'pagamento_criado', false,
      'movimento_financeiro_criado', false,
      'movimento_estoque_criado', false
    )
  );

  return jsonb_build_object(
    'rota_id', v_rota.id,
    'rota_cliente_id', v_parada.id,
    'cliente_id', v_parada.cliente_id,
    'status', 'ENTREGUE',
    'ja_concluida', false,
    'pagamento_criado', false
  );
end;
$function$;

create or replace function public.mobile_concluir_cobranca_sem_saldo(
  p_empresa_id uuid,
  p_rota_cliente_id bigint
)
returns jsonb
language sql
set search_path = ''
as $function$
  select app_private.mobile_concluir_cobranca_sem_saldo_impl(
    p_empresa_id,
    p_rota_cliente_id
  );
$function$;

revoke all on function public.mobile_concluir_cobranca_sem_saldo(uuid, bigint) from public;
revoke all on function public.mobile_concluir_cobranca_sem_saldo(uuid, bigint) from anon;
grant execute on function public.mobile_concluir_cobranca_sem_saldo(uuid, bigint) to authenticated;

-- Hardening da inclusao de cobranca: a UI ja lista apenas clientes com saldo,
-- mas a RPC tambem valida a regra para impedir chamada direta inconsistente.
create or replace function public.mobile_adicionar_cobranca_rota_propria(
  p_empresa_id uuid,
  p_cliente_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_rota public.rotas%rowtype;
  v_cliente public.clientes%rowtype;
  v_existente public.rota_clientes%rowtype;
  v_rota_cliente_id bigint;
  v_sequencia integer;
  v_codigo text;
  v_tem_saldo boolean := false;
begin
  if v_uid is null then
    raise exception 'Sessão inválida.';
  end if;

  if not app_private.is_empresa_member(p_empresa_id) then
    raise exception 'Usuário não pertence à empresa.';
  end if;

  if not app_private.has_permission(p_empresa_id, 'ROTA_MOBILE_GERENCIAR_PROPRIA') then
    raise exception 'Usuário sem permissão para gerenciar a própria rota.';
  end if;

  if not app_private.can_register_mobile_payment(p_empresa_id) then
    raise exception 'Usuário sem permissão para registrar recebimentos.';
  end if;

  select c.*
    into v_cliente
  from public.clientes c
  where c.empresa_id = p_empresa_id
    and c.id = p_cliente_id
    and c.ativo = true;

  if v_cliente.id is null then
    raise exception 'Cliente inválido ou inativo.';
  end if;

  select exists(
    select 1
    from public.parcelas p
    where p.empresa_id = p_empresa_id
      and p.cliente_id = p_cliente_id
      and p.status in ('ABERTA', 'PARCIAL')
      and (p.valor - coalesce(p.valor_pago, 0)) > 0.005
  ) into v_tem_saldo;

  if not v_tem_saldo then
    raise exception 'Cliente não possui saldo em aberto para cobrança.';
  end if;

  select r.*
    into v_rota
  from public.rotas r
  where r.empresa_id = p_empresa_id
    and r.entregador_id = v_uid
    and r.status in ('PLANEJADA', 'EM_ROTA')
  order by r.created_at
  limit 1
  for update;

  if v_rota.id is null then
    v_codigo := 'RTM-' ||
      to_char(now() at time zone 'America/Fortaleza', 'YYYYMMDD') ||
      '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

    insert into public.rotas(
      empresa_id,
      codigo,
      entregador_id,
      data_rota,
      status,
      observacao,
      iniciada_at,
      origem,
      carga_id,
      criada_por
    ) values (
      p_empresa_id,
      v_codigo,
      v_uid,
      (now() at time zone 'America/Fortaleza')::date,
      'EM_ROTA',
      'Rota iniciada pela agenda de cobranças do mobile.',
      now(),
      'MOBILE',
      null,
      v_uid
    )
    returning * into v_rota;
  end if;

  select rc.*
    into v_existente
  from public.rota_clientes rc
  where rc.empresa_id = p_empresa_id
    and rc.rota_id = v_rota.id
    and rc.cliente_id = p_cliente_id
    and rc.status in ('PENDENTE', 'EM_ATENDIMENTO')
  order by rc.sequencia
  limit 1;

  if v_existente.id is not null then
    if coalesce(v_existente.observacao, '') like '[COBRANCA]%' then
      return jsonb_build_object(
        'rota_id', v_rota.id,
        'rota_cliente_id', v_existente.id,
        'sequencia', v_existente.sequencia,
        'ja_existia', true,
        'codigo', v_rota.codigo
      );
    end if;

    raise exception 'Este cliente já possui outro atendimento pendente nesta rota.';
  end if;

  select coalesce(max(rc.sequencia), 0) + 1
    into v_sequencia
  from public.rota_clientes rc
  where rc.empresa_id = p_empresa_id
    and rc.rota_id = v_rota.id;

  insert into public.rota_clientes(
    empresa_id,
    rota_id,
    cliente_id,
    sequencia,
    status,
    observacao,
    endereco_logradouro,
    endereco_numero,
    endereco_complemento,
    endereco_bairro,
    endereco_cidade,
    endereco_uf,
    endereco_cep
  ) values (
    p_empresa_id,
    v_rota.id,
    v_cliente.id,
    v_sequencia,
    'PENDENTE',
    '[COBRANCA] Visita sugerida pela carteira financeira.',
    v_cliente.logradouro,
    v_cliente.numero,
    v_cliente.complemento,
    v_cliente.bairro,
    v_cliente.cidade,
    v_cliente.uf,
    v_cliente.cep
  )
  returning id into v_rota_cliente_id;

  update public.rotas
  set
    status = 'EM_ROTA',
    iniciada_at = coalesce(iniciada_at, now()),
    updated_at = now()
  where id = v_rota.id
    and empresa_id = p_empresa_id;

  insert into public.auditoria_eventos(
    empresa_id,
    usuario_id,
    entidade,
    entidade_id,
    acao,
    dados
  ) values (
    p_empresa_id,
    v_uid,
    'ROTA',
    v_rota.id::text,
    'COBRANCA_ADICIONADA_ROTA',
    jsonb_build_object(
      'cliente_id', v_cliente.id,
      'cliente', v_cliente.nome,
      'rota_cliente_id', v_rota_cliente_id,
      'sequencia', v_sequencia
    )
  );

  return jsonb_build_object(
    'rota_id', v_rota.id,
    'rota_cliente_id', v_rota_cliente_id,
    'sequencia', v_sequencia,
    'ja_existia', false,
    'codigo', v_rota.codigo
  );
end;
$function$;

revoke all on function public.mobile_adicionar_cobranca_rota_propria(uuid, bigint) from public;
revoke all on function public.mobile_adicionar_cobranca_rota_propria(uuid, bigint) from anon;
grant execute on function public.mobile_adicionar_cobranca_rota_propria(uuid, bigint) to authenticated;
