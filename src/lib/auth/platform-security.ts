import { connection } from "next/server";
import { redirect } from "next/navigation";

import {
  getCurrentUserProfile,
  type CurrentUserProfile,
} from "@/lib/auth/get-current-user";

import {
  createClient,
} from "@/lib/supabase/server";

type PlatformAal =
  | "aal1"
  | "aal2"
  | null;

function normalizeAal(
  value:
    unknown,
): PlatformAal {
  return (
    value ===
      "aal1" ||
    value ===
      "aal2"
  )
    ? value
    : null;
}

export type PlatformSecurityStatus = {
  usuario:
    CurrentUserProfile | null;
  autenticado:
    boolean;
  platformAdmin:
    boolean;
  currentLevel:
    PlatformAal;
  nextLevel:
    PlatformAal;
  verifiedFactors:
    number;
  hasVerifiedFactor:
    boolean;
  pronto:
    boolean;
};

export async function getPlatformSecurityStatus():
  Promise<PlatformSecurityStatus> {
  await connection();

  const usuario =
    await getCurrentUserProfile();

  if (
    !usuario ||
    !usuario.isPlatformAdmin
  ) {
    return {
      usuario:
        usuario ?? null,
      autenticado:
        Boolean(usuario),
      platformAdmin:
        false,
      currentLevel:
        null,
      nextLevel:
        null,
      verifiedFactors:
        0,
      hasVerifiedFactor:
        false,
      pronto:
        false,
    };
  }

  const supabase =
    await createClient();

  /*
   * getUser() consulta o Auth server e valida a sessão atual.
   * Não confiamos apenas em dados enviados pelo navegador.
   */
  const {
    data:
      userData,
    error:
      userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !userData.user ||
    userData.user.id !==
      usuario.id
  ) {
    return {
      usuario:
        null,
      autenticado:
        false,
      platformAdmin:
        false,
      currentLevel:
        null,
      nextLevel:
        null,
      verifiedFactors:
        0,
      hasVerifiedFactor:
        false,
      pronto:
        false,
    };
  }

  const [
    aalResult,
    factorsResult,
  ] =
    await Promise.all([
      supabase.auth.mfa
        .getAuthenticatorAssuranceLevel(),

      supabase.auth.mfa
        .listFactors(),
    ]);

  const currentLevel =
    normalizeAal(
      aalResult.data
        ?.currentLevel,
    );

  const nextLevel =
    normalizeAal(
      aalResult.data
        ?.nextLevel,
    );

  const totp =
    factorsResult.data
      ?.totp ??
    [];

  const phone =
    factorsResult.data
      ?.phone ??
    [];

  const verifiedFactors =
    [
      ...totp,
      ...phone,
    ].filter(
      (
        factor,
      ) =>
        factor.status ===
        "verified",
    ).length;

  const hasVerifiedFactor =
    verifiedFactors >
    0;

  return {
    usuario,
    autenticado:
      true,
    platformAdmin:
      true,
    currentLevel,
    nextLevel,
    verifiedFactors,
    hasVerifiedFactor,
    pronto:
      hasVerifiedFactor &&
      currentLevel ===
        "aal2",
  };
}

export async function requirePlatformAdminAal2() {
  const status =
    await getPlatformSecurityStatus();

  if (
    !status.usuario ||
    !status.platformAdmin
  ) {
    redirect(
      "/admin",
    );
  }

  if (
    !status.hasVerifiedFactor ||
    status.currentLevel !==
      "aal2"
  ) {
    redirect(
      "/admin/plataforma/seguranca",
    );
  }

  return status.usuario;
}

export async function getPlatformActionContext() {
  const status =
    await getPlatformSecurityStatus();

  if (
    !status.usuario ||
    !status.platformAdmin
  ) {
    return {
      ok:
        false as const,
      usuario:
        null,
      message:
        "Acesso restrito ao Super Admin da plataforma.",
    };
  }

  if (
    !status.hasVerifiedFactor
  ) {
    return {
      ok:
        false as const,
      usuario:
        status.usuario,
      message:
        "MFA obrigatório. Configure o autenticador antes de administrar a plataforma.",
    };
  }

  if (
    status.currentLevel !==
    "aal2"
  ) {
    return {
      ok:
        false as const,
      usuario:
        status.usuario,
      message:
        "Confirme o código MFA novamente antes desta operação crítica.",
    };
  }

  return {
    ok:
      true as const,
    usuario:
      status.usuario,
    message:
      null,
  };
}
