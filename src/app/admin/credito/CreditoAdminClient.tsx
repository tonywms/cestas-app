"use client";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileCheck2,
  LockKeyhole,
  Save,
  ShieldCheck,
  ShieldX,
  UnlockKeyhole,
  UserRound,
  WalletCards,
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
  liberarCreditoCliente,
  revogarLiberacaoCredito,
  salvarPoliticaCredito,
  type CreditoActionState,
} from "./actions";

type Politica = {
  alertaQtdAtrasos: number;
  bloqueioQtdAtrasos: number;
  diasTolerancia: number;
  permitirExcecao: boolean;
  validadeExcecaoDias: number;
};

type ClienteCredito = {
  id: number;
  codigo: string;
  nome: string;
  saldo: number;
  parcelasAbertas: number;
  parcelasVencidas: number;

  statusBase:
    | "LIBERADO"
    | "ALERTA"
    | "BLOQUEADO";

  statusEfetivo:
    | "LIBERADO"
    | "ALERTA"
    | "BLOQUEADO"
    | "LIBERADO_EXCECAO";

  liberacao: {
    id: number;
    motivo: string;
    validoAte: string;
  } | null;
};

const initialState:
  CreditoActionState = {
    success:
      false,

    message:
      "",
  };

function moeda(
  valor:
    number,
) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style:
        "currency",

      currency:
        "BRL",
    },
  ).format(
    valor,
  );
}

function dataHora(
  valor:
    string,
) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle:
        "short",

      timeStyle:
        "short",

      timeZone:
        "America/Fortaleza",
    },
  ).format(
    new Date(
      valor,
    ),
  );
}

