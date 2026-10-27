export const instant = false;

import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  CircleAlert,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";

import Link from "next/link";

import {
  PERMISSOES,
} from "@/lib/auth/permissions";

import {
  requirePermission,
} from "@/lib/auth/require-permission";

import {
  getCargaAtiva,
} from "@/services/cargas/get-carga-ativa";

function formatarData(
  data: string,
) {
  if (!data) {
    return "-";
  }

  const [
    ano,
    mes,
    dia,
  ] = data.split("-");

  if (
    !ano ||
    !mes ||
    !dia
  ) {
    return data;
  }

  return `${dia}/${mes}/${ano}`;
}

function StatusCarga({
  status,
}: {
  status: string;
}) {
  if (
    status === "EM_ROTA"
  ) {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-emerald-700">
        Em rota
      </span>
    );
  }

  return (
    <span className="rounded-full bg-amber-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-amber-700">
      Aberta
    </span>
  );
}

export default async function MinhaCargaPage() {
  /*
   * =========================================================
   * PERMISSÃO
   * =========================================================
   */

  const usuario =
    await requirePermission(
      PERMISSOES.CARGA_VISUALIZAR,
    );

  /*
   * =========================================================
   * IDENTIDADE DO TENANT
   * =========================================================
   *
   * Aqui NÃO usamos:
   *
   * usuario.empresaId
   * usuario.empresa_id
   *
   * O formato correto retornado por
   * getCurrentUserProfile é:
   *
   * usuario.empresa.id
   */

  const entregadorId =
    usuario.id;

  const empresaId =
    usuario.empresa.id;

  /*
   * =========================================================
   * CARGA
   * =========================================================
   */

  const {
    carga,
    erro,
  } = await getCargaAtiva({
    entregadorId,
    empresaId,
  });

  /*
   * =========================================================
   * ERRO
   * =========================================================
   */

  if (erro) {
    return (
      <main className="min-h-dvh bg-[#eaf2ec] text-[#142018]">
        <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7]">

          <Header />

          <section className="px-4 py-5">
            <div className="rounded-[24px] border border-red-200 bg-red-50 p-5">

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-red-100 text-red-600">
                  <CircleAlert
                    size={20}
                  />
                </div>

                <div>
                  <h2 className="text-sm font-black text-red-700">
                    Não foi possível carregar os dados
                  </h2>

                  <p className="mt-2 text-[11px] leading-5 text-red-600">
                    {erro}
                  </p>
                </div>
              </div>

              <Link
                href="/mobile/carga"
                className="mt-5 flex h-[48px] w-full items-center justify-center gap-2 rounded-[15px] bg-red-600 text-xs font-black text-white"
              >
                <RefreshCw
                  size={16}
                />

                Tentar novamente
              </Link>

            </div>
          </section>

        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * SEM CARGA
   * =========================================================
   */

  if (!carga) {
    return (
      <main className="min-h-dvh bg-[#eaf2ec] text-[#142018]">
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-[#f7faf7]">

          <Header />

          <section className="flex flex-1 flex-col px-5 py-7">

            <div className="rounded-[28px] border border-black/[0.04] bg-white p-6 shadow-[0_18px_45px_rgba(17,63,33,0.07)]">

              <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#eaf5ed] text-[#176b3a]">
                <Truck
                  size={26}
                />
              </div>

              <p className="mt-6 text-[9px] font-black uppercase tracking-[0.18em] text-[#18834a]">
                Estoque móvel
              </p>

              <h2 className="mt-2 text-[22px] font-black tracking-[-0.04em]">
                Nenhuma carga ativa
              </h2>

              <p className="mt-3 text-[12px] leading-6 text-slate-500">
                Quando uma carga for atribuída ao seu
                usuário, ela aparecerá automaticamente
                aqui.
              </p>

              <div className="mt-6 rounded-[18px] bg-[#f5f8f5] px-4 py-4">

                <div className="flex items-center gap-3">

                  <ShieldCheck
                    size={18}
                    className="shrink-0 text-[#176b3a]"
                  />

                  <div>
                    <p className="text-[11px] font-black text-[#176b3a]">
                      Ambiente isolado
                    </p>

                    <p className="mt-1 text-[10px] leading-5 text-slate-400">
                      Você visualiza apenas cargas
                      vinculadas ao seu usuário e à sua
                      empresa.
                    </p>
                  </div>

                </div>

              </div>
            </div>

            <Link
              href="/mobile"
              className="mt-4 flex h-[52px] items-center justify-center gap-2 rounded-[17px] border border-[#dce8de] bg-white text-xs font-black text-[#176b3a]"
            >
              <ArrowLeft
                size={17}
              />

              Voltar ao início
            </Link>

          </section>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * MÉTRICAS
   * =========================================================
   */

  const totalCarregado =
    carga.carga_itens.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.quantidade_carregada,
      0,
    );

  const totalEntregue =
    carga.carga_itens.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.quantidade_entregue,
      0,
    );

  const totalRetornado =
    carga.carga_itens.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.quantidade_retornada,
      0,
    );

  const totalAvariado =
    carga.carga_itens.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.quantidade_avariada,
      0,
    );

  const saldo =
    Math.max(
      0,
      totalCarregado -
        totalEntregue -
        totalRetornado -
        totalAvariado,
    );

  const percentual =
    totalCarregado > 0
      ? Math.min(
          100,
          Math.round(
            (
              totalEntregue /
              totalCarregado
            ) *
              100,
          ),
        )
      : 0;

  /*
   * =========================================================
   * TELA COM CARGA
   * =========================================================
   */

  return (
    <main className="min-h-dvh bg-[#eaf2ec] text-[#142018]">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7] pb-28">

        <Header />

        <section className="px-5 py-6">

          {/* RESUMO */}
          <div className="rounded-[28px] border border-black/[0.04] bg-white p-5 shadow-[0_18px_45px_rgba(17,63,33,0.07)]">

            <div className="flex items-start justify-between gap-4">

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#18834a]">
                  Carga atual
                </p>

                <h2 className="mt-2 text-xl font-black">
                  {carga.codigo}
                </h2>

                <p className="mt-1 text-[10px] font-semibold text-slate-400">
                  {formatarData(
                    carga.data_carga,
                  )}
                </p>
              </div>

              <StatusCarga
                status={
                  carga.status
                }
              />

            </div>

            {/* PROGRESSO */}
            <div className="mt-6">

              <div className="flex items-center justify-between">

                <span className="text-[10px] font-bold text-slate-400">
                  Progresso da carga
                </span>

                <span className="text-[11px] font-black text-[#176b3a]">
                  {percentual}%
                </span>

              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e7eee8]">

                <div
                  className="h-full rounded-full bg-[#18834a]"
                  style={{
                    width:
                      `${percentual}%`,
                  }}
                />

              </div>
            </div>

            {/* INDICADORES */}
            <div className="mt-5 grid grid-cols-3 gap-2">

              <Indicador
                valor={
                  totalCarregado
                }
                label="Carregado"
              />

              <Indicador
                valor={
                  totalEntregue
                }
                label="Entregue"
              />

              <Indicador
                valor={
                  saldo
                }
                label="Saldo"
              />

            </div>

          </div>

          {/* COMPOSIÇÃO */}
          <div className="mt-5">

            <div className="flex items-end justify-between">

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#18834a]">
                  Composição
                </p>

                <h2 className="mt-1 text-lg font-black">
                  Cestas da carga
                </h2>
              </div>

              <div className="rounded-full bg-[#eaf5ed] px-3 py-1.5 text-[9px] font-black text-[#176b3a]">
                {
                  carga.carga_itens
                    .length
                }{" "}
                tipos
              </div>

            </div>

            {carga.carga_itens.length ===
            0 ? (
              <div className="mt-4 rounded-[24px] border border-dashed border-slate-200 bg-white p-6 text-center">

                <Boxes
                  size={26}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 text-xs font-black">
                  Carga sem itens
                </p>

                <p className="mt-1 text-[10px] text-slate-400">
                  Ainda não existem cestas vinculadas
                  a esta carga.
                </p>

              </div>
            ) : (
              <div className="mt-4 space-y-3">

                {carga.carga_itens.map(
                  (item) => {
                    const saldoItem =
                      Math.max(
                        0,
                        item.quantidade_carregada -
                          item.quantidade_entregue -
                          item.quantidade_retornada -
                          item.quantidade_avariada,
                      );

                    return (
                      <div
                        key={
                          item.id
                        }
                        className="rounded-[22px] border border-black/[0.04] bg-white p-4 shadow-[0_10px_28px_rgba(17,63,33,0.045)]"
                      >

                        <div className="flex items-start justify-between gap-4">

                          <div className="flex min-w-0 items-center gap-3">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#eaf5ed] text-[#176b3a]">
                              <PackageCheck
                                size={21}
                              />
                            </div>

                            <div className="min-w-0">

                              <p className="truncate text-[12px] font-black">
                                {
                                  item
                                    .tipos_cesta
                                    ?.nome ??
                                  "Tipo de cesta"
                                }
                              </p>

                              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                {
                                  item
                                    .tipos_cesta
                                    ?.codigo ??
                                  "-"
                                }
                              </p>

                            </div>
                          </div>

                          <div className="text-right">

                            <p className="text-xl font-black text-[#176b3a]">
                              {
                                saldoItem
                              }
                            </p>

                            <p className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">
                              Saldo
                            </p>

                          </div>

                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">

                          <MiniInfo
                            label="Carga"
                            valor={
                              item.quantidade_carregada
                            }
                          />

                          <MiniInfo
                            label="Entregue"
                            valor={
                              item.quantidade_entregue
                            }
                          />

                          <MiniInfo
                            label="Retorno"
                            valor={
                              item.quantidade_retornada
                            }
                          />

                        </div>

                        {item.quantidade_avariada >
                          0 && (
                          <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-amber-50 px-3 py-2 text-[9px] font-bold text-amber-700">

                            <AlertTriangle
                              size={14}
                            />

                            {
                              item.quantidade_avariada
                            }{" "}
                            cesta(s) avariada(s)

                          </div>
                        )}
                      </div>
                    );
                  },
                )}

              </div>
            )}
          </div>

          {/* RETORNO */}
          <div className="mt-5 grid grid-cols-2 gap-3">

            <div className="rounded-[22px] bg-[#eff8f2] p-4">

              <RotateCcw
                size={20}
                className="text-[#176b3a]"
              />

              <p className="mt-4 text-2xl font-black">
                {totalRetornado}
              </p>

              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                Retornadas
              </p>

            </div>

            <div className="rounded-[22px] bg-amber-50 p-4">

              <AlertTriangle
                size={20}
                className="text-amber-600"
              />

              <p className="mt-4 text-2xl font-black">
                {totalAvariado}
              </p>

              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-700/60">
                Avariadas
              </p>

            </div>

          </div>

          {/* SEGURANÇA */}
          <div className="mt-5 flex items-start gap-3 rounded-[20px] border border-emerald-100 bg-emerald-50 px-4 py-4">

            <ShieldCheck
              size={18}
              className="mt-0.5 shrink-0 text-emerald-700"
            />

            <p className="text-[10px] leading-5 text-emerald-800">
              Esta carga pertence à sua empresa e está
              vinculada ao seu usuário. As regras de
              segurança do banco impedem acesso a cargas
              de outros fornecedores.
            </p>

          </div>

        </section>
      </div>
    </main>
  );
}

