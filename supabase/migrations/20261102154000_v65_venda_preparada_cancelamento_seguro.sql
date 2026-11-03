-- V65 - Venda preparada recuperável / cancelamento seguro antes da entrega
-- Aplicada no Supabase em 02/11/2026.

alter table public.venda_fluxos_campo
  add column if not exists cancelado_at timestamptz,
  add column if not exists cancelado_por uuid references public.usuarios(id),
  add column if not exists cancelamento_motivo text;

create or replace function app_private.mobile_cancelar_venda_preparada_impl(
  p_empresa_id uuid,
  p_fluxo_id bigint,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_fluxo public.venda_fluxos_campo%rowtype;
  v_rota public.rotas%rowtype;
  v_rc public.rota_clientes%rowtype;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  if v_uid is null then
    raise exception 'Sessão inválida.';
  end if;

  if not app_private.is_empresa_member(p_empresa_id) then
    raise exception 'Usuário não pertence à empresa.';
  end if;

  if not app_private.has_permission(p_empresa_id, 'ROTA_MOBILE_GERENCIAR_PROPRIA') then
    raise exception 'Usuário sem permissão para operar a própria rota.';
  end if;

  if not app_private.has_permission(p_empresa_id, 'ENTREGA_REALIZAR') then
    raise exception 'Usuário sem permissão para realizar entrega.';
  end if;

  if not app_private.can_register_mobile_payment(p_empresa_id) then
    raise exception 'Pagamento mobile desabilitado ou usuário sem permissão.';
  end if;

  if v_motivo is null or char_length(v_motivo) < 8 then
    raise exception 'Informe o motivo da correção com pelo menos 8 caracteres.';
  end if;

  if char_length(v_motivo) > 500 then
    raise exception 'O motivo da correção deve possuir no máximo 500 caracteres.';
  end if;

  select f.*
    into v_fluxo
  from public.venda_fluxos_campo f
  where f.id = p_fluxo_id
    and f.empresa_id = p_empresa_id
    and f.entregador_id = v_uid
  for update;

  if v_fluxo.id is null then
    raise exception 'Venda preparada não encontrada.';
  end if;

  if v_fluxo.status = 'CANCELADO' then
    return jsonb_build_object(
      'fluxo_id', v_fluxo.id,
      'status', 'CANCELADO',
      'rota_cliente_id', v_fluxo.rota_cliente_id,
      'ja_cancelado', true
    );
  end if;

  if v_fluxo.status <> 'AGUARDANDO_ENTREGA' then
    raise exception 'Somente vendas ainda aguardando entrega podem ser corrigidas por este fluxo.';
  end if;

  if v_fluxo.entrega_id is not null or v_fluxo.venda_id is not null then
    raise exception 'Esta venda já possui efeitos operacionais e não pode ser cancelada por este fluxo.';
  end if;

  select rc.*
    into v_rc
  from public.rota_clientes rc
  where rc.id = v_fluxo.rota_cliente_id
    and rc.empresa_id = p_empresa_id
  for update;

  if v_rc.id is null then
    raise exception 'Parada da rota não encontrada.';
  end if;

  select r.*
    into v_rota
  from public.rotas r
  where r.id = v_fluxo.rota_id
    and r.empresa_id = p_empresa_id
    and r.entregador_id = v_uid
    and r.origem = 'MOBILE'
    and r.status in ('PLANEJADA', 'EM_ROTA')
  for update;

  if v_rota.id is null then
    raise exception 'A rota não está disponível para correção desta venda.';
  end if;

  update public.venda_fluxos_campo
     set status = 'CANCELADO',
         cancelado_at = now(),
         cancelado_por = v_uid,
         cancelamento_motivo = v_motivo,
         updated_at = now()
   where id = v_fluxo.id;

  update public.rota_clientes
     set status = 'PENDENTE',
         updated_at = now()
   where id = v_rc.id
     and empresa_id = p_empresa_id
     and status = 'EM_ATENDIMENTO';

  insert into public.auditoria_eventos(
    empresa_id, usuario_id, entidade, entidade_id, acao, dados
  ) values (
    p_empresa_id,
    v_uid,
    'VENDA_FLUXO',
    v_fluxo.id::text,
    'VENDA_PREPARADA_CANCELADA',
    jsonb_build_object(
      'rota_id', v_fluxo.rota_id,
      'rota_cliente_id', v_fluxo.rota_cliente_id,
      'cliente_id', v_fluxo.cliente_id,
      'carga_id', v_fluxo.carga_id,
      'tipo_cesta_id', v_fluxo.tipo_cesta_id,
      'quantidade', v_fluxo.quantidade,
      'tipo_venda', v_fluxo.tipo_venda,
      'valor_total', v_fluxo.valor_total,
      'valor_entrada', v_fluxo.valor_entrada,
      'motivo', v_motivo,
      'efeitos_fisicos_aplicados', false,
      'efeitos_financeiros_aplicados', false
    )
  );

  return jsonb_build_object(
    'fluxo_id', v_fluxo.id,
    'status', 'CANCELADO',
    'rota_cliente_id', v_fluxo.rota_cliente_id,
    'ja_cancelado', false
  );
end;
$function$;

create or replace function public.mobile_cancelar_venda_preparada(
  p_empresa_id uuid,
  p_fluxo_id bigint,
  p_motivo text
)
returns jsonb
language sql
set search_path = ''
as $function$
  select app_private.mobile_cancelar_venda_preparada_impl(
    p_empresa_id, p_fluxo_id, p_motivo
  );
$function$;

revoke all on function public.mobile_cancelar_venda_preparada(uuid, bigint, text) from public;
revoke all on function public.mobile_cancelar_venda_preparada(uuid, bigint, text) from anon;
grant execute on function public.mobile_cancelar_venda_preparada(uuid, bigint, text) to authenticated;
