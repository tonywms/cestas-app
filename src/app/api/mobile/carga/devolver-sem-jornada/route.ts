import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

function mensagemAmigavel(message: string) {
  const texto = message.toLowerCase();

  if (texto.includes("rota planejada") || texto.includes("rota") && texto.includes("andamento")) {
    return "Existe uma rota planejada ou em andamento. Cancele a rota ou conclua a jornada antes de devolver a carga.";
  }

  if (texto.includes("vinculada a uma rota")) {
    return "Esta carga já foi vinculada a uma rota e deve seguir o fluxo normal de encerramento.";
  }

  if (texto.includes("movimentação operacional") || texto.includes("registro de entrega")) {
    return "Esta carga já iniciou sua operação e não pode ser devolvida por este fluxo.";
  }

  if (texto.includes("motivo")) {
    return "Informe um motivo válido para a devolução da carga.";
  }

  return message || "Não foi possível devolver a carga.";
}

export async function POST(request: NextRequest) {
  const usuario = await getCurrentUserProfile();

  if (!usuario || !usuario.ativo) {
    return NextResponse.json(
      {
        ok: false,
        message: "Sessão inválida. Entre novamente no sistema.",
      },
      { status: 401 },
    );
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CARGA_RETORNAR,
    );

  if (!autorizado) {
    return NextResponse.json(
      {
        ok: false,
        message: "Você não possui permissão para devolver cargas.",
      },
      { status: 403 },
    );
  }

  let body: {
    cargaId?: unknown;
    motivo?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Dados da devolução inválidos.",
      },
      { status: 400 },
    );
  }

  const cargaId = Number(body.cargaId);
  const motivo = String(body.motivo ?? "").trim();

  if (!Number.isInteger(cargaId) || cargaId <= 0) {
    return NextResponse.json(
      {
        ok: false,
        message: "Carga inválida.",
      },
      { status: 400 },
    );
  }

  if (motivo.length < 8 || motivo.length > 500) {
    return NextResponse.json(
      {
        ok: false,
        message: "Informe um motivo entre 8 e 500 caracteres.",
      },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "devolver_carga_sem_jornada",
    {
      p_empresa_id: usuario.empresa.id,
      p_carga_id: cargaId,
      p_motivo: motivo,
    },
  );

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        message: mensagemAmigavel(error.message),
      },
      { status: 409 },
    );
  }

  const resultado = Array.isArray(data) ? data[0] : data;

  return NextResponse.json({
    ok: true,
    codigo: String(resultado?.codigo ?? ""),
    status: String(resultado?.status ?? "CANCELADA"),
    totalDevolvido: Number(resultado?.total_devolvido ?? 0),
  });
}
