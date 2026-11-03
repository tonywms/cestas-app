-- ============================================================
-- CESTAS APP - V60
-- HARDENING DE PRODUCAO / RLS + INDICES DE COBERTURA
-- Data: 01/11/2026
-- Objetivo:
--   1) Eliminar reavaliacao de auth.uid() por linha nas policies
--      de fechamentos_entregador apontadas pelo advisor.
--   2) Adicionar indices de cobertura nos FKs mais quentes dos
--      fluxos Cliente 360, Rotas, Entregas, Vendas e Recebimentos.
--   3) Nao alterar regra de negocio, tenant, permissoes ou RPCs.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. RLS / PERFORMANCE - fechamentos_entregador
-- Mantem exatamente os mesmos perfis e regras funcionais.
-- Apenas transforma auth.uid() em initplan estavel por statement.
-- ------------------------------------------------------------

drop policy if exists fechamentos_entregador_insert
  on public.fechamentos_entregador;

create policy fechamentos_entregador_insert
on public.fechamentos_entregador
for insert
to authenticated
with check (
  conferido_por = (select auth.uid())
  and (
    app_private.is_platform_admin()
    or app_private.has_empresa_profile(
      empresa_id,
      array['ADMINISTRADOR'::text, 'GESTOR'::text, 'FINANCEIRO'::text]
    )
  )
);

drop policy if exists fechamentos_entregador_update
  on public.fechamentos_entregador;

create policy fechamentos_entregador_update
on public.fechamentos_entregador
for update
to authenticated
using (
  app_private.is_platform_admin()
  or app_private.has_empresa_profile(
    empresa_id,
    array['ADMINISTRADOR'::text, 'GESTOR'::text, 'FINANCEIRO'::text]
  )
)
with check (
  (
    app_private.is_platform_admin()
    or app_private.has_empresa_profile(
      empresa_id,
      array['ADMINISTRADOR'::text, 'GESTOR'::text, 'FINANCEIRO'::text]
    )
  )
  and (
    bloqueado = false
    or conferido_por = (select auth.uid())
  )
);

-- ------------------------------------------------------------
-- 2. INDICES DE COBERTURA - somente relacionamentos quentes
-- CREATE INDEX IF NOT EXISTS => idempotente.
-- ------------------------------------------------------------

create index if not exists idx_v60_cliente_enderecos_cliente_fk
  on public.cliente_enderecos (cliente_id);

create index if not exists idx_v60_rota_clientes_rota_fk
  on public.rota_clientes (rota_id);

create index if not exists idx_v60_rota_clientes_cliente_fk
  on public.rota_clientes (cliente_id);

create index if not exists idx_v60_rotas_entregador_fk
  on public.rotas (entregador_id);

create index if not exists idx_v60_rotas_carga_fk
  on public.rotas (carga_id)
  where carga_id is not null;

create index if not exists idx_v60_entregas_rota_cliente_fk
  on public.entregas (rota_cliente_id)
  where rota_cliente_id is not null;

create index if not exists idx_v60_ocorrencias_rota_cliente_fk
  on public.ocorrencias (rota_cliente_id)
  where rota_cliente_id is not null;

create index if not exists idx_v60_vendas_cliente_fk
  on public.vendas (cliente_id);

create index if not exists idx_v60_vendas_entrega_fk
  on public.vendas (entrega_id);

create index if not exists idx_v60_venda_recebimentos_venda_fk
  on public.venda_recebimentos (venda_id);

create index if not exists idx_v60_venda_fluxos_rota_cliente_fk
  on public.venda_fluxos_campo (rota_cliente_id)
  where rota_cliente_id is not null;

create index if not exists idx_v60_venda_fluxos_cliente_fk
  on public.venda_fluxos_campo (cliente_id)
  where cliente_id is not null;

-- ------------------------------------------------------------
-- 3. SEGURANCA DOS RPCs SECURITY DEFINER
-- Nao revogamos authenticated porque estes RPCs sao a API segura
-- do mobile. Eles ja usam search_path vazio, auth.uid(), tenant e
-- permissao interna. Garante explicitamente que anon/public nao
-- executem os RPCs criticos auditados.
-- ------------------------------------------------------------

revoke execute on function public.mobile_adicionar_cliente_rota_propria(uuid,bigint) from public, anon;
revoke execute on function public.mobile_adicionar_cobranca_rota_propria(uuid,bigint) from public, anon;
revoke execute on function public.mobile_criar_cliente(uuid,text,text,text,text,text,text,text,text,text,text) from public, anon;
revoke execute on function public.mobile_editar_cliente(uuid,bigint,text,text,text,text,text,text,text,text,text,text) from public, anon;
revoke execute on function public.mobile_finalizar_rota_propria(uuid,bigint) from public, anon;
revoke execute on function public.mobile_iniciar_rota_propria(uuid) from public, anon;
revoke execute on function public.mobile_registrar_venda_entrega(uuid,bigint,text,text,numeric,integer,date,text) from public, anon;
revoke execute on function public.registrar_ocorrencia_rota(uuid,bigint,text,text,boolean) from public, anon;
revoke execute on function public.registrar_recebimento_cliente(uuid,bigint,numeric,text,text) from public, anon;
revoke execute on function public.registrar_recebimento_cliente_rota(uuid,bigint,numeric,text,text,bigint) from public, anon;

commit;