/* =========================================================
   HEADER
========================================================= */

function Header() {
  return (
    <header className="relative overflow-hidden bg-[linear-gradient(155deg,#176b3a,#0d5a30)] px-5 pb-8 pt-5 text-white">

      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full border-[28px] border-white/[0.04]" />

      <div className="relative z-10 flex items-center justify-between">

        <Link
          href="/mobile"
          className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/10"
        >
          <ArrowLeft
            size={19}
          />
        </Link>

        <div className="text-center">

          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
            Operação
          </p>

          <h1 className="mt-1 text-lg font-black">
            Minha Carga
          </h1>

        </div>

        <Link
          href="/mobile/carga"
          className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/10"
        >
          <RefreshCw
            size={18}
          />
        </Link>

      </div>

      <div className="relative z-10 mt-6">

        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#a8d8b7]">
          Operação de hoje
        </p>

        <h2 className="mt-2 text-[26px] font-black tracking-[-0.04em]">
          Minha Carga
        </h2>

        <p className="mt-2 text-[12px] text-white/65">
          Controle do estoque em movimento
        </p>

      </div>

    </header>
  );
}

/* =========================================================
   INDICADOR
========================================================= */

function Indicador({
  valor,
  label,
}: {
  valor: number;
  label: string;
}) {
  return (
    <div className="rounded-[16px] bg-[#f4f7f4] px-3 py-3 text-center">

      <p className="text-lg font-black">
        {valor}
      </p>

      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>

    </div>
  );
}

/* =========================================================
   MINI INFO
========================================================= */

function MiniInfo({
  label,
  valor,
}: {
  label: string;
  valor: number;
}) {
  return (
    <div className="rounded-[13px] bg-[#f6f8f6] px-2 py-2 text-center">

      <p className="text-[12px] font-black">
        {valor}
      </p>

      <p className="mt-0.5 text-[7px] font-black uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>

    </div>
  );
}