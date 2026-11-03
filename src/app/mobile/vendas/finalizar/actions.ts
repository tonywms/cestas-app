"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export async function concluirVendaCampo(
  _previousState: {
    success: boolean;
    message: string;
  },
  formData: FormData,
): Promise<{
  success: boolean;
  message: string;
}> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      success: false,
      message:
        "Sessão inválida. Entre novamente.",
    };
  }

  const podePagamento =
    usuario.configuracao
      .permitirPagamentoMobile &&
    (
      usuario.isPlatformAdmin ||
      temPermissao(
        usuario.permissoes,
        PERMISSOES.PAGAMENTO_REGISTRAR,
      )
    );

  const podeEntrega =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ENTREGA_REALIZAR,
    );

  if (
    !podePagamento ||
    !podeEntrega
  ) {
    return {
      success: false,
      message:
        "Você não possui permissão para concluir esta operação.",
    };
  }

  const fluxoId =
    Number(
      formData.get(
        "fluxo_id",
      ),
    );

  if (
    !Number.isInteger(
      fluxoId,
    ) ||
    fluxoId <= 0
  ) {
    return {
      success: false,
      message:
        "Operação de venda inválida.",
    };
  }

  const codigos =
    formData
      .getAll(
        "codigos_volume",
      )
      .map(
        (item) =>
          String(item)
            .trim()
            .toUpperCase(),
      )
      .filter(Boolean);

  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "mobile_concluir_venda_rota",
      {
        p_empresa_id:
          usuario.empresa.id,
        p_fluxo_id:
          fluxoId,
        p_codigos_volume:
          codigos.length > 0
            ? codigos
            : null,
      },
    );

  if (error) {
    console.error(
      "Erro ao concluir venda + entrega:",
      error,
    );

    return {
      success: false,
      message:
        error.message ||
        "Não foi possível concluir a operação.",
    };
  }

  const resultado =
    (
      data ??
      {}
    ) as {
      entrega_id?: number;
    };

  const entregaId =
    Number(
      resultado.entrega_id,
    );

  [
    "/mobile",
    "/mobile/rota",
    "/mobile/carga",
    "/mobile/recebimentos",
    "/admin/cargas",
    "/admin/financeiro",
    "/admin/relatorios/vendas",
  ].forEach(
    (path) =>
      revalidatePath(
        path,
      ),
  );

  if (
    Number.isInteger(
      entregaId,
    ) &&
    entregaId > 0
  ) {
    redirect(
      `/mobile/vendas/nova?entregaId=${entregaId}`,
    );
  }

  redirect(
    "/mobile/rota",
  );
}

/* V65_CANCELAMENTO_VENDA_PREPARADA */
export async function cancelarVendaPreparada(
  _previousState: {
    success: boolean;
    message: string;
  },
  formData: FormData,
): Promise<{
  success: boolean;
  message: string;
}> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      success: false,
      message:
        "Sessão inválida. Entre novamente.",
    };
  }

  const podePagamento =
    usuario.configuracao
      .permitirPagamentoMobile &&
    (
      usuario.isPlatformAdmin ||
      temPermissao(
        usuario.permissoes,
        PERMISSOES.PAGAMENTO_REGISTRAR,
      )
    );

  const podeEntrega =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ENTREGA_REALIZAR,
    );

  const podeRota =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ROTA_MOBILE_GERENCIAR_PROPRIA,
    );

  if (
    !podePagamento ||
    !podeEntrega ||
    !podeRota
  ) {
    return {
      success: false,
      message:
        "Você não possui permissão para corrigir esta venda.",
    };
  }

  const fluxoId =
    Number(
      formData.get(
        "fluxo_id",
      ),
    );

  const motivo =
    String(
      formData.get(
        "motivo",
      ) ?? "",
    ).trim();

  if (
    !Number.isInteger(
      fluxoId,
    ) ||
    fluxoId <= 0
  ) {
    return {
      success: false,
      message:
        "Venda preparada inválida.",
    };
  }

  if (
    motivo.length < 8 ||
    motivo.length > 500
  ) {
    return {
      success: false,
      message:
        "Informe um motivo entre 8 e 500 caracteres.",
    };
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "mobile_cancelar_venda_preparada",
      {
        p_empresa_id:
          usuario.empresa.id,
        p_fluxo_id:
          fluxoId,
        p_motivo:
          motivo,
      },
    );

  if (error) {
    console.error(
      "Erro ao cancelar venda preparada:",
      error,
    );

    return {
      success: false,
      message:
        error.message ||
        "Não foi possível corrigir a venda preparada.",
    };
  }

  const resultado =
    (
      data ??
      {}
    ) as {
      rota_cliente_id?: number;
    };

  const rotaClienteId =
    Number(
      resultado.rota_cliente_id,
    );

  [
    "/mobile",
    "/mobile/rota",
    "/mobile/carga",
    "/mobile/vendas/preparar",
    "/mobile/vendas/finalizar",
  ].forEach(
    (path) =>
      revalidatePath(
        path,
      ),
  );

  if (
    Number.isInteger(
      rotaClienteId,
    ) &&
    rotaClienteId > 0
  ) {
    redirect(
      `/mobile/vendas/preparar?rotaClienteId=${rotaClienteId}&corrigida=1`,
    );
  }

  redirect(
    "/mobile/rota",
  );
}
