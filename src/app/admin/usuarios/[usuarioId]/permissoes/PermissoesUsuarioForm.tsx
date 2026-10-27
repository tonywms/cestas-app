"use client";

import {
  CheckCircle2,
  Minus,
  Save,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  salvarPermissoesUsuario,
} from "./actions";

const initialState = {
  success: false,
  message: "",
};

export type PermissaoUsuarioTela = {
  id: string;
  codigo: string;
  nome: string;
  modulo: string;

  perfilPermitido: boolean;

  override:
    | "HERDAR"
    | "LIBERAR"
    | "BLOQUEAR";

  bloqueado: boolean;

  motivoBloqueio:
    | string
    | null;
};

type Props = {
  usuarioId: string;
  usuarioNome: string;

  permissoes:
    PermissaoUsuarioTela[];
};

export default function PermissoesUsuarioForm({
  usuarioId,
  usuarioNome,
  permissoes,
}: Props) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    salvarPermissoesUsuario,
    initialState,
  );

  const [
    valores,
    setValores,
  ] = useState<
    Record<
      string,
      "HERDAR" |
      "LIBERAR" |
      "BLOQUEAR"
    >
  >(
    Object.fromEntries(
      permissoes.map(
        (item) => [
          item.codigo,
          item.override,
        ],
      ),
    ),
  );

  const [
    confirmar,
    setConfirmar,
  ] = useState(false);

  const [
    resultado,
    setResultado,
  ] = useState(false);

  useEffect(() => {
    if (!state.message) {
      return;
    }

    setConfirmar(false);
    setResultado(true);
  }, [state]);

  const overrides =
    Object.values(
      valores,
    ).filter(
      (valor) =>
        valor !== "HERDAR",
    ).length;

  return (
    <>
      <form
        action={formAction}
        className="space-y-4"
      >
        <input
          type="hidden"
          name="usuario_id"
          value={usuarioId}
        />

        {permissoes.map(
          (permissao) => {
            const valor =
              valores[
                permissao.codigo
              ];

            const efetiva =
              permissao.bloqueado
                ? false
                : valor ===
                    "LIBERAR"
                  ? true
                  : valor ===
                      "BLOQUEAR"
                    ? false
                    : permissao.perfilPermitido;

            return (
              <div
                key={
                  permissao.id
                }
                className="rounded-[22px] border border-slate-100 bg-white p-5 shadow-sm"
              >
                <input
                  type="hidden"
                  name={`permissao_${permissao.codigo}`}
                  value={
                    permissao.bloqueado
                      ? "HERDAR"
                      : valor
                  }
                />

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#18834a]">
                      {
                        permissao.modulo
                      }
                    </p>

                    <h3 className="mt-1 text-[13px] font-black">
                      {
                        permissao.nome
                      }
                    </h3>

                    <p className="mt-1 text-[9px] font-bold text-slate-400">
                      {
                        permissao.codigo
                      }
                    </p>
                  </div>

                  <div
                    className={`rounded-full px-3 py-1.5 text-[9px] font-black ${
                      efetiva
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {efetiva
                      ? "EFETIVA: SIM"
                      : "EFETIVA: NÃO"}
                  </div>
                </div>

                {permissao.bloqueado ? (
                  <div className="mt-4 rounded-[16px] bg-amber-50 px-4 py-3 text-[10px] font-bold text-amber-700">
                    {
                      permissao.motivoBloqueio
                    }
                  </div>
                ) : (
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <Opcao
                      titulo="Herdar perfil"
                      ativo={
                        valor ===
                        "HERDAR"
                      }
                      onClick={() =>
                        setValores(
                          (atual) => ({
                            ...atual,
                            [permissao.codigo]:
                              "HERDAR",
                          }),
                        )
                      }
                    />

                    <Opcao
                      titulo="Liberar"
                      ativo={
                        valor ===
                        "LIBERAR"
                      }
                      positivo
                      onClick={() =>
                        setValores(
                          (atual) => ({
                            ...atual,
                            [permissao.codigo]:
                              "LIBERAR",
                          }),
                        )
                      }
                    />

                    <Opcao
                      titulo="Bloquear"
                      ativo={
                        valor ===
                        "BLOQUEAR"
                      }
                      negativo
                      onClick={() =>
                        setValores(
                          (atual) => ({
                            ...atual,
                            [permissao.codigo]:
                              "BLOQUEAR",
                          }),
                        )
                      }
                    />
                  </div>
                )}
              </div>
            );
          },
        )}

        <div className="sticky bottom-4 z-20 rounded-[24px] border border-white bg-white/95 p-4 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div className="hidden md:block">
              <p className="text-xs font-black">
                {usuarioNome}
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                {overrides} exceções individuais configuradas.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setConfirmar(
                  true,
                )
              }
              className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#16753f] px-6 text-xs font-black text-white md:w-auto"
            >
              <Save size={17} />

              Salvar permissões
            </button>
          </div>
        </div>

        {confirmar && (
          <Modal>
            <div className="w-full max-w-[430px] rounded-[28px] bg-white p-7">
              <ShieldCheck
                size={29}
                className="text-emerald-700"
              />

              <h3 className="mt-4 text-xl font-black">
                Confirmar alterações?
              </h3>

              <p className="mt-3 text-xs leading-6 text-slate-500">
                Você está alterando permissões individuais de{" "}
                <strong>
                  {usuarioNome}
                </strong>
                .
              </p>

              <p className="mt-4 rounded-[16px] bg-slate-50 px-4 py-3 text-xs font-bold">
                {overrides} exceções individuais serão mantidas.
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setConfirmar(
                      false,
                    )
                  }
                  className="h-[48px] flex-1 rounded-[15px] border border-slate-200 text-xs font-black"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={pending}
                  className="h-[48px] flex-1 rounded-[15px] bg-[#16753f] text-xs font-black text-white"
                >
                  {pending
                    ? "Salvando..."
                    : "Confirmar"}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </form>

      {resultado &&
        state.message && (
          <Modal>
            <div className="w-full max-w-[400px] rounded-[28px] bg-white p-7 text-center">
              {state.success ? (
                <CheckCircle2
                  size={38}
                  className="mx-auto text-emerald-600"
                />
              ) : (
                <XCircle
                  size={38}
                  className="mx-auto text-red-600"
                />
              )}

              <h3 className="mt-4 text-lg font-black">
                {state.success
                  ? "Permissões atualizadas"
                  : "Erro ao salvar"}
              </h3>

              <p className="mt-3 text-xs text-slate-500">
                {state.message}
              </p>

              <button
                type="button"
                onClick={() =>
                  setResultado(
                    false,
                  )
                }
                className="mt-6 h-[48px] w-full rounded-[15px] bg-[#16753f] text-xs font-black text-white"
              >
                Entendi
              </button>
            </div>
          </Modal>
        )}
    </>
  );
}

function Opcao({
  titulo,
  ativo,
  positivo = false,
  negativo = false,
  onClick,
}: {
  titulo: string;
  ativo: boolean;
  positivo?: boolean;
  negativo?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-[42px] rounded-[13px] border text-[10px] font-black transition ${
        ativo
          ? positivo
            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
            : negativo
              ? "border-red-400 bg-red-50 text-red-700"
              : "border-slate-400 bg-slate-100 text-slate-700"
          : "border-slate-200 bg-white text-slate-400"
      }`}
    >
      {titulo}
    </button>
  );
}

function Modal({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[5px]">
      {children}
    </div>
  );
}