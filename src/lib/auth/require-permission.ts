import { redirect } from "next/navigation";

import {
  getCurrentUserProfile,
} from "@/lib/auth/get-current-user";

import {
  temPermissao,
  type PermissaoCodigo,
} from "@/lib/auth/permissions";

export async function requirePermission(
  permissao: PermissaoCodigo,
) {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      permissao,
    );

  if (!autorizado) {
    redirect("/mobile/sem-acesso");
  }

  return usuario;
}