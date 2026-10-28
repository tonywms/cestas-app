import { headers } from "next/headers";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

type AdminClient =
  ReturnType<
    typeof createAdminClient
  >;

type AuditParams = {
  admin:
    AdminClient;
  empresaId:
    string;
  usuarioId:
    string;
  acao:
    string;
  entidadeId?:
    string | null;
  dados?:
    Record<
      string,
      unknown
    >;
};

function limitar(
  valor:
    string | null,
  tamanho:
    number,
) {
  if (!valor) {
    return null;
  }

  return valor.slice(
    0,
    tamanho,
  );
}

export async function registrarAuditoriaPlataforma({
  admin,
  empresaId,
  usuarioId,
  acao,
  entidadeId = null,
  dados = {},
}: AuditParams) {
  try {
    const requestHeaders =
      await headers();

    const forwardedFor =
      requestHeaders.get(
        "x-forwarded-for",
      );

    const ip =
      forwardedFor
        ?.split(",")[0]
        ?.trim() ||
      requestHeaders.get(
        "x-real-ip",
      ) ||
      null;

    const userAgent =
      requestHeaders.get(
        "user-agent",
      );

    const {
      error,
    } =
      await admin
        .from(
          "auditoria_eventos",
        )
        .insert({
          empresa_id:
            empresaId,

          usuario_id:
            usuarioId,

          entidade:
            "PLATAFORMA_EMPRESA",

          entidade_id:
            entidadeId,

          acao,

          dados: {
            ...dados,

            seguranca: {
              mfa:
                "aal2",

              ip:
                limitar(
                  ip,
                  100,
                ),

              user_agent:
                limitar(
                  userAgent,
                  500,
                ),
            },
          },
        });

    if (error) {
      console.error(
        "Falha ao registrar auditoria da plataforma:",
        error,
      );
    }
  } catch (
    error
  ) {
    /*
     * Auditoria nunca deve derrubar a operação já concluída,
     * mas o erro fica visível no log do servidor.
     */
    console.error(
      "Erro inesperado na auditoria da plataforma:",
      error,
    );
  }
}
