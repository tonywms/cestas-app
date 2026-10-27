"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  Save,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  salvarPermissoesEntregador,
} from "./actions";

const initialPermissoesState = {
  success: false,
  message: "",
};

export type PermissaoTela = {
  id: string;
  codigo: string;
  nome: string;
  modulo: string;
  descricao: string | null;
  sensivel: boolean;
  permitido: boolean;
  bloqueado: boolean;
  motivoBloqueio: string | null;
};

type Props = {
  empresaNome: string;
  modoControleCarga: "QUANTIDADE" | "VOLUME";
  permissoes: PermissaoTela[];
};

export default function PermissoesEntregadorForm({
  empresaNome,
  modoControleCarga,
  permissoes,
}: Props) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    salvarPermissoesEntregador,
    initialPermissoesState,
  );

  const [selecionadas, setSelecionadas] =
    useState<Set<string>>(
      () =>
        new Set(
          permissoes
            .filter(
              (item) =>
                item.permitido &&
                !item.bloqueado,
            )
            .map(
              (item) => item.codigo,
            ),
        ),
    );

  const [
    modalConfirmacao,
    setModalConfirmacao,
  ] = useState(false);

  const [
    modalResultado,
    setModalResultado,
  ] = useState(false);

  useEffect(() => {
    if (!state.message) {
      return;
    }

    setModalConfirmacao(false);
    setModalResultado(true);
  }, [state]);

  const grupos = useMemo(() => {
    const resultado =
      new Map<string, PermissaoTela[]>();

    for (const permissao of permissoes) {
      if (
        !resultado.has(
          permissao.modulo,
        )
      ) {
        resultado.set(
          permissao.modulo,
          [],
        );
      }

      resultado
        .get(permissao.modulo)!
        .push(permissao);
    }

    return Array.from(
      resultado.entries(),
    );
  }, [permissoes]);

  function toggle(
    permissao: PermissaoTela,
  ) {
    if (permissao.bloqueado) {
      return;
    }

    setSelecionadas((atual) => {
      const novo = new Set(atual);

      if (
        novo.has(
          permissao.codigo,
        )
      ) {
        novo.delete(
          permissao.codigo,
        );
      } else {
        novo.add(
          permissao.codigo,
        );
      }

      return novo;
    });
  }

  const quantidadeAtiva =
    selecionadas.size;

  const quantidadeBloqueada =
    permissoes.filter(
      (item) => item.bloqueado,
    ).length;

  const quantidadeSensivel =
    permissoes.filter(
      (item) =>
        selecionadas.has(
          item.codigo,
        ) &&
        item.sensivel &&
        !item.bloqueado,
    ).length;

  return (
    <>
      <form
        action={formAction}
        className="space-y-5"
      >
        <section className="grid gap-3 sm:grid-cols-3">
          <Resumo
            titulo="Perfil"
            valor="ENTREGADOR"
            detalhe="Permissão padrão"
          />

          <Resumo
            titulo="Ativas"
            valor={String(
              quantidadeAtiva,
            )}
            detalhe="Funções liberadas"
          />

          <Resumo
            titulo="Bloqueadas"
            valor={String(
              quantidadeBloqueada,
            )}
            detalhe="Regra superior"
          />
        </section>

        <section className="flex items-start gap-3 rounded-[22px] border border-emerald-100 bg-[#effaf3] px-5 py-4">
          <ShieldCheck
            size={19}
            className="mt-0.5 shrink-0 text-[#14743d]"
          />

          <div>
            <p className="text-xs font-black text-[#146b3b]">
              Regras exclusivas de{" "}
              {empresaNome}
            </p>

            <p className="mt-1 text-[11px] leading-5 text-[#548166]">
              Alterações feitas aqui
              modificam somente o perfil
              ENTREGADOR desta empresa.
              Outros fornecedores não são
              afetados.
            </p>
          </div>
        </section>

        {modoControleCarga ===
          "QUANTIDADE" && (
          <section className="flex items-start gap-3 rounded-[22px] border border-amber-100 bg-amber-50 px-5 py-4">
            <AlertTriangle
              size={19}
              className="mt-0.5 shrink-0 text-amber-600"
            />

            <div>
              <p className="text-xs font-black text-amber-800">
                Operação por QUANTIDADE
              </p>

              <p className="mt-1 text-[11px] leading-5 text-amber-700">
                As permissões de bipagem
                permanecem bloqueadas porque
                esta empresa não utiliza
                volumes individuais.
              </p>
            </div>
          </section>
        )}

        {grupos.map(
          ([modulo, itens]) => (
            <section
              key={modulo}
              className="overflow-hidden rounded-[28px] border border-black/[0.04] bg-white shadow-[0_16px_45px_rgba(17,63,33,0.05)]"
            >
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 md:px-6">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#18834a]">
                    Permissões
                  </p>

                  <h2 className="mt-1 text-[17px] font-black tracking-[-0.03em] text-[#142019]">
                    {modulo}
                  </h2>
                </div>

                <div className="rounded-full bg-[#f0f7f2] px-3 py-1.5 text-[9px] font-black text-[#197844]">
                  {
                    itens.filter(
                      (item) =>
                        selecionadas.has(
                          item.codigo,
                        ),
                    ).length
                  }
                  /{itens.length}
                </div>
              </div>

              <div className="space-y-2 p-4 md:p-5">
                {itens.map(
                  (permissao) => {
                    const checked =
                      selecionadas.has(
                        permissao.codigo,
                      );

                    return (
                      <label
                        key={
                          permissao.id
                        }
                        className={`relative flex items-center gap-4 rounded-[20px] border px-4 py-4 transition ${
                          permissao.bloqueado
                            ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-65"
                            : checked
                              ? "cursor-pointer border-emerald-100 bg-[#f5fbf7]"
                              : "cursor-pointer border-slate-100 bg-white hover:border-emerald-100 hover:bg-[#fbfdfb]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="permissoes"
                          value={
                            permissao.codigo
                          }
                          checked={
                            checked
                          }
                          disabled={
                            permissao.bloqueado
                          }
                          onChange={() =>
                            toggle(
                              permissao,
                            )
                          }
                          className="sr-only"
                        />

                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${
                            permissao.bloqueado
                              ? "bg-slate-200 text-slate-500"
                              : checked
                                ? "bg-[#19864b] text-white"
                                : "bg-[#eef7f1] text-[#19864b]"
                          }`}
                        >
                          {permissao.bloqueado ? (
                            <LockKeyhole
                              size={18}
                            />
                          ) : checked ? (
                            <Check
                              size={18}
                              strokeWidth={
                                3
                              }
                            />
                          ) : (
                            <KeyRound
                              size={18}
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[12px] font-black text-[#152019]">
                              {
                                permissao.nome
                              }
                            </p>

                            {permissao.sensivel &&
                              !permissao.bloqueado && (
                                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-amber-700">
                                  <ShieldAlert
                                    size={10}
                                  />

                                  Sensível
                                </span>
                              )}
                          </div>

                          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
                            {
                              permissao.codigo
                            }
                          </p>

                          {permissao.descricao && (
                            <p className="mt-1 text-[10px] leading-4 text-slate-400">
                              {
                                permissao.descricao
                              }
                            </p>
                          )}

                          {permissao.bloqueado &&
                            permissao.motivoBloqueio && (
                              <p className="mt-2 text-[10px] font-bold leading-4 text-amber-700">
                                {
                                  permissao.motivoBloqueio
                                }
                              </p>
                            )}
                        </div>

                        <div
                          className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                            checked &&
                            !permissao.bloqueado
                              ? "bg-[#18834a]"
                              : "bg-slate-200"
                          }`}
                        >
                          <div
                            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                              checked &&
                              !permissao.bloqueado
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </div>
                      </label>
                    );
                  },
                )}
              </div>
            </section>
          ),
        )}

        <div className="sticky bottom-4 z-30">
          <div className="flex items-center justify-between gap-4 rounded-[24px] border border-white/90 bg-white/95 p-4 shadow-[0_18px_50px_rgba(17,63,33,0.13)] backdrop-blur-xl">
            <div className="hidden md:block">
              <p className="text-xs font-black text-[#152019]">
                Perfil ENTREGADOR
              </p>

              <p className="mt-0.5 text-[10px] text-slate-400">
                {quantidadeAtiva} funções
                serão disponibilizadas.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setModalConfirmacao(
                  true,
                )
              }
              disabled={pending}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[17px] bg-[linear-gradient(135deg,#19864b,#0f6336)] px-7 text-sm font-black text-white shadow-[0_14px_30px_rgba(25,134,75,0.23)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            >
              <Save size={18} />

              Salvar permissões
            </button>
          </div>
        </div>

        {modalConfirmacao && (
          <ModalOverlay>
            <div className="w-full max-w-[460px] overflow-hidden rounded-[30px] bg-white shadow-[0_30px_100px_rgba(15,50,30,0.25)]">
              <div className="bg-[linear-gradient(135deg,#176f3c,#0d5a30)] px-6 py-6 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[17px] bg-white/10">
                    <ShieldAlert
                      size={23}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setModalConfirmacao(
                        false,
                      )
                    }
                    disabled={pending}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
                  >
                    <X size={18} />
                  </button>
                </div>

                <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
                  Confirmação de segurança
                </p>

                <h3 className="mt-2 text-[23px] font-black leading-tight tracking-[-0.04em]">
                  Confirmar alteração das permissões?
                </h3>
              </div>

              <div className="p-6">
                <p className="text-[12px] leading-6 text-slate-500">
                  Você está alterando o acesso padrão do perfil{" "}
                  <strong className="text-slate-800">
                    ENTREGADOR
                  </strong>{" "}
                  da empresa{" "}
                  <strong className="text-slate-800">
                    {empresaNome}
                  </strong>.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-[18px] bg-[#f2f8f4] p-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                      Ativas
                    </p>

                    <p className="mt-2 text-2xl font-black text-[#176f3c]">
                      {quantidadeAtiva}
                    </p>
                  </div>

                  <div className="rounded-[18px] bg-amber-50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-600">
                      Sensíveis
                    </p>

                    <p className="mt-2 text-2xl font-black text-amber-700">
                      {quantidadeSensivel}
                    </p>
                  </div>
                </div>

                {quantidadeSensivel >
                  0 && (
                  <div className="mt-4 flex gap-3 rounded-[18px] border border-amber-100 bg-amber-50 px-4 py-4">
                    <AlertTriangle
                      size={18}
                      className="mt-0.5 shrink-0 text-amber-600"
                    />

                    <p className="text-[10px] font-semibold leading-5 text-amber-800">
                      Existem permissões
                      sensíveis habilitadas.
                      Confirme se esse acesso é
                      realmente necessário para
                      os entregadores.
                    </p>
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      setModalConfirmacao(
                        false,
                      )
                    }
                    className="h-[50px] flex-1 rounded-[16px] border border-slate-200 bg-white text-xs font-black text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={pending}
                    className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#19864b,#0f6336)] text-xs font-black text-white shadow-[0_12px_25px_rgba(25,134,75,0.20)] disabled:opacity-60"
                  >
                    <ShieldCheck
                      size={17}
                    />

                    {pending
                      ? "Salvando..."
                      : "Confirmar alterações"}
                  </button>
                </div>
              </div>
            </div>
          </ModalOverlay>
        )}
      </form>

      {modalResultado &&
        state.message && (
          <ModalOverlay>
            <div className="w-full max-w-[420px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.25)]">
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                  state.success
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {state.success ? (
                  <CheckCircle2
                    size={31}
                  />
                ) : (
                  <XCircle
                    size={31}
                  />
                )}
              </div>

              <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                {state.success
                  ? "Alteração concluída"
                  : "Falha na operação"}
              </p>

              <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[#152019]">
                {state.success
                  ? "Permissões atualizadas"
                  : "Não foi possível salvar"}
              </h3>

              <p className="mt-3 text-[12px] leading-6 text-slate-500">
                {state.message}
              </p>

              <button
                type="button"
                onClick={() =>
                  setModalResultado(
                    false,
                  )
                }
                className="mt-6 h-[50px] w-full rounded-[16px] bg-[#176f3c] text-xs font-black text-white transition hover:bg-[#125d32]"
              >
                Entendi
              </button>
            </div>
          </ModalOverlay>
        )}
    </>
  );
}

function Resumo({
  titulo,
  valor,
  detalhe,
}: {
  titulo: string;
  valor: string;
  detalhe: string;
}) {
  return (
    <div className="rounded-[22px] border border-black/[0.04] bg-white px-5 py-4 shadow-[0_12px_35px_rgba(17,63,33,0.04)]">
      <p className="text-[9px] font-black uppercase tracking-[0.17em] text-slate-400">
        {titulo}
      </p>

      <p className="mt-2 text-xl font-black tracking-[-0.04em] text-[#142019]">
        {valor}
      </p>

      <p className="mt-1 text-[10px] text-slate-400">
        {detalhe}
      </p>
    </div>
  );
}

function ModalOverlay({
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