export default function CreditoAdminClient({
  empresaNome,
  politica,
  clientes,
  podeConfigurarPolitica,
  podeLiberarCredito,
}: {
  empresaNome:
    string;

  politica:
    Politica;

  clientes:
    ClienteCredito[];

  podeConfigurarPolitica:
    boolean;

  podeLiberarCredito:
    boolean;
}) {
  const [
    politicaState,
    politicaAction,
    politicaPending,
  ] =
    useActionState(
      salvarPoliticaCredito,
      initialState,
    );

  const [
    liberacaoState,
    liberacaoAction,
    liberacaoPending,
  ] =
    useActionState(
      liberarCreditoCliente,
      initialState,
    );

  const [
    revogacaoState,
    revogacaoAction,
    revogacaoPending,
  ] =
    useActionState(
      revogarLiberacaoCredito,
      initialState,
    );

  const [
    clienteLiberar,
    setClienteLiberar,
  ] =
    useState<ClienteCredito | null>(
      null,
    );

  const [
    clienteRevogar,
    setClienteRevogar,
  ] =
    useState<ClienteCredito | null>(
      null,
    );

  const [
    resultado,
    setResultado,
  ] =
    useState<CreditoActionState | null>(
      null,
    );

  useEffect(
    () => {
      if (
        politicaState.message
      ) {
        setResultado(
          politicaState,
        );
      }
    },
    [
      politicaState,
    ],
  );

  useEffect(
    () => {
      if (
        liberacaoState.message
      ) {
        setResultado(
          liberacaoState,
        );

        if (
          liberacaoState.success
        ) {
          setClienteLiberar(
            null,
          );
        }
      }
    },
    [
      liberacaoState,
    ],
  );

  useEffect(
    () => {
      if (
        revogacaoState.message
      ) {
        setResultado(
          revogacaoState,
        );

        if (
          revogacaoState.success
        ) {
          setClienteRevogar(
            null,
          );
        }
      }
    },
    [
      revogacaoState,
    ],
  );

  const resumo =
    useMemo(
      () => ({
        liberados:
          clientes.filter(
            (
              item,
            ) =>
              item.statusEfetivo ===
              "LIBERADO",
          ).length,

        alertas:
          clientes.filter(
            (
              item,
            ) =>
              item.statusEfetivo ===
              "ALERTA",
          ).length,

        bloqueados:
          clientes.filter(
            (
              item,
            ) =>
              item.statusEfetivo ===
              "BLOQUEADO",
          ).length,

        excecoes:
          clientes.filter(
            (
              item,
            ) =>
              item.statusEfetivo ===
              "LIBERADO_EXCECAO",
          ).length,
      }),
      [
        clientes,
      ],
    );

  return (
    <>
      {/* =================================================
          KPIs
      ================================================= */}

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

        <Kpi
          label="Liberados"
          valor={
            resumo.liberados
          }
          tipo="verde"
        />

        <Kpi
          label="Com alerta"
          valor={
            resumo.alertas
          }
          tipo="amarelo"
        />

        <Kpi
          label="Bloqueados"
          valor={
            resumo.bloqueados
          }
          tipo="vermelho"
        />

        <Kpi
          label="Exceções ativas"
          valor={
            resumo.excecoes
          }
          tipo="azul"
        />

      </section>

      {/* =================================================
          POLÍTICA
      ================================================= */}

      <form
        action={
          politicaAction
        }
        className="card-premium mt-5 overflow-hidden rounded-[30px]"
      >

        <div className="border-b border-slate-100 px-6 py-5">

          <div className="flex items-start justify-between gap-4">

            <div className="flex items-start gap-3">

              <div className="icon-emerald flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px]">

                <CreditCard
                  size={21}
                />

              </div>

              <div>

                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                  Política da empresa
                </p>

                <h2 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                  Regras de crédito
                </h2>

                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  Cada fornecedor pode definir seus próprios limites.
                </p>

              </div>

            </div>

            <span className="hidden rounded-full bg-emerald-50 px-3 py-2 text-[8px] font-black uppercase text-[#176f3c] md:block">
              {empresaNome}
            </span>

          </div>

        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-5">

          <CampoNumero
            name="credito_alerta_qtd_atrasos"
            label="Alerta com"
            sufixo="parcela(s)"
            defaultValue={
              politica.alertaQtdAtrasos
            }
            min={1}
            max={100}
            disabled={
              !podeConfigurarPolitica
            }
          />

          <CampoNumero
            name="credito_bloqueio_qtd_atrasos"
            label="Bloqueio com"
            sufixo="parcela(s)"
            defaultValue={
              politica.bloqueioQtdAtrasos
            }
            min={2}
            max={100}
            disabled={
              !podeConfigurarPolitica
            }
          />

          <CampoNumero
            name="credito_dias_tolerancia"
            label="Tolerância"
            sufixo="dia(s)"
            defaultValue={
              politica.diasTolerancia
            }
            min={0}
            max={90}
            disabled={
              !podeConfigurarPolitica
            }
          />

          <CampoNumero
            name="credito_validade_excecao_dias"
            label="Validade exceção"
            sufixo="dia(s)"
            defaultValue={
              politica.validadeExcecaoDias
            }
            min={1}
            max={365}
            disabled={
              !podeConfigurarPolitica
            }
          />

          <label
            className={`flex min-h-[78px] items-center justify-between rounded-[18px] border px-4 ${
              politica.permitirExcecao
                ? "border-emerald-200 bg-emerald-50/60"
                : "border-slate-200 bg-slate-50"
            }`}
          >

            <div>

              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                Exceção
              </p>

              <p className="mt-1 text-[11px] font-black">
                Permitir gestor
              </p>

            </div>

            <input
              type="checkbox"
              name="credito_permitir_excecao"
              defaultChecked={
                politica.permitirExcecao
              }
              disabled={
                !podeConfigurarPolitica
              }
              className="h-5 w-5 accent-[#176f3c]"
            />

          </label>

        </div>

        {podeConfigurarPolitica ? (
          <div className="flex justify-end border-t border-slate-100 bg-[#fbfdfb] px-6 py-4">

            <button
              type="submit"
              disabled={
                politicaPending
              }
              className="flex h-[48px] items-center justify-center gap-2 rounded-[15px] bg-[#176f3c] px-5 text-[11px] font-black text-white shadow-[0_12px_28px_rgba(23,111,60,0.20)] disabled:opacity-50"
            >

              <Save
                size={16}
              />

              {politicaPending
                ? "Salvando..."
                : "Salvar política"}

            </button>

          </div>
        ) : (
          <div className="border-t border-amber-100 bg-amber-50 px-6 py-4 text-[10px] font-semibold text-amber-800">
            Somente ADMINISTRADOR altera a política. GESTOR pode operar liberações quando possuir permissão.
          </div>
        )}

      </form>

      {/* =================================================
          CARTEIRA
      ================================================= */}

      <section className="mt-5">

        <div className="mb-4 flex items-end justify-between">

          <div>

            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
              Carteira de crédito
            </p>

            <h2 className="mt-1 text-[22px] font-black tracking-[-0.04em]">
              Situação dos clientes
            </h2>

          </div>

          <span className="rounded-full border border-emerald-100 bg-white px-3 py-2 text-[8px] font-black uppercase text-[#176f3c]">
            {clientes.length} cliente
            {clientes.length ===
            1
              ? ""
              : "s"}
          </span>

        </div>

        <div className="grid gap-4 xl:grid-cols-2">

          {clientes.map(
            (
              cliente,
            ) => (
              <ClienteCard
                key={
                  cliente.id
                }
                cliente={
                  cliente
                }
                permitirExcecao={
                  politica.permitirExcecao
                }
                podeLiberar={
                  podeLiberarCredito
                }
                onLiberar={() =>
                  setClienteLiberar(
                    cliente,
                  )
                }
                onRevogar={() =>
                  setClienteRevogar(
                    cliente,
                  )
                }
              />
            ),
          )}

        </div>

      </section>

      {/* =================================================
          MODAL LIBERAÇÃO
      ================================================= */}

      {clienteLiberar && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">

          <div className="w-full max-w-[480px] overflow-hidden rounded-[30px] bg-white shadow-[0_30px_100px_rgba(15,50,30,0.28)]">

            <div className="bg-[linear-gradient(135deg,#176f3c,#0d5a30)] p-6 text-white">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-200">
                    Exceção gerencial
                  </p>

                  <h3 className="mt-2 text-[22px] font-black tracking-[-0.04em]">
                    Liberar crédito?
                  </h3>

                  <p className="mt-2 text-[11px] text-white/65">
                    {clienteLiberar.nome} possui {clienteLiberar.parcelasVencidas} parcela(s) vencida(s).
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setClienteLiberar(
                      null,
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-white/10"
                >

                  <X
                    size={18}
                  />

                </button>

              </div>

            </div>

            <form
              action={
                liberacaoAction
              }
              className="p-6"
            >

              <input
                type="hidden"
                name="cliente_id"
                value={
                  clienteLiberar.id
                }
              />

              <label className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                Motivo obrigatório
              </label>

              <textarea
                name="motivo"
                required
                minLength={10}
                rows={4}
                placeholder="Ex.: Cliente apresentou comprovante e gestor autorizou compra excepcional."
                className="mt-2 w-full resize-none rounded-[17px] border border-slate-200 bg-white p-4 text-[12px] font-semibold outline-none focus:border-emerald-400"
              />

              <label className="mt-5 block text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                Validade em dias
              </label>

              <input
                type="number"
                name="validade_dias"
                min={1}
                max={365}
                defaultValue={
                  politica.validadeExcecaoDias
                }
                className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 px-4 text-[13px] font-black outline-none focus:border-emerald-400"
              />

              <div className="mt-5 rounded-[18px] border border-amber-200 bg-[#fff9eb] p-4">

                <div className="flex items-start gap-3">

                  <AlertTriangle
                    size={18}
                    className="mt-0.5 shrink-0 text-amber-700"
                  />

                  <p className="text-[10px] leading-5 text-amber-900/75">
                    A liberação não apaga atrasos. Ela apenas autoriza novas operações durante o período definido e fica registrada na auditoria.
                  </p>

                </div>

              </div>

              <button
                type="submit"
                disabled={
                  liberacaoPending
                }
                className="mt-5 flex h-[54px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#176f3c] text-[12px] font-black text-white disabled:opacity-50"
              >

                <UnlockKeyhole
                  size={17}
                />

                {liberacaoPending
                  ? "Liberando..."
                  : "Confirmar liberação"}

              </button>

            </form>

          </div>

        </div>
      )}

      {/* =================================================
          MODAL REVOGAÇÃO
      ================================================= */}

      {clienteRevogar &&
        clienteRevogar.liberacao && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">

          <div className="w-full max-w-[450px] rounded-[30px] bg-white p-6 shadow-[0_30px_100px_rgba(15,50,30,0.28)]">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-red-500">
                  Segurança
                </p>

                <h3 className="mt-2 text-[21px] font-black">
                  Revogar exceção?
                </h3>

                <p className="mt-2 text-[11px] text-slate-500">
                  {clienteRevogar.nome} voltará imediatamente à regra normal de crédito.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setClienteRevogar(
                    null,
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-slate-100"
              >

                <X
                  size={18}
                />

              </button>

            </div>

            <form
              action={
                revogacaoAction
              }
              className="mt-5"
            >

              <input
                type="hidden"
                name="liberacao_id"
                value={
                  clienteRevogar.liberacao.id
                }
              />

              <input
                type="hidden"
                name="cliente_id"
                value={
                  clienteRevogar.id
                }
              />

              <label className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                Motivo da revogação
              </label>

              <input
                name="motivo_revogacao"
                defaultValue="Revogação manual pelo gestor."
                className="mt-2 h-[54px] w-full rounded-[17px] border border-slate-200 px-4 text-[12px] font-semibold outline-none focus:border-red-300"
              />

              <button
                type="submit"
                disabled={
                  revogacaoPending
                }
                className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-red-600 text-[12px] font-black text-white disabled:opacity-50"
              >

                <ShieldX
                  size={17}
                />

                {revogacaoPending
                  ? "Revogando..."
                  : "Revogar liberação"}

              </button>

            </form>

          </div>

        </div>
      )}

      {/* =================================================
          RESULTADO
      ================================================= */}

      {resultado && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#07150d]/55 p-4 backdrop-blur-[6px]">

          <div className="w-full max-w-[400px] rounded-[30px] bg-white p-7 text-center shadow-[0_30px_100px_rgba(15,50,30,0.28)]">

            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                resultado.success
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-red-100 text-red-600"
              }`}
            >

              {resultado.success ? (
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
              {resultado.success
                ? "Operação concluída"
                : "Operação não concluída"}
            </p>

            <h3 className="mt-2 text-[20px] font-black">
              {resultado.success
                ? "Crédito atualizado"
                : "Verifique a operação"}
            </h3>

            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              {
                resultado.message
              }
            </p>

            <button
              type="button"
              onClick={() =>
                setResultado(
                  null,
                )
              }
              className="mt-6 h-[50px] w-full rounded-[16px] bg-[#176f3c] text-xs font-black text-white"
            >
              Entendi
            </button>

          </div>

        </div>
      )}

    </>
  );
}

/* =========================================================
   CLIENTE CARD
========================================================= */

function ClienteCard({
  cliente,
  permitirExcecao,
  podeLiberar,
  onLiberar,
  onRevogar,
}: {
  cliente:
    ClienteCredito;

  permitirExcecao:
    boolean;

  podeLiberar:
    boolean;

  onLiberar:
    () => void;

  onRevogar:
    () => void;
}) {
  const bloqueado =
    cliente.statusEfetivo ===
    "BLOQUEADO";

  const alerta =
    cliente.statusEfetivo ===
    "ALERTA";

  const excecao =
    cliente.statusEfetivo ===
    "LIBERADO_EXCECAO";

  return (
    <article
      className={`relative overflow-hidden rounded-[28px] border p-5 shadow-[0_22px_55px_-32px_rgba(17,63,33,0.18)] ${
        bloqueado
          ? "border-red-200 bg-[linear-gradient(145deg,#fff5f5,#ffffff)]"
          : alerta
            ? "border-amber-200 bg-[linear-gradient(145deg,#fffaf0,#ffffff)]"
            : excecao
              ? "border-sky-200 bg-[linear-gradient(145deg,#f2f9ff,#ffffff)]"
              : "border-emerald-200 bg-[linear-gradient(145deg,#f0fbf4,#ffffff)]"
      }`}
    >

      <div
        className={`absolute inset-x-0 top-0 h-[3px] ${
          bloqueado
            ? "bg-[linear-gradient(90deg,#ef4444,#fb7185)]"
            : alerta
              ? "bg-[linear-gradient(90deg,#f59e0b,#facc15)]"
              : excecao
                ? "bg-[linear-gradient(90deg,#0ea5e9,#38bdf8)]"
                : "bg-[linear-gradient(90deg,#16a05d,#8ee9b2)]"
        }`}
      />

      <div className="flex items-start gap-4">

        <div
          className={`flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[18px] text-white ${
            bloqueado
              ? "bg-red-500"
              : alerta
                ? "bg-amber-500"
                : excecao
                  ? "bg-sky-500"
                  : "bg-[#159653]"
          }`}
        >

          {bloqueado ? (
            <LockKeyhole
              size={23}
            />
          ) : excecao ? (
            <ShieldCheck
              size={23}
            />
          ) : (
            <UserRound
              size={23}
            />
          )}

        </div>

        <div className="min-w-0 flex-1">

          <div className="flex items-start justify-between gap-3">

            <div className="min-w-0">

              <h3 className="truncate text-[17px] font-black">
                {
                  cliente.nome
                }
              </h3>

              <p className="mt-1 text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                {
                  cliente.codigo
                }
              </p>

            </div>

            <StatusBadge
              status={
                cliente.statusEfetivo
              }
            />

          </div>

        </div>

      </div>

      <div className="mt-4 rounded-[18px] bg-[#f7f9f7]/90 p-3.5">

        <div className="flex items-center gap-3">

          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white text-[#176f3c] shadow-sm">

            <WalletCards
              size={14}
            />

          </div>

          <div className="min-w-0 flex-1">

            <p className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-400">
              Saldo em aberto
            </p>

            <p className="mt-1 text-[14px] font-black">
              {moeda(
                cliente.saldo,
              )}
            </p>

          </div>

        </div>

      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">

        <Mini
          label="Parcelas abertas"
          valor={
            String(
              cliente.parcelasAbertas,
            )
          }
        />

        <Mini
          label="Vencidas"
          valor={
            String(
              cliente.parcelasVencidas,
            )
          }
          alerta={
            cliente.parcelasVencidas >
            0
          }
        />

      </div>

      {excecao &&
        cliente.liberacao && (
        <div className="mt-4 rounded-[18px] border border-sky-200 bg-sky-50 p-4">

          <div className="flex items-start gap-3">

            <FileCheck2
              size={18}
              className="mt-0.5 shrink-0 text-sky-700"
            />

            <div>

              <p className="text-[9px] font-black text-sky-800">
                Liberação excepcional ativa
              </p>

              <p className="mt-1 text-[9px] leading-5 text-sky-700/70">
                {cliente.liberacao.motivo}
              </p>

              <div className="mt-2 flex items-center gap-1.5 text-[8px] font-bold text-sky-700">

                <Clock3
                  size={11}
                />

                Válida até{" "}
                {dataHora(
                  cliente.liberacao
                    .validoAte,
                )}

              </div>

            </div>

          </div>

        </div>
      )}

      {bloqueado &&
        permitirExcecao &&
        podeLiberar && (
        <button
          type="button"
          onClick={
            onLiberar
          }
          className="mt-4 flex h-[50px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#176f3c] text-[11px] font-black text-white"
        >

          <UnlockKeyhole
            size={16}
          />

          Liberar excepcionalmente

        </button>
      )}

      {excecao &&
        podeLiberar && (
        <button
          type="button"
          onClick={
            onRevogar
          }
          className="mt-4 flex h-[48px] w-full items-center justify-center gap-2 rounded-[16px] border border-red-200 bg-white text-[10px] font-black text-red-600"
        >

          <ShieldX
            size={15}
          />

          Revogar exceção

        </button>
      )}

    </article>
  );
}

/* =========================================================
   AUXILIARES
========================================================= */

function StatusBadge({
  status,
}: {
  status:
    ClienteCredito["statusEfetivo"];
}) {
  if (
    status ===
    "BLOQUEADO"
  ) {
    return (
      <span className="rounded-full bg-red-100 px-3 py-1.5 text-[8px] font-black uppercase text-red-700">
        Bloqueado
      </span>
    );
  }

  if (
    status ===
    "ALERTA"
  ) {
    return (
      <span className="rounded-full bg-amber-100 px-3 py-1.5 text-[8px] font-black uppercase text-amber-700">
        Alerta
      </span>
    );
  }

  if (
    status ===
    "LIBERADO_EXCECAO"
  ) {
    return (
      <span className="rounded-full bg-sky-100 px-3 py-1.5 text-[8px] font-black uppercase text-sky-700">
        Exceção
      </span>
    );
  }

  return (
    <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[8px] font-black uppercase text-emerald-700">
      Liberado
    </span>
  );
}

function Kpi({
  label,
  valor,
  tipo,
}: {
  label:
    string;

  valor:
    number;

  tipo:
    | "verde"
    | "amarelo"
    | "vermelho"
    | "azul";
}) {
  const classes = {
    verde:
      "bg-emerald-50 text-emerald-700",

    amarelo:
      "bg-amber-50 text-amber-700",

    vermelho:
      "bg-red-50 text-red-700",

    azul:
      "bg-sky-50 text-sky-700",
  };

  return (
    <div className="card-premium rounded-[24px] p-5">

      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>

      <div className="mt-3 flex items-end justify-between">

        <p className="text-[28px] font-black tracking-[-0.05em]">
          {valor}
        </p>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-[14px] ${classes[tipo]}`}
        >

          {tipo ===
          "vermelho" ? (
            <LockKeyhole
              size={18}
            />
          ) : tipo ===
            "amarelo" ? (
            <AlertTriangle
              size={18}
            />
          ) : tipo ===
            "azul" ? (
            <ShieldCheck
              size={18}
            />
          ) : (
            <CheckCircle2
              size={18}
            />
          )}

        </div>

      </div>

    </div>
  );
}

