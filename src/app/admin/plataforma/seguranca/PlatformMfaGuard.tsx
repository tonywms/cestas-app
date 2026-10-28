"use client";

import Link from "next/link";

import {
  CheckCircle2,
  Copy,
  KeyRound,
  LogOut,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

type ClientAal =
  | "aal1"
  | "aal2"
  | null;

function normalizeAal(
  value:
    unknown,
): ClientAal {
  return (
    value ===
      "aal1" ||
    value ===
      "aal2"
  )
    ? value
    : null;
}

type Factor = {
  id:
    string;
  status:
    string;
  friendly_name?:
    string | null;
};

type Enrollment = {
  factorId:
    string;
  qrCode:
    string;
  secret:
    string;
};

type Props = {
  initialCurrentLevel:
    "aal1" |
    "aal2" |
    null;
  initialVerifiedFactors:
    number;
};

export default function PlatformMfaGuard({
  initialCurrentLevel,
  initialVerifiedFactors,
}: Props) {
  const supabase =
    useMemo(
      () =>
        createClient(),
      [],
    );

  const [
    currentLevel,
    setCurrentLevel,
  ] =
    useState<
      ClientAal
    >(
      initialCurrentLevel,
    );

  const [
    factors,
    setFactors,
  ] =
    useState<
      Factor[]
    >(
      [],
    );

  const [
    enrollment,
    setEnrollment,
  ] =
    useState<
      Enrollment |
      null
    >(
      null,
    );

  const [
    code,
    setCode,
  ] =
    useState(
      "",
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      false,
    );

  const [
    message,
    setMessage,
  ] =
    useState<
      {
        type:
          "success" |
          "error";
        text:
          string;
      } |
      null
    >(
      null,
    );

  const verifiedFactors =
    factors.filter(
      (
        factor,
      ) =>
        factor.status ===
        "verified",
    );

  const hasVerifiedFactor =
    verifiedFactors.length >
      0 ||
    initialVerifiedFactors >
      0;

  async function refreshSecurity() {
    const [
      factorsResult,
      aalResult,
    ] =
      await Promise.all([
        supabase.auth.mfa
          .listFactors(),

        supabase.auth.mfa
          .getAuthenticatorAssuranceLevel(),
      ]);

    if (
      factorsResult.error
    ) {
      setMessage({
        type:
          "error",
        text:
          factorsResult.error.message,
      });

      return;
    }

    const lista = [
      ...(
        factorsResult.data
          ?.totp ??
        []
      ),

      ...(
        factorsResult.data
          ?.phone ??
        []
      ),
    ].map(
      (
        factor,
      ) => ({
        id:
          factor.id,
        status:
          factor.status,
        friendly_name:
          factor.friendly_name,
      }),
    );

    setFactors(
      lista,
    );

    setCurrentLevel(
      normalizeAal(
        aalResult.data
          ?.currentLevel,
      ),
    );
  }

  useEffect(
    () => {
      void refreshSecurity();
    },
    [],
  );

  async function iniciarCadastro() {
    setLoading(
      true,
    );

    setMessage(
      null,
    );

    try {
      const list =
        await supabase.auth.mfa
          .listFactors();

      if (
        list.error
      ) {
        throw list.error;
      }

      /*
       * Limpa fatores TOTP não verificados abandonados.
       * Um fator verificado nunca é removido automaticamente.
       */
      for (
        const factor of
          list.data
            ?.totp ??
          []
      ) {
        if (
          factor.status !==
          "verified"
        ) {
          await supabase.auth.mfa
            .unenroll({
              factorId:
                factor.id,
            });
        }
      }

      const {
        data,
        error,
      } =
        await supabase.auth.mfa
          .enroll({
            factorType:
              "totp",

            friendlyName:
              `Cestas APP Plataforma ${new Date()
                .toISOString()
                .replace(
                  /[:.]/g,
                  "-",
                )}-${crypto.randomUUID()
                  .slice(
                    0,
                    8,
                  )}`,
          });

      if (
        error ||
        !data?.totp
      ) {
        throw (
          error ??
          new Error(
            "Não foi possível iniciar o MFA.",
          )
        );
      }

      setEnrollment({
        factorId:
          data.id,

        qrCode:
          data.totp
            .qr_code,

        secret:
          data.totp
            .secret,
      });

      setCode(
        "",
      );

      setMessage({
        type:
          "success",
        text:
          "Leia o QR Code no seu aplicativo autenticador e informe o código de 6 dígitos.",
      });
    } catch (
      error
    ) {
      const mensagem =
        error instanceof
          Error
          ? error.message
          : "Falha ao configurar MFA.";

      setMessage({
        type:
          "error",

        text:
          mensagem.includes(
            "friendly name",
          )
            ? "Existe uma tentativa anterior de MFA com esse identificador. Atualize a página e tente novamente; agora cada tentativa recebe um identificador único."
            : mensagem,
      });
    } finally {
      setLoading(
        false,
      );
    }
  }

  async function confirmarMfa() {
    const codigo =
      code
        .replace(
          /\D/g,
          "",
        )
        .slice(
          0,
          6,
        );

    if (
      codigo.length !==
      6
    ) {
      setMessage({
        type:
          "error",
        text:
          "Informe os 6 dígitos do autenticador.",
      });

      return;
    }

    setLoading(
      true,
    );

    setMessage(
      null,
    );

    try {
      let factorId =
        enrollment
          ?.factorId ??
        null;

      if (
        !factorId
      ) {
        const list =
          await supabase.auth.mfa
            .listFactors();

        if (
          list.error
        ) {
          throw list.error;
        }

        const verified =
          (
            list.data
              ?.totp ??
            []
          ).find(
            (
              factor,
            ) =>
              factor.status ===
              "verified",
          );

        factorId =
          verified?.id ??
          null;
      }

      if (
        !factorId
      ) {
        throw new Error(
          "Nenhum autenticador verificado foi encontrado.",
        );
      }

      const {
        error,
      } =
        await supabase.auth.mfa
          .challengeAndVerify({
            factorId,
            code:
              codigo,
          });

      if (error) {
        throw error;
      }

      const aal =
        await supabase.auth.mfa
          .getAuthenticatorAssuranceLevel();

      if (
        aal.error ||
        aal.data
          ?.currentLevel !==
          "aal2"
      ) {
        throw new Error(
          "O segundo fator foi confirmado, mas a sessão ainda não atingiu AAL2.",
        );
      }

      setCurrentLevel(
        "aal2",
      );

      setMessage({
        type:
          "success",
        text:
          "MFA confirmado. Sua sessão administrativa agora está em AAL2.",
      });

      window.setTimeout(
        () => {
          window.location.replace(
            "/admin/plataforma",
          );
        },
        650,
      );
    } catch (
      error
    ) {
      setMessage({
        type:
          "error",

        text:
          error instanceof
            Error
            ? error.message
            : "Código MFA inválido.",
      });
    } finally {
      setLoading(
        false,
      );
    }
  }

  async function encerrarOutrasSessoes() {
    setLoading(
      true,
    );

    setMessage(
      null,
    );

    try {
      const {
        error,
      } =
        await supabase.auth
          .signOut({
            scope:
              "others",
          });

      if (error) {
        throw error;
      }

      setMessage({
        type:
          "success",
        text:
          "Outras sessões desta conta foram encerradas.",
      });
    } catch (
      error
    ) {
      setMessage({
        type:
          "error",

        text:
          error instanceof
            Error
            ? error.message
            : "Não foi possível encerrar as outras sessões.",
      });
    } finally {
      setLoading(
        false,
      );
    }
  }

  async function copiarSecret() {
    if (
      !enrollment
        ?.secret
    ) {
      return;
    }

    await navigator.clipboard
      .writeText(
        enrollment.secret,
      );

    setMessage({
      type:
        "success",
      text:
        "Chave copiada.",
    });
  }

  if (
    currentLevel ===
    "aal2" &&
    hasVerifiedFactor
  ) {
    return (
      <div className="space-y-4">
        <div className="rounded-[26px] border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-emerald-600 text-white">
              <ShieldCheck
                size={23}
              />
            </div>

            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-emerald-700">
                AAL2 confirmado
              </p>

              <h2 className="mt-1 text-[22px] font-black text-emerald-950">
                Sessão administrativa protegida
              </h2>

              <p className="mt-2 text-[13px] leading-6 text-emerald-800">
                Senha + segundo fator foram validados. A Plataforma pode ser acessada nesta sessão.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Link
              href="/admin/plataforma"
              className="flex h-[52px] items-center justify-center rounded-[16px] bg-[#176f3c] text-[13px] font-black text-white"
            >
              Entrar na Plataforma
            </Link>

            <button
              type="button"
              onClick={
                encerrarOutrasSessoes
              }
              disabled={
                loading
              }
              className="flex h-[52px] items-center justify-center gap-2 rounded-[16px] border border-emerald-200 bg-white text-[12px] font-extrabold text-emerald-800 disabled:opacity-50"
            >
              <LogOut
                size={17}
              />
              Encerrar outras sessões
            </button>
          </div>
        </div>

        {message ? (
          <Mensagem
            message={
              message
            }
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!hasVerifiedFactor &&
      !enrollment ? (
        <div className="card-premium rounded-[28px] p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[#fff7e3] text-[#a66a08]">
              <KeyRound
                size={22}
              />
            </div>

            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#b07a12]">
                Primeiro acesso seguro
              </p>

              <h2 className="mt-1 text-[22px] font-black">
                Ative o autenticador
              </h2>

              <p className="mt-2 text-[13px] leading-6 text-slate-500">
                Depois da senha, a Plataforma exigirá um código temporário do seu autenticador. Sem esse código, a rota administrativa não abre.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              iniciarCadastro
            }
            disabled={
              loading
            }
            className="mt-6 flex h-[54px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#176f3c] text-[13px] font-black text-white disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw
                size={17}
                className="animate-spin"
              />
            ) : (
              <Smartphone
                size={17}
              />
            )}

            Configurar MFA
          </button>
        </div>
      ) : null}

      {enrollment ? (
        <div className="card-premium rounded-[28px] p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-emerald-50 text-emerald-700">
              <QrCode
                size={22}
              />
            </div>

            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#b07a12]">
                TOTP
              </p>

              <h2 className="mt-1 text-[22px] font-black">
                Leia o QR Code
              </h2>

              <p className="mt-2 text-[13px] leading-6 text-slate-500">
                Use um aplicativo autenticador. O código muda automaticamente e não é sua senha.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-[240px_1fr]">
            <div className="flex items-center justify-center rounded-[22px] border border-slate-200 bg-white p-4">
              <img
                src={
                  enrollment.qrCode
                }
                alt="QR Code para configurar MFA"
                className="h-[205px] w-[205px]"
              />
            </div>

            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                Configuração manual
              </p>

              <div className="mt-2 flex items-center gap-2 rounded-[16px] bg-slate-50 p-3">
                <code className="min-w-0 flex-1 break-all text-[12px] font-bold text-slate-700">
                  {
                    enrollment.secret
                  }
                </code>

                <button
                  type="button"
                  onClick={
                    copiarSecret
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white text-emerald-700"
                >
                  <Copy
                    size={16}
                  />
                </button>
              </div>

              <CodigoForm
                code={
                  code
                }
                setCode={
                  setCode
                }
                loading={
                  loading
                }
                onConfirm={
                  confirmarMfa
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      {hasVerifiedFactor &&
      currentLevel !==
        "aal2" ? (
        <div className="card-premium rounded-[28px] p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[#fff7e3] text-[#a66a08]">
              <ShieldCheck
                size={22}
              />
            </div>

            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#b07a12]">
                Segundo fator
              </p>

              <h2 className="mt-1 text-[22px] font-black">
                Confirme sua identidade
              </h2>

              <p className="mt-2 text-[13px] leading-6 text-slate-500">
                A conta possui MFA cadastrado, mas esta sessão ainda está em AAL1. Digite o código atual do autenticador.
              </p>
            </div>
          </div>

          <CodigoForm
            code={
              code
            }
            setCode={
              setCode
            }
            loading={
              loading
            }
            onConfirm={
              confirmarMfa
            }
          />
        </div>
      ) : null}

      {message ? (
        <Mensagem
          message={
            message
          }
        />
      ) : null}
    </div>
  );
}

function CodigoForm({
  code,
  setCode,
  loading,
  onConfirm,
}: {
  code:
    string;
  setCode:
    (
      value:
        string,
    ) =>
      void;
  loading:
    boolean;
  onConfirm:
    () =>
      Promise<void>;
}) {
  return (
    <div className="mt-5">
      <label className="text-[11px] font-extrabold text-slate-600">
        Código do autenticador
      </label>

      <input
        value={
          code
        }
        onChange={(
          event,
        ) =>
          setCode(
            event.target.value
              .replace(
                /\D/g,
                "",
              )
              .slice(
                0,
                6,
              ),
          )
        }
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="000000"
        className="mt-2 h-[60px] w-full rounded-[18px] border border-slate-200 bg-white px-4 text-center text-[26px] font-black tracking-[0.32em] outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
      />

      <button
        type="button"
        onClick={() =>
          void onConfirm()
        }
        disabled={
          loading ||
          code.length !==
            6
        }
        className="mt-3 flex h-[54px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#176f3c] text-[13px] font-black text-white disabled:opacity-50"
      >
        {loading ? (
          <RefreshCw
            size={17}
            className="animate-spin"
          />
        ) : (
          <ShieldCheck
            size={17}
          />
        )}

        Confirmar MFA
      </button>
    </div>
  );
}

function Mensagem({
  message,
}: {
  message: {
    type:
      "success" |
      "error";
    text:
      string;
  };
}) {
  return (
    <div className={`flex items-start gap-3 rounded-[20px] border p-4 ${
      message.type ===
      "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-red-200 bg-red-50 text-red-700"
    }`}>
      {message.type ===
      "success" ? (
        <CheckCircle2
          size={19}
          className="mt-0.5 shrink-0"
        />
      ) : (
        <XCircle
          size={19}
          className="mt-0.5 shrink-0"
        />
      )}

      <p className="text-[12px] font-bold leading-5">
        {
          message.text
        }
      </p>
    </div>
  );
}
