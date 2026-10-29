-- ============================================================
-- CESTAS APP
-- CORRECAO: GERACAO AUTOMATICA DE VOLUMES AO CRIAR CARGA
--
-- REGRA:
-- QUANTIDADE:
--   - cria carga normalmente
--   - nao cria cesta_volumes
--
-- VOLUME:
--   - cria carga
--   - cria automaticamente 1 volume por cesta
--   - volume nasce EM_CARGA
--   - carga_id ja fica vinculado
--
-- Exemplo:
-- carga id 100 com 3 cestas:
-- VOL-100-001
-- VOL-100-002
-- VOL-100-003
-- ============================================================

create or replace function public.criar_carga_com_estoque(
    p_empresa_id uuid,
    p_codigo text,
    p_entregador_id uuid,
    p_tipo_cesta_id bigint,
    p_quantidade integer,
    p_observacao text default null::text
)
returns table(
    carga_id bigint,
    carga_codigo text,
    saldo_central integer
)
language plpgsql
set search_path to ''
as $function$
declare
    v_carga_id bigint;
    v_saldo integer;
    v_novo_saldo integer;

    v_modo text := 'QUANTIDADE';
    v_exigir_bipagem_carga boolean := false;

    v_qtd_volumes integer := 0;
begin

    -- ========================================================
    -- AUTENTICACAO
    -- ========================================================

    if auth.uid() is null then
        raise exception 'Sessão inválida.';
    end if;

    -- ========================================================
    -- PERMISSOES
    -- ========================================================

    if not app_private.has_permission(
        p_empresa_id,
        'CARGA_GERENCIAR'
    ) then
        raise exception
            'Você não possui permissão para criar cargas.';
    end if;

    if not app_private.has_permission(
        p_empresa_id,
        'ESTOQUE_MOVIMENTAR'
    ) then
        raise exception
            'Você não possui permissão para movimentar o estoque central.';
    end if;

    -- ========================================================
    -- VALIDACOES BASICAS
    -- ========================================================

    if p_quantidade is null or p_quantidade <= 0 then
        raise exception
            'Informe uma quantidade válida.';
    end if;

    if nullif(
        trim(coalesce(p_codigo, '')),
        ''
    ) is null then
        raise exception
            'Código da carga inválido.';
    end if;

    -- ========================================================
    -- CONFIGURACAO DA EMPRESA
    -- ========================================================

    select
        ec.modo_controle_carga,
        ec.exigir_bipagem_carga
    into
        v_modo,
        v_exigir_bipagem_carga
    from public.empresa_configuracoes ec
    where ec.empresa_id = p_empresa_id;

    v_modo :=
        coalesce(
            v_modo,
            'QUANTIDADE'
        );

    v_exigir_bipagem_carga :=
        coalesce(
            v_exigir_bipagem_carga,
            false
        );

    -- ========================================================
    -- VALIDA ENTREGADOR
    -- ========================================================

    if not exists (
        select 1
        from public.empresa_usuarios eu

        join public.perfis p
            on p.id = eu.perfil_id

        where eu.empresa_id = p_empresa_id
          and eu.usuario_id = p_entregador_id
          and eu.ativo = true
          and p.codigo = 'ENTREGADOR'
    ) then

        raise exception
            'Entregador inválido para esta empresa.';

    end if;

    -- ========================================================
    -- VALIDA TIPO DE CESTA
    -- ========================================================

    if not exists (
        select 1
        from public.tipos_cesta t

        where t.id = p_tipo_cesta_id
          and t.empresa_id = p_empresa_id
          and t.ativo = true
    ) then

        raise exception
            'Tipo de cesta inválido para esta empresa.';

    end if;

    -- ========================================================
    -- IMPEDE DUAS CARGAS ABERTAS
    -- ========================================================

    if exists (
        select 1
        from public.cargas c

        where c.empresa_id = p_empresa_id
          and c.entregador_id = p_entregador_id
          and c.status in (
              'ABERTA',
              'EM_ROTA'
          )
    ) then

        raise exception
            'Este entregador já possui uma carga em aberto.';

    end if;

    -- ========================================================
    -- GARANTE REGISTRO DO ESTOQUE CENTRAL
    -- ========================================================

    insert into public.estoque_central_saldos (
        empresa_id,
        tipo_cesta_id,
        quantidade,
        estoque_minimo
    )
    values (
        p_empresa_id,
        p_tipo_cesta_id,
        0,
        0
    )
    on conflict (
        empresa_id,
        tipo_cesta_id
    )
    do nothing;

    -- ========================================================
    -- BLOQUEIA SALDO PARA EVITAR CONCORRENCIA
    -- ========================================================

    select
        s.quantidade
    into
        v_saldo
    from public.estoque_central_saldos s

    where s.empresa_id = p_empresa_id
      and s.tipo_cesta_id = p_tipo_cesta_id

    for update;

    if v_saldo < p_quantidade then

        raise exception
            'Estoque central insuficiente. Disponível: % cesta(s); solicitado: %.',
            v_saldo,
            p_quantidade;

    end if;

    -- ========================================================
    -- CRIA CABECALHO DA CARGA
    -- ========================================================

    insert into public.cargas (
        empresa_id,
        codigo,
        entregador_id,
        data_carga,
        status,
        observacao,
        recebida_at,
        recebida_por
    )
    values (
        p_empresa_id,
        p_codigo,
        p_entregador_id,
        current_date,
        'ABERTA',

        nullif(
            trim(
                coalesce(
                    p_observacao,
                    ''
                )
            ),
            ''
        ),

        case
            when
                v_modo = 'VOLUME'
                and not v_exigir_bipagem_carga
            then now()
            else null
        end,

        case
            when
                v_modo = 'VOLUME'
                and not v_exigir_bipagem_carga
            then p_entregador_id
            else null
        end
    )
    returning id
    into v_carga_id;

    -- ========================================================
    -- CRIA ITEM DA CARGA
    -- ========================================================

    insert into public.carga_itens (
        empresa_id,
        carga_id,
        tipo_cesta_id,
        quantidade_carregada,
        quantidade_entregue,
        quantidade_retornada,
        quantidade_avariada
    )
    values (
        p_empresa_id,
        v_carga_id,
        p_tipo_cesta_id,
        p_quantidade,
        0,
        0,
        0
    );

    -- ========================================================
    -- NOVA REGRA
    --
    -- EMPRESA EM VOLUME:
    -- GERA OS VOLUMES AUTOMATICAMENTE.
    --
    -- NAO PROCURA MAIS VOLUME DISPONIVEL.
    -- NAO EXIGE GERACAO MANUAL ANTES DA CARGA.
    --
    -- Ex:
    -- VOL-100-001
    -- VOL-100-002
    -- VOL-100-003
    -- ========================================================

    if v_modo = 'VOLUME' then

        insert into public.cesta_volumes (
            empresa_id,
            tipo_cesta_id,
            codigo_volume,
            status,
            carga_id,
            created_at,
            updated_at
        )
        select
            p_empresa_id,
            p_tipo_cesta_id,

            'VOL-'
            || v_carga_id::text
            || '-'
            || lpad(
                gs.numero::text,
                3,
                '0'
            ),

            'EM_CARGA',
            v_carga_id,
            now(),
            now()

        from generate_series(
            1,
            p_quantidade
        ) as gs(numero);

        get diagnostics
            v_qtd_volumes = row_count;

        if v_qtd_volumes <> p_quantidade then

            raise exception
                'Falha ao gerar automaticamente os volumes da carga. Esperados: %; gerados: %.',
                p_quantidade,
                v_qtd_volumes;

        end if;

    end if;

    -- ========================================================
    -- BAIXA ESTOQUE CENTRAL
    -- ========================================================

    v_novo_saldo :=
        v_saldo -
        p_quantidade;

    update public.estoque_central_saldos s

    set
        quantidade =
            v_novo_saldo,

        updated_at =
            now()

    where
        s.empresa_id =
            p_empresa_id

        and s.tipo_cesta_id =
            p_tipo_cesta_id;

    -- ========================================================
    -- MOVIMENTACOES
    -- ========================================================

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
    values
    (
        p_empresa_id,
        p_tipo_cesta_id,
        v_carga_id,
        p_entregador_id,
        'SAIDA_CENTRAL_CARGA',
        p_quantidade,
        p_codigo,
        'Saída do estoque central para carga do entregador.'
    ),
    (
        p_empresa_id,
        p_tipo_cesta_id,
        v_carga_id,
        p_entregador_id,
        'ENTRADA_CARGA',
        p_quantidade,
        p_codigo,
        'Entrada no estoque móvel do entregador.'
    );

    -- ========================================================
    -- RETORNO
    -- ========================================================

    return query

    select
        v_carga_id,
        p_codigo,
        v_novo_saldo;

end;
$function$;
