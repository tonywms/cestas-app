-- CESTAS APP - V82
-- RASTREABILIDADE FISICA DE RETORNO E AVARIA POR VOLUME
-- Mantem a assinatura publica finalizar_carga_estoque(uuid,bigint,jsonb).
-- No modo VOLUME, cada item pode enviar volumes_avariados: [uuid,...].
-- Avaria fica fora do estoque central; todo EM_CARGA não selecionado vira RETORNADO.

create or replace function app_private.finalizar_carga_estoque_impl_v82(
  p_empresa_id uuid,
  p_carga_id bigint,
  p_itens jsonb
)
returns table(
  carga_id bigint,
  status text,
  total_retornado integer,
  total_avariado integer,
  saldo_restante integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_usuario_id uuid;
  v_carga public.cargas%rowtype;
  v_item_json jsonb;
  v_item public.carga_itens%rowtype;
  v_item_id bigint;
  v_retorno integer;
  v_avaria integer;
  v_saldo_item integer;
  v_total_retornado integer := 0;
  v_total_avariado integer := 0;
  v_eh_gestor boolean;
  v_pode_retornar boolean;
  v_modo_controle text := 'QUANTIDADE';
  v_qtd_volumes_em_carga integer;
  v_motivo_avaria text;
  v_volume_ids_avariados uuid[] := array[]::uuid[];
  v_qtd_volumes_avariados_validos integer := 0;
  v_codigos_avariados jsonb := '[]'::jsonb;
  v_avarias_detalhe jsonb := '[]'::jsonb;
begin
  v_usuario_id := auth.uid();

  if v_usuario_id is null then
    raise exception 'Sessão inválida.';
  end if;

  if not app_private.is_empresa_member(p_empresa_id) then
    raise exception 'Usuário não pertence a esta empresa.';
  end if;

  v_eh_gestor := app_private.has_permission(p_empresa_id, 'CARGA_GERENCIAR');
  v_pode_retornar := app_private.has_permission(p_empresa_id, 'CARGA_RETORNAR');

  select coalesce(ec.modo_controle_carga, 'QUANTIDADE')
    into v_modo_controle
  from public.empresa_configuracoes ec
  where ec.empresa_id = p_empresa_id;

  if not found then
    v_modo_controle := 'QUANTIDADE';
  end if;

  select c.*
    into v_carga
  from public.cargas c
  where c.id = p_carga_id
    and c.empresa_id = p_empresa_id
  for update;

  if not found then
    raise exception 'Carga não encontrada.';
  end if;

  if v_carga.status not in ('ABERTA', 'EM_ROTA') then
    raise exception 'Esta carga não está disponível para fechamento.';
  end if;

  if not v_eh_gestor then
    if not v_pode_retornar or v_carga.entregador_id <> v_usuario_id then
      raise exception 'Você não possui permissão para fechar esta carga.';
    end if;
  end if;

  if exists (
    select 1
    from public.rotas r
    where r.empresa_id = p_empresa_id
      and r.entregador_id = v_carga.entregador_id
      and r.status in ('PLANEJADA', 'EM_ROTA')
  ) then
    raise exception 'Existe uma rota ativa para este entregador. Finalize ou cancele a rota antes de fechar a carga.';
  end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then
    raise exception 'Itens de fechamento inválidos.';
  end if;

  for v_item_json in
    select value
    from jsonb_array_elements(p_itens)
  loop
    v_item_id := (v_item_json ->> 'carga_item_id')::bigint;
    v_retorno := coalesce((v_item_json ->> 'quantidade_retornada')::integer, 0);
    v_avaria := coalesce((v_item_json ->> 'quantidade_avariada')::integer, 0);
    v_motivo_avaria := nullif(
      btrim(
        coalesce(
          v_item_json ->> 'motivo_avaria',
          ''
        )
      ),
      ''
    );

    v_volume_ids_avariados :=
      case
        when jsonb_typeof(v_item_json -> 'volumes_avariados') = 'array'
        then array(
          select value::uuid
          from jsonb_array_elements_text(v_item_json -> 'volumes_avariados')
        )
        else array[]::uuid[]
      end;

    if cardinality(v_volume_ids_avariados) <> (
      select count(distinct volume_id)
      from unnest(v_volume_ids_avariados) as volume_id
    ) then
      raise exception 'Existem volumes avariados duplicados na conferência.';
    end if;

    if v_retorno < 0 or v_avaria < 0 then
      raise exception 'Quantidade de retorno ou avaria inválida.';
    end if;

    if v_avaria > 0 and char_length(coalesce(v_motivo_avaria, '')) < 8 then
      raise exception 'Informe o motivo da avaria com pelo menos 8 caracteres.';
    end if;

    select ci.*
      into v_item
    from public.carga_itens ci
    where ci.id = v_item_id
      and ci.carga_id = p_carga_id
      and ci.empresa_id = p_empresa_id
    for update;

    if not found then
      raise exception 'Item da carga não encontrado.';
    end if;

    v_saldo_item :=
      v_item.quantidade_carregada
      - v_item.quantidade_entregue
      - v_item.quantidade_retornada
      - v_item.quantidade_avariada;

    if v_saldo_item < 0 then
      raise exception 'Saldo inconsistente no item da carga.';
    end if;

    if v_retorno + v_avaria <> v_saldo_item then
      raise exception 'Distribua todo o saldo do item entre retorno e avaria. Saldo atual: %.', v_saldo_item;
    end if;

    if v_modo_controle = 'VOLUME' then
      perform 1
      from public.cesta_volumes cv
      where cv.empresa_id = p_empresa_id
        and cv.carga_id = p_carga_id
        and cv.tipo_cesta_id = v_item.tipo_cesta_id
        and cv.status = 'EM_CARGA'
      for update;

      select count(*)::integer
        into v_qtd_volumes_em_carga
      from public.cesta_volumes cv
      where cv.empresa_id = p_empresa_id
        and cv.carga_id = p_carga_id
        and cv.tipo_cesta_id = v_item.tipo_cesta_id
        and cv.status = 'EM_CARGA';

      if v_qtd_volumes_em_carga <> v_saldo_item then
        raise exception 'Inconsistência entre saldo da carga (%) e volumes físicos EM_CARGA (%).', v_saldo_item, v_qtd_volumes_em_carga;
      end if;

      if cardinality(v_volume_ids_avariados) <> v_avaria then
        raise exception 'A quantidade de avarias (%) não confere com os volumes físicos identificados (%).', v_avaria, cardinality(v_volume_ids_avariados);
      end if;

      select count(*)::integer
        into v_qtd_volumes_avariados_validos
      from public.cesta_volumes cv
      where cv.empresa_id = p_empresa_id
        and cv.carga_id = p_carga_id
        and cv.tipo_cesta_id = v_item.tipo_cesta_id
        and cv.status = 'EM_CARGA'
        and cv.id = any(v_volume_ids_avariados);

      if v_qtd_volumes_avariados_validos <> v_avaria then
        raise exception 'Um ou mais volumes avariados não pertencem ao saldo físico desta carga.';
      end if;

      select coalesce(
        jsonb_agg(cv.codigo_volume order by cv.codigo_volume),
        '[]'::jsonb
      )
        into v_codigos_avariados
      from public.cesta_volumes cv
      where cv.id = any(v_volume_ids_avariados);

      if v_retorno > 0 then
        update public.cesta_volumes cv
        set status = 'RETORNADO',
            carga_id = p_carga_id,
            entrega_id = null,
            entregue_at = null,
            updated_at = now()
        where cv.empresa_id = p_empresa_id
          and cv.carga_id = p_carga_id
          and cv.tipo_cesta_id = v_item.tipo_cesta_id
          and cv.status = 'EM_CARGA'
          and not (cv.id = any(v_volume_ids_avariados));
      end if;

      if v_avaria > 0 then
        update public.cesta_volumes cv
        set status = 'AVARIADO',
            entrega_id = null,
            entregue_at = null,
            updated_at = now()
        where cv.empresa_id = p_empresa_id
          and cv.carga_id = p_carga_id
          and cv.tipo_cesta_id = v_item.tipo_cesta_id
          and cv.status = 'EM_CARGA'
          and cv.id = any(v_volume_ids_avariados);
      end if;
    else
      if cardinality(v_volume_ids_avariados) > 0 then
        raise exception 'Identificação individual de volume só é permitida no modo VOLUME.';
      end if;

      v_codigos_avariados := '[]'::jsonb;
    end if;

    update public.carga_itens ci
    set quantidade_retornada = ci.quantidade_retornada + v_retorno,
        quantidade_avariada = ci.quantidade_avariada + v_avaria,
        updated_at = now()
    where ci.id = v_item.id;

    if v_retorno > 0 then
      insert into public.estoque_central_saldos (
        empresa_id,
        tipo_cesta_id,
        quantidade,
        estoque_minimo
      )
      values (
        p_empresa_id,
        v_item.tipo_cesta_id,
        0,
        0
      )
      on conflict (empresa_id, tipo_cesta_id) do nothing;

      update public.estoque_central_saldos s
      set quantidade = s.quantidade + v_retorno,
          updated_at = now()
      where s.empresa_id = p_empresa_id
        and s.tipo_cesta_id = v_item.tipo_cesta_id;

      insert into public.movimentacoes_estoque (
        empresa_id,
        tipo_cesta_id,
        carga_id,
        usuario_id,
        tipo_movimento,
        quantidade,
        referencia,
        observacao
      )
      values (
        p_empresa_id,
        v_item.tipo_cesta_id,
        p_carga_id,
        v_carga.entregador_id,
        'RETORNO_CARGA_CENTRAL',
        v_retorno,
        v_carga.codigo,
        'Retorno da carga para o estoque central.'
      );
    end if;

    if v_avaria > 0 then
      insert into public.movimentacoes_estoque (
        empresa_id,
        tipo_cesta_id,
        carga_id,
        usuario_id,
        tipo_movimento,
        quantidade,
        referencia,
        observacao
      )
      values (
        p_empresa_id,
        v_item.tipo_cesta_id,
        p_carga_id,
        v_carga.entregador_id,
        'AVARIA_CARGA',
        v_avaria,
        v_carga.codigo,
        case
          when v_modo_controle = 'VOLUME'
          then format(
            'Baixa por avaria no fechamento da carga. Volumes: %s. Motivo: %s',
            v_codigos_avariados::text,
            v_motivo_avaria
          )
          else format(
            'Baixa por avaria no fechamento da carga. Motivo: %s',
            v_motivo_avaria
          )
        end
      );

      v_avarias_detalhe :=
        v_avarias_detalhe ||
        jsonb_build_array(
          jsonb_build_object(
            'tipo_cesta_id',
            v_item.tipo_cesta_id,
            'quantidade',
            v_avaria,
            'volumes',
            v_codigos_avariados,
            'motivo',
            v_motivo_avaria
          )
        );
    end if;

    v_total_retornado := v_total_retornado + v_retorno;
    v_total_avariado := v_total_avariado + v_avaria;
  end loop;

  if exists (
    select 1
    from public.carga_itens ci
    where ci.carga_id = p_carga_id
      and ci.empresa_id = p_empresa_id
      and (
        ci.quantidade_carregada
        - ci.quantidade_entregue
        - ci.quantidade_retornada
        - ci.quantidade_avariada
      ) <> 0
  ) then
    raise exception 'Ainda existe saldo não tratado na carga.';
  end if;

  update public.cargas c
  set status = 'FINALIZADA',
      finalizada_at = now(),
      updated_at = now()
  where c.id = p_carga_id
    and c.empresa_id = p_empresa_id;

  insert into public.auditoria_eventos (
    empresa_id,
    usuario_id,
    entidade,
    entidade_id,
    acao,
    dados
  )
  values (
    p_empresa_id,
    v_usuario_id,
    'CARGA',
    p_carga_id::text,
    'CARGA_FINALIZADA',
    jsonb_build_object(
      'codigo', v_carga.codigo,
      'total_retornado', v_total_retornado,
      'total_avariado', v_total_avariado,
      'modo_controle', v_modo_controle,
      'avarias', v_avarias_detalhe
    )
  );

  return query
  select
    p_carga_id,
    'FINALIZADA'::text,
    v_total_retornado,
    v_total_avariado,
    0;
end;
$function$;



create or replace function app_private.finalizar_carga_estoque_impl(
  p_empresa_id uuid,
  p_carga_id bigint,
  p_itens jsonb
)
returns table(
  carga_id bigint,
  status text,
  total_retornado integer,
  total_avariado integer,
  saldo_restante integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_entregador_id uuid;
begin
  select c.entregador_id
    into v_entregador_id
  from public.cargas c
  where c.id = p_carga_id
    and c.empresa_id = p_empresa_id;

  if found and not exists (
    select 1
    from public.rotas r
    where r.empresa_id = p_empresa_id
      and r.carga_id = p_carga_id
      and r.entregador_id = v_entregador_id
      and r.status = 'FINALIZADA'
      and r.finalizada_at is not null
  ) then
    raise exception 'Finalize uma rota vinculada a esta carga antes de fechar ou informar retorno.';
  end if;

  return query
  select *
  from app_private.finalizar_carga_estoque_impl_v82(
    p_empresa_id,
    p_carga_id,
    p_itens
  );
end;
$function$;

comment on function app_private.finalizar_carga_estoque_impl_v82(uuid, bigint, jsonb)
is 'V82: fechamento de carga com identificação física exata dos volumes avariados; retornos são o complemento e somente eles voltam ao estoque central.';

comment on function app_private.finalizar_carga_estoque_impl(uuid, bigint, jsonb)
is 'V82: wrapper preserva gate de rota finalizada e delega o fechamento rastreável para finalizar_carga_estoque_impl_v82.';
