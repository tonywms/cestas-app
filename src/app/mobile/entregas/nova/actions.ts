"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  getCurrentUserProfile,
} from "@/lib/auth/get-current-user";

import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";

import {
  createClient,
} from "@/lib/supabase/server";

type ActionState = {
  success: boolean;
  message: string;
  saldoAnterior: number | null;
  saldoAtual: number | null;
};

type RpcResult = {
  entrega_id?: number;
  quantidade?: number;
  saldo_anterior?: number;
  saldo_atual?: number;
  rota_cliente_id?: number | null;
};

export async function registrarEntrega(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      success: false,
      message: "Sessão inválida.",
      saldoAnterior: null,
      saldoAtual: null,
    };
  }

  const podeEntregar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ENTREGA_REALIZAR,
    );

  if (!podeEntregar) {
    return {
      success: false,
      message: "Você não possui permissão para realizar entregas.",
      saldoAnterior: null,
      saldoAtual: null,
    };
  }

  const cargaId = Number(
    formData.get("carga_id"),
  );

  const clienteId = Number(
    formData.get("cliente_id"),
  );

  const tipoCestaId = Number(
    formData.get(
      "tipo_cesta_id",
    ),
  );

  const quantidade = Number(
    formData.get("quantidade"),
  );

  const observacao = String(
    formData.get("observacao") ?? "",
  ).trim();

  const rotaClienteTexto = String(
    formData.get(
      "rota_cliente_id",
    ) ?? "",
  ).trim();

  const rotaClienteId =
    rotaClienteTexto === ""
      ? null
      : Number(
          rotaClienteTexto,
        );

  if (
    !Number.isInteger(cargaId) ||
    cargaId <= 0
  ) {
    return {
      success: false,
      message: "Carga inválida.",
      saldoAnterior: null,
      saldoAtual: null,
    };
  }

  if (
    !Number.isInteger(clienteId) ||
    clienteId <= 0
  ) {
    return {
      success: false,
      message: "Selecione o cliente.",
      saldoAnterior: null,
      saldoAtual: null,
    };
  }

  if (
    !Number.isInteger(tipoCestaId) ||
    tipoCestaId <= 0
  ) {
    return {
      success: false,
      message: "Selecione a cesta.",
      saldoAnterior: null,
      saldoAtual: null,
    };
  }

  if (
    !Number.isInteger(quantidade) ||
    quantidade <= 0
  ) {
    return {
      success: false,
      message: "Informe uma quantidade válida.",
      saldoAnterior: null,
      saldoAtual: null,
    };
  }

  if (
    rotaClienteId !== null &&
    (
      !Number.isInteger(
        rotaClienteId,
      ) ||
      rotaClienteId <= 0
    )
  ) {
    return {
      success: false,
      message: "Parada da rota inválida.",
      saldoAnterior: null,
      saldoAtual: null,
    };
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "registrar_entrega_quantidade",
    {
      p_empresa_id:
        usuario.empresa.id,

      p_carga_id:
        cargaId,

      p_cliente_id:
        clienteId,

      p_tipo_cesta_id:
        tipoCestaId,

      p_quantidade:
        quantidade,

      p_observacao:
        observacao || null,

      p_rota_cliente_id:
        rotaClienteId,
    },
  );

  if (error) {
    console.error(
      "Erro registrar entrega:",
      {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      },
    );

    return {
      success: false,
      message:
        error.message ||
        "Não foi possível registrar a entrega.",
      saldoAnterior: null,
      saldoAtual: null,
    };
  }

  const resultado =
    data as RpcResult;

  revalidatePath("/mobile");
  revalidatePath("/mobile/carga");
  revalidatePath("/mobile/rota");
  revalidatePath("/mobile/entregas/nova");
  revalidatePath("/admin/rotas");

  return {
    success: true,
    message:
      `Entrega de ${quantidade} cesta(s) registrada com sucesso.`,
    saldoAnterior:
      resultado?.saldo_anterior ??
      null,
    saldoAtual:
      resultado?.saldo_atual ??
      null,
  };
}
