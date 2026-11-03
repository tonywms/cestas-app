import { NextResponse } from "next/server";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

const DIAS_RETENCAO = 90;

export async function POST() {
  const usuario = await getCurrentUserProfile();

  if (
    !usuario ||
    !usuario.ativo ||
    usuario.perfilCodigo === "ENTREGADOR"
  ) {
    return NextResponse.json(
      { ok: false, erro: "Não autorizado." },
      { status: 403 },
    );
  }

  const limite = new Date();
  limite.setUTCDate(limite.getUTCDate() - DIAS_RETENCAO);

  const supabase = await createClient();

  const { error } = await supabase
    .from("notification_user_state")
    .delete()
    .eq("empresa_id", usuario.empresa.id)
    .eq("usuario_id", usuario.id)
    .eq("status", "RESOLVIDO")
    .lt("resolvido_at", limite.toISOString());

  if (error) {
    console.error(
      "Erro ao aplicar retenção das notificações resolvidas:",
      error,
    );

    return NextResponse.json(
      { ok: false, erro: "Falha ao aplicar retenção." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    diasRetencao: DIAS_RETENCAO,
  });
}
