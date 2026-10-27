"use server";

import {
  randomUUID,
} from "crypto";
import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

type ActionState = {
  success: boolean;
  message: string;
  cargaId: number | null;
};

export async function criarCarga(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      success: false,
      message: "Sessão inválida.",
      cargaId: null,
    };
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CARGA_GERENCIAR,
    );

  if (!autorizado) {
    return {
      success: false,
      message:
        "Você não possui permissão para criar cargas.",
      cargaId: null,
    };
  }

  const entregadorId =
    String(
      formData.get(
        "entregador_id",
      ) ?? "",
    );

  const tipoCestaId =
    Number(
      formData.get(
        "tipo_cesta_id",
      ),
    );

  const quantidade =
    Number(
      formData.get(
        "quantidade",
      ),
    );

  const observacao =
    String(
      formData.get(
        "observacao",
      ) ?? "",
    ).trim();

  if (!entregadorId) {
    return {
      success: false,
      message:
        "Selecione o entregador.",
      cargaId: null,
    };
  }

  if (
    !Number.isInteger(
      tipoCestaId,
    ) ||
    tipoCestaId <= 0
  ) {
    return {
      success: false,
      message:
        "Selecione o tipo de cesta.",
      cargaId: null,
    };
  }

  if (
    !Number.isInteger(
      quantidade,
    ) ||
    quantidade <= 0
  ) {
    return {
      success: false,
      message:
        "Informe uma quantidade válida.",
      cargaId: null,
    };
  }

  const supabase =
    await createClient();

  /*
   * CONFIRMA ENTREGADOR DA MESMA EMPRESA
   */
  const {
    data: vinculo,
  } = await supabase
    .from("empresa_usuarios")
    .select(`
      usuario_id,
      perfil_id,
      perfis!inner (
        codigo
      )
    `)
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "usuario_id",
      entregadorId,
    )
    .eq(
      "ativo",
      true,
    )
    .maybeSingle();

  const perfilRaw =
    vinculo?.perfis;

  const perfil =
    Array.isArray(
      perfilRaw,
    )
      ? perfilRaw[0]
      : perfilRaw;

  if (
    !vinculo ||
    !perfil ||
    perfil.codigo !==
      "ENTREGADOR"
  ) {
    return {
      success: false,
      message:
        "Entregador inválido para esta empresa.",
      cargaId: null,
    };
  }

  /*
   * CONFIRMA TIPO DE CESTA DA MESMA EMPRESA
   */
  const {
    data: tipoCesta,
  } = await supabase
    .from("tipos_cesta")
    .select(`
      id,
      nome
    `)
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "id",
      tipoCestaId,
    )
    .eq(
      "ativo",
      true,
    )
    .maybeSingle();

  if (!tipoCesta) {
    return {
      success: false,
      message:
        "Tipo de cesta inválido.",
      cargaId: null,
    };
  }

  /*
   * NÃO DEIXA O ENTREGADOR TER DUAS CARGAS ABERTAS
   */
  const {
    data: cargaExistente,
  } = await supabase
    .from("cargas")
    .select(`
      id,
      codigo
    `)
    .eq(
      "empresa_id",
      usuario.empresa.id,
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
    .limit(1)
    .maybeSingle();

  if (cargaExistente) {
    return {
      success: false,
      message:
        `Este entregador já possui a carga ${cargaExistente.codigo} em aberto.`,
      cargaId: null,
    };
  }

  const agora =
    new Date();

  const dataCodigo =
    agora
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "");

  const codigo =
    `CG-${dataCodigo}-${randomUUID()
      .slice(0, 6)
      .toUpperCase()}`;

  /*
   * CRIA CABEÇALHO
   */
  const {
    data: carga,
    error: cargaError,
  } = await supabase
    .from("cargas")
    .insert({
      empresa_id:
        usuario.empresa.id,

      codigo,

      entregador_id:
        entregadorId,

      data_carga:
        agora
          .toISOString()
          .slice(0, 10),

      status:
        "ABERTA",

      observacao:
        observacao || null,
    })
    .select(`
      id,
      codigo
    `)
    .single();

  if (
    cargaError ||
    !carga
  ) {
    console.error(
      "Erro criar carga:",
      cargaError,
    );

    return {
      success: false,
      message:
        "Não foi possível criar a carga.",
      cargaId: null,
    };
  }

  /*
   * CRIA ITEM
   */
  const {
    error: itemError,
  } = await supabase
    .from("carga_itens")
    .insert({
      empresa_id:
        usuario.empresa.id,

      carga_id:
        carga.id,

      tipo_cesta_id:
        tipoCestaId,

      quantidade_carregada:
        quantidade,

      quantidade_entregue:
        0,

      quantidade_retornada:
        0,

      quantidade_avariada:
        0,
    });

  if (itemError) {
    console.error(
      "Erro carga item:",
      itemError,
    );

    await supabase
      .from("cargas")
      .delete()
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "id",
        carga.id,
      );

    return {
      success: false,
      message:
        "Não foi possível adicionar as cestas à carga.",
      cargaId: null,
    };
  }

  /*
   * MOVIMENTA CENTRAL -> CARGA
   */
  const movimentos = [
    {
      empresa_id:
        usuario.empresa.id,

      tipo_cesta_id:
        tipoCestaId,

      carga_id:
        carga.id,

      usuario_id:
        entregadorId,

      tipo_movimento:
        "SAIDA_CENTRAL_CARGA",

      quantidade,

      referencia:
        carga.codigo,

      observacao:
        "Saída do estoque central para carga do entregador.",
    },

    {
      empresa_id:
        usuario.empresa.id,

      tipo_cesta_id:
        tipoCestaId,

      carga_id:
        carga.id,

      usuario_id:
        entregadorId,

      tipo_movimento:
        "ENTRADA_CARGA",

      quantidade,

      referencia:
        carga.codigo,

      observacao:
        "Entrada no estoque móvel do entregador.",
    },
  ];

  const {
    error: movimentoError,
  } = await supabase
    .from(
      "movimentacoes_estoque",
    )
    .insert(
      movimentos,
    );

  if (movimentoError) {
    console.error(
      "Erro movimentação:",
      movimentoError,
    );

    await supabase
      .from(
        "movimentacoes_estoque",
      )
      .delete()
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "carga_id",
        carga.id,
      );

    await supabase
      .from("cargas")
      .delete()
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "id",
        carga.id,
      );

    return {
      success: false,
      message:
        "A carga não pôde ser concluída porque a movimentação de estoque falhou.",
      cargaId: null,
    };
  }

  revalidatePath(
    "/admin/cargas",
  );

  revalidatePath(
    "/admin/cargas/nova",
  );

  revalidatePath(
    "/mobile",
  );

  revalidatePath(
    "/mobile/carga",
  );

  return {
    success: true,
    message:
      `Carga ${carga.codigo} criada com ${quantidade} cesta(s).`,
    cargaId:
      carga.id,
  };
}