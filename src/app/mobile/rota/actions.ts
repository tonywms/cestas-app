"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

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

function destinoErro(
  mensagem:
    string,
) {
  return `/mobile/rota?erro=${encodeURIComponent(
    mensagem,
  )}`;
}

export async function iniciarMinhaRota() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const permitido =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ROTA_MOBILE_GERENCIAR_PROPRIA,
    );

  if (!permitido) {
    redirect(
      "/mobile/sem-acesso",
    );
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "mobile_iniciar_rota_propria",
      {
        p_empresa_id:
          usuario.empresa.id,
      },
    );

  if (error) {
    redirect(
      destinoErro(
        error.message ||
          "Não foi possível iniciar sua rota.",
      ),
    );
  }

  const resultado =
    (
      data ??
      {}
    ) as {
      codigo?:
        string;
  };

  [
    "/mobile",
    "/mobile/rota",
    "/mobile/carga",
    "/admin/rotas",
    "/admin/cargas",
  ].forEach(
    (
      path,
    ) =>
      revalidatePath(
        path,
      ),
  );

  redirect(
    `/mobile/rota?ok=${encodeURIComponent(
      resultado.codigo
        ? `Rota ${resultado.codigo} iniciada.`
        : "Sua rota foi iniciada.",
    )}`,
  );
}

export async function encerrarMinhaRota(
  formData:
    FormData,
) {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const permitido =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ROTA_MOBILE_GERENCIAR_PROPRIA,
    );

  if (!permitido) {
    redirect(
      "/mobile/sem-acesso",
    );
  }

  const rotaId =
    Number(
      formData.get(
        "rota_id",
      ),
    );

  if (
    !Number.isInteger(
      rotaId,
    ) ||
    rotaId <=
      0
  ) {
    redirect(
      destinoErro(
        "Rota inválida.",
      ),
    );
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "mobile_finalizar_rota_propria",
      {
        p_empresa_id:
          usuario.empresa.id,

        p_rota_id:
          rotaId,
      },
    );

  if (error) {
    redirect(
      destinoErro(
        error.message ||
          "Não foi possível encerrar sua rota.",
      ),
    );
  }

  const resultado =
    (
      data ??
      {}
    ) as {
      codigo?:
        string;
  };

  [
    "/mobile",
    "/mobile/rota",
    "/mobile/carga",
    "/admin/rotas",
    "/admin/cargas",
  ].forEach(
    (
      path,
    ) =>
      revalidatePath(
        path,
      ),
  );

  redirect(
    `/mobile/rota?ok=${encodeURIComponent(
      resultado.codigo
        ? `Rota ${resultado.codigo} encerrada com sucesso.`
        : "Sua rota foi encerrada com sucesso.",
    )}`,
  );
}
