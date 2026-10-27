export const instant = false;

import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";

export default async function AppRouterPage() {
  const usuario =
    await getCurrentUserProfile();

  if (
    !usuario ||
    !usuario.ativo
  ) {
    redirect("/");
  }

  /*
   * Entregador sempre entra
   * na experiencia mobile.
   */
  if (
    usuario.perfilCodigo ===
    "ENTREGADOR"
  ) {
    redirect("/mobile");
  }

  /*
   * Administrador, gestor e estoque
   * entram no administrativo.
   *
   * SUPER_ADMIN tambem entra aqui
   * por enquanto.
   */
  redirect("/admin");
}