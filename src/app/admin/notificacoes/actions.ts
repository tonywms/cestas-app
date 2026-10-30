"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

type NotificationStateStatus =
  | "VISTO"
  | "RESOLVIDO";

type NotificationStatePayload = {
  empresa_id: string;
  usuario_id: string;
  alert_key: string;
  status: NotificationStateStatus;
  visto_at: string;
  resolvido_at: string | null;
  updated_at: string;
};

function lerChave(
  formData: FormData,
) {
  const chave =
    String(
      formData.get(
        "alert_key",
      ) ?? "",
    ).trim();

  if (
    !chave ||
    chave.length > 180
  ) {
    throw new Error(
      "Alerta inválido.",
    );
  }

  return chave;
}

async function contexto() {
  const usuario =
    await getCurrentUserProfile();

  if (
    !usuario ||
    !usuario.ativo ||
    usuario.perfilCodigo ===
      "ENTREGADOR"
  ) {
    throw new Error(
      "Usuário sem acesso à Central de Notificações.",
    );
  }

  const supabase =
    await createClient();

  return {
    usuario,
    supabase,
  };
}

async function salvarEstado(
  alertKey: string,
  status:
    NotificationStateStatus,
) {
  const {
    usuario,
    supabase,
  } =
    await contexto();

  const agora =
    new Date().toISOString();

  const payload:
    NotificationStatePayload = {
      empresa_id:
        usuario.empresa.id,
      usuario_id:
        usuario.id,
      alert_key:
        alertKey,
      status,
      visto_at:
        agora,
      resolvido_at:
        status === "RESOLVIDO"
          ? agora
          : null,
      updated_at:
        agora,
    };

  const {
    error,
  } =
    await supabase
      .from(
        "notification_user_state",
      )
      .upsert(
        payload,
        {
          onConflict:
            "empresa_id,usuario_id,alert_key",
        },
      );

  if (error) {
    console.error(
      "Erro ao salvar estado da notificação:",
      error,
    );

    throw new Error(
      "Não foi possível atualizar a notificação.",
    );
  }

  revalidatePath(
    "/admin/notificacoes",
  );
}

export async function marcarNotificacaoVista(
  formData: FormData,
) {
  const alertKey =
    lerChave(
      formData,
    );

  await salvarEstado(
    alertKey,
    "VISTO",
  );
}

export async function marcarNotificacaoResolvida(
  formData: FormData,
) {
  const alertKey =
    lerChave(
      formData,
    );

  await salvarEstado(
    alertKey,
    "RESOLVIDO",
  );
}

export async function reabrirNotificacao(
  formData: FormData,
) {
  const alertKey =
    lerChave(
      formData,
    );

  await salvarEstado(
    alertKey,
    "VISTO",
  );
}

export async function abrirNotificacao(
  formData: FormData,
) {
  const alertKey =
    lerChave(
      formData,
    );

  const href =
    String(
      formData.get(
        "href",
      ) ?? "",
    ).trim();

  if (
    !href.startsWith(
      "/admin/",
    )
  ) {
    throw new Error(
      "Destino de notificação inválido.",
    );
  }

  const {
    usuario,
    supabase,
  } =
    await contexto();

  const {
    data: atual,
  } =
    await supabase
      .from(
        "notification_user_state",
      )
      .select(
        "status",
      )
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "usuario_id",
        usuario.id,
      )
      .eq(
        "alert_key",
        alertKey,
      )
      .maybeSingle();

  if (
    atual?.status !==
      "RESOLVIDO"
  ) {
    const agora =
      new Date().toISOString();

    const payload:
      NotificationStatePayload = {
        empresa_id:
          usuario.empresa.id,
        usuario_id:
          usuario.id,
        alert_key:
          alertKey,
        status:
          "VISTO",
        visto_at:
          agora,
        resolvido_at:
          null,
        updated_at:
          agora,
      };

    const {
      error,
    } =
      await supabase
        .from(
          "notification_user_state",
        )
        .upsert(
          payload,
          {
            onConflict:
              "empresa_id,usuario_id,alert_key",
          },
        );

    if (error) {
      console.error(
        "Erro ao marcar notificação como vista:",
        error,
      );
    }
  }

  revalidatePath(
    "/admin/notificacoes",
  );

  redirect(
    href,
  );
}
