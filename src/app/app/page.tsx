export const instant = false;

import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";

export default async function AppRouterPage() {
  const usuario = await getCurrentUserProfile();

  if (!usuario || !usuario.ativo) {
    redirect("/");
  }

  if (usuario.perfilCodigo === "ENTREGADOR") {
    redirect("/mobile");
  }

  redirect("/admin");
}