function Mini({
  label,
  valor,
  alerta = false,
}: {
  label:
    string;

  valor:
    string;

  alerta?:
    boolean;
}) {
  return (
    <div
      className={`rounded-[14px] border px-3 py-2.5 ${
        alerta
          ? "border-amber-200 bg-amber-50"
          : "border-slate-100 bg-white/90"
      }`}
    >

      <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-[11px] font-black ${
          alerta
            ? "text-amber-700"
            : ""
        }`}
      >
        {valor}
      </p>

    </div>
  );
}

function CampoNumero({
  name,
  label,
  sufixo,
  defaultValue,
  min,
  max,
  disabled,
}: {
  name:
    string;

  label:
    string;

  sufixo:
    string;

  defaultValue:
    number;

  min:
    number;

  max:
    number;

  disabled:
    boolean;
}) {
  return (
    <label>

      <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>

      <div className="relative mt-2">

        <input
          type="number"
          name={
            name
          }
          defaultValue={
            defaultValue
          }
          min={min}
          max={max}
          required
          disabled={
            disabled
          }
          className="h-[54px] w-full rounded-[17px] border border-slate-200 bg-white px-4 pr-20 text-[14px] font-black outline-none focus:border-emerald-400 disabled:bg-slate-50 disabled:text-slate-400"
        />

        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-slate-400">
          {sufixo}
        </span>

      </div>

    </label>
  );
}
