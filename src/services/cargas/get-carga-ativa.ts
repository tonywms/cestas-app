import { createClient } from "@/lib/supabase/server";

export type ItemCarga = {
  id: number;
  quantidade_carregada: number;
  quantidade_entregue: number;
  quantidade_retornada: number;
  quantidade_avariada: number;

  tipos_cesta: {
    id: number;
    codigo: string;
    nome: string;
  } | null;
};

export type CargaAtiva = {
  id: number;
  codigo: string;
  data_carga: string;

  status:
    | "ABERTA"
    | "EM_ROTA"
    | "FINALIZADA"
    | "CANCELADA";

  observacao: string | null;

  carga_itens: ItemCarga[];
};

type GetCargaAtivaParams = {
  entregadorId: string;
  empresaId: string;
};

function uuidValido(valor: string | null | undefined) {
  if (!valor) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

export async function getCargaAtiva({
  entregadorId,
  empresaId,
}: GetCargaAtivaParams) {
  /*
   * =========================================================
   * PROTEÇÃO CONTRA UUID UNDEFINED
   * =========================================================
   */

  if (!uuidValido(entregadorId)) {
    console.error(
      "getCargaAtiva: entregadorId inválido:",
      entregadorId,
    );

    return {
      carga: null,
      erro:
        "Não foi possível identificar o entregador logado.",
    };
  }

  if (!uuidValido(empresaId)) {
    console.error(
      "getCargaAtiva: empresaId inválido:",
      empresaId,
    );

    return {
      carga: null,
      erro:
        "Não foi possível identificar a empresa do usuário.",
    };
  }

  const supabase =
    await createClient();

  /*
   * =========================================================
   * 1. CARGA ATIVA
   * =========================================================
   */

  const {
    data: carga,
    error: cargaError,
  } = await supabase
    .from("cargas")
    .select(`
      id,
      codigo,
      data_carga,
      status,
      observacao
    `)
    .eq(
      "empresa_id",
      empresaId,
    )
    .eq(
      "entregador_id",
      entregadorId,
    )
    .in(
      "status",
      [
        "ABERTA",
        "EM_ROTA",
      ],
    )
    .order(
      "data_carga",
      {
        ascending: false,
      },
    )
    .limit(1)
    .maybeSingle();

  if (cargaError) {
    console.error(
      "Erro ao consultar carga:",
      {
        message:
          cargaError.message,
        code:
          cargaError.code,
        details:
          cargaError.details,
        hint:
          cargaError.hint,
      },
    );

    return {
      carga: null,
      erro:
        cargaError.message ||
        "Erro ao consultar carga ativa.",
    };
  }

  /*
   * Não possuir carga é uma situação normal.
   */
  if (!carga) {
    return {
      carga: null,
      erro: null,
    };
  }

  /*
   * =========================================================
   * 2. ITENS DA CARGA
   * =========================================================
   */

  const {
    data: itens,
    error: itensError,
  } = await supabase
    .from("carga_itens")
    .select(`
      id,
      tipo_cesta_id,
      quantidade_carregada,
      quantidade_entregue,
      quantidade_retornada,
      quantidade_avariada
    `)
    .eq(
      "empresa_id",
      empresaId,
    )
    .eq(
      "carga_id",
      carga.id,
    )
    .order(
      "id",
      {
        ascending: true,
      },
    );

  if (itensError) {
    console.error(
      "Erro ao consultar itens:",
      {
        message:
          itensError.message,
        code:
          itensError.code,
        details:
          itensError.details,
        hint:
          itensError.hint,
      },
    );

    return {
      carga: null,
      erro:
        itensError.message ||
        "Erro ao consultar itens da carga.",
    };
  }

  /*
   * Carga criada mas ainda sem itens.
   */
  if (
    !itens ||
    itens.length === 0
  ) {
    const resultado:
      CargaAtiva = {
      id:
        carga.id,

      codigo:
        carga.codigo,

      data_carga:
        carga.data_carga,

      status:
        carga.status as CargaAtiva["status"],

      observacao:
        carga.observacao,

      carga_itens: [],
    };

    return {
      carga:
        resultado,

      erro:
        null,
    };
  }

  /*
   * =========================================================
   * 3. TIPOS DE CESTA
   * =========================================================
   */

  const tipoCestaIds =
    Array.from(
      new Set(
        itens
          .map(
            (item) =>
              item.tipo_cesta_id,
          )
          .filter(
            (
              id,
            ): id is number =>
              typeof id === "number",
          ),
      ),
    );

  const tiposPorId =
    new Map<
      number,
      {
        id: number;
        codigo: string;
        nome: string;
      }
    >();

  if (
    tipoCestaIds.length > 0
  ) {
    const {
      data: tiposCesta,
      error: tiposError,
    } = await supabase
      .from("tipos_cesta")
      .select(`
        id,
        codigo,
        nome
      `)
      .eq(
        "empresa_id",
        empresaId,
      )
      .in(
        "id",
        tipoCestaIds,
      );

    if (tiposError) {
      console.error(
        "Erro ao consultar tipos de cesta:",
        {
          message:
            tiposError.message,
          code:
            tiposError.code,
          details:
            tiposError.details,
          hint:
            tiposError.hint,
        },
      );

      return {
        carga: null,
        erro:
          tiposError.message ||
          "Erro ao consultar tipos de cesta.",
      };
    }

    for (
      const tipo of
        tiposCesta ?? []
    ) {
      tiposPorId.set(
        tipo.id,
        {
          id:
            tipo.id,

          codigo:
            tipo.codigo,

          nome:
            tipo.nome,
        },
      );
    }
  }

  /*
   * =========================================================
   * 4. MONTA ITENS
   * =========================================================
   */

  const cargaItens:
    ItemCarga[] =
    itens.map(
      (item) => ({
        id:
          item.id,

        quantidade_carregada:
          Number(
            item.quantidade_carregada ??
              0,
          ),

        quantidade_entregue:
          Number(
            item.quantidade_entregue ??
              0,
          ),

        quantidade_retornada:
          Number(
            item.quantidade_retornada ??
              0,
          ),

        quantidade_avariada:
          Number(
            item.quantidade_avariada ??
              0,
          ),

        tipos_cesta:
          typeof item.tipo_cesta_id ===
          "number"
            ? tiposPorId.get(
                item.tipo_cesta_id,
              ) ?? null
            : null,
      }),
    );

  /*
   * =========================================================
   * 5. RESULTADO
   * =========================================================
   */

  const resultado:
    CargaAtiva = {
    id:
      carga.id,

    codigo:
      carga.codigo,

    data_carga:
      carga.data_carga,

    status:
      carga.status as CargaAtiva["status"],

    observacao:
      carga.observacao,

    carga_itens:
      cargaItens,
  };

  return {
    carga:
      resultado,

    erro:
      null,
  };
}