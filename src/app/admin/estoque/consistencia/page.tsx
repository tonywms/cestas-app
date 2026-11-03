import { categoriaDiagnostico, rotuloSeveridade } from "@/lib/ui/rotulo-tecnico";

export const instant = false;

import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Barcode,
  Boxes,
  CircleCheckBig,
  Database,
  PackageCheck,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

type Resumo = {
  cargas_total: number;
  cargas_ativas: number;
  itens_carga: number;
  saldo_central: number;
  saldo_em_cargas: number;
  entregues: number;
  retornadas: number;
  avariadas: number;
  criticos: number;
  legados: number;
};

type Baseline = {
  tipo_cesta_id: number;
  codigo: string;
  nome: string;
  saldo_atual: number;
  movimento_liquido_rastreado: number;
  baseline_legado: number;
};

type Achado = {
  severidade: "CRITICO" | "LEGADO";
  codigo: string;
  titulo: string;
  detalhe: string;
  carga_id: number | null;
  carga_codigo: string | null;
  tipo_cesta_id: number | null;
  referencia_at: string | null;
};

type Diagnostico = {
  gerado_em: string;
  modo_controle: string;
  status: "APROVADO" | "CRITICO";
  resumo: Resumo;
  baseline: Baseline[];
  achados: Achado[];
};

function numero(valor: unknown) {
  const convertido = Number(valor ?? 0);
  return Number.isFinite(convertido) ? convertido : 0;
}

function formatarDataHora(valor: string | null | undefined) {
  if (!valor) return "—";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function normalizarDiagnostico(data: unknown): Diagnostico {
  const bruto =
    data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {};

  const resumoBruto =
    bruto.resumo && typeof bruto.resumo === "object"
      ? (bruto.resumo as Record<string, unknown>)
      : {};

  const baselineBruto = Array.isArray(bruto.baseline)
    ? bruto.baseline
    : [];

  const achadosBruto = Array.isArray(bruto.achados)
    ? bruto.achados
    : [];

  return {
    gerado_em: String(bruto.gerado_em ?? ""),
    modo_controle: String(bruto.modo_controle ?? "QUANTIDADE"),
    status: bruto.status === "CRITICO" ? "CRITICO" : "APROVADO",
    resumo: {
      cargas_total: numero(resumoBruto.cargas_total),
      cargas_ativas: numero(resumoBruto.cargas_ativas),
      itens_carga: numero(resumoBruto.itens_carga),
      saldo_central: numero(resumoBruto.saldo_central),
      saldo_em_cargas: numero(resumoBruto.saldo_em_cargas),
      entregues: numero(resumoBruto.entregues),
      retornadas: numero(resumoBruto.retornadas),
      avariadas: numero(resumoBruto.avariadas),
      criticos: numero(resumoBruto.criticos),
      legados: numero(resumoBruto.legados),
    },
    baseline: baselineBruto.map((item) => {
      const linha =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};

      return {
        tipo_cesta_id: numero(linha.tipo_cesta_id),
        codigo: String(linha.codigo ?? ""),
        nome: String(linha.nome ?? "Tipo de cesta"),
        saldo_atual: numero(linha.saldo_atual),
        movimento_liquido_rastreado: numero(
          linha.movimento_liquido_rastreado,
        ),
        baseline_legado: numero(linha.baseline_legado),
      };
    }),
    achados: achadosBruto.map((item) => {
      const linha =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};

      return {
        severidade:
          linha.severidade === "CRITICO"
            ? "CRITICO"
            : "LEGADO",
        codigo: String(linha.codigo ?? "DIAGNOSTICO"),
        titulo: String(linha.titulo ?? "Achado de consistência"),
        detalhe: String(linha.detalhe ?? ""),
        carga_id:
          linha.carga_id === null ||
          linha.carga_id === undefined
            ? null
            : numero(linha.carga_id),
        carga_codigo:
          linha.carga_codigo === null ||
          linha.carga_codigo === undefined
            ? null
            : String(linha.carga_codigo),
        tipo_cesta_id:
          linha.tipo_cesta_id === null ||
          linha.tipo_cesta_id === undefined
            ? null
            : numero(linha.tipo_cesta_id),
        referencia_at:
          linha.referencia_at === null ||
          linha.referencia_at === undefined
            ? null
            : String(linha.referencia_at),
      };
    }),
  };
}

function Kpi({
  label,
  valor,
  detalhe,
  alerta = false,
}: {
  label: string;
  valor: string | number;
  detalhe: string;
  alerta?: boolean;
}) {
  return (
    <article
      className={
        alerta
          ? "rounded-[22px] border border-amber-300/30 bg-amber-300/[0.10] p-4"
          : "rounded-[22px] border border-white/10 bg-white/[0.07] p-4"
      }
    >
      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/50">
        {label}
      </p>
      <p className="mt-2 text-[25px] font-black tabular-nums text-white">
        {valor}
      </p>
      <p className="mt-1 text-[8px] leading-4 text-white/45">
        {detalhe}
      </p>
    </article>
  );
}

function RegraCard({
  icon,
  titulo,
  texto,
}: {
  icon: React.ReactNode;
  titulo: string;
  texto: string;
}) {
  return (
    <article className="card-premium rounded-[24px] p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700">
        {icon}
      </div>
      <p className="mt-4 text-[11px] font-black text-[#142018]">
        {titulo}
      </p>
      <p className="mt-2 text-[9px] leading-5 text-slate-500">
        {texto}
      </p>
    </article>
  );
}

export default async function ConsistenciaEstoquePage() {
  const usuario = await getCurrentUserProfile();

  if (!usuario || !usuario.ativo) {
    redirect("/");
  }

  const podeVer =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ESTOQUE_VISUALIZAR,
    ) ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ESTOQUE_MOVIMENTAR,
    ) ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ESTOQUE_AJUSTAR,
    ) ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CARGA_VISUALIZAR,
    ) ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CARGA_VISUALIZAR_TODAS,
    ) ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CARGA_GERENCIAR,
    );

  if (!podeVer) {
    redirect("/admin");
  }

  const supabase = await createClient();

  /* V68_ESTOQUE_CONSISTENCIA_RPC */
  const { data, error } = await supabase.rpc(
    "diagnostico_consistencia_estoque",
    {
      p_empresa_id: usuario.empresa.id,
      p_limite: 100,
    },
  );

  if (error) {
    console.error(
      "Erro no diagnóstico de consistência do estoque:",
      error,
    );
  }

  const diagnostico = normalizarDiagnostico(data);
  const aprovado =
    !error &&
    diagnostico.status === "APROVADO" &&
    diagnostico.resumo.criticos === 0;

  const criticos = diagnostico.achados.filter(
    (item) => item.severidade === "CRITICO",
  );

  const legados = diagnostico.achados.filter(
    (item) => item.severidade === "LEGADO",
  );

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <header className="glass flex flex-wrap items-center justify-between gap-4 rounded-[28px] px-5 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/estoque"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-[#176f3c]"
              aria-label="Voltar ao estoque"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#b07a12]">
                Qualidade operacional
              </p>
              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Consistência do estoque
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-100 bg-white px-4 py-2 text-[8px] font-black uppercase text-emerald-700">
              Modo {diagnostico.modo_controle}
            </span>

            <Link
              href="/admin/estoque/consistencia"
              className="flex h-11 items-center gap-2 rounded-[14px] bg-[#176f3c] px-5 text-[9px] font-black text-white"
            >
              <RefreshCcw size={15} />
              Executar novamente
            </Link>
          </div>
        </header>

        <section
          className={
            aprovado
              ? "hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8"
              : "relative mt-5 overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,#7f1d1d,#450a0a)] p-7 text-white shadow-[0_24px_60px_-35px_rgba(127,29,29,0.75)] md:p-8"
          }
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.04]" />

          <div className="relative z-10">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
                  {aprovado ? (
                    <BadgeCheck size={17} />
                  ) : (
                    <AlertTriangle size={17} />
                  )}
                  Certificação automática
                </div>

                <h2 className="mt-4 text-[34px] font-black tracking-[-0.055em]">
                  {aprovado
                    ? "Integridade operacional aprovada"
                    : "Existem divergências para tratar"}
                  <span className="text-[#f4b13f]">.</span>
                </h2>

                <p className="mt-3 max-w-3xl text-[11px] leading-6 text-white/65">
                  Conferência cruzada entre carga, entrega, retorno, avaria,
                  volumes físicos e saldo central. O diagnóstico é somente
                  leitura e não movimenta nenhuma cesta.
                </p>
              </div>

              <div className="rounded-[18px] border border-white/10 bg-white/[0.08] px-4 py-3 text-right">
                <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/45">
                  Executado em
                </p>
                <p className="mt-1 text-[10px] font-black">
                  {formatarDataHora(diagnostico.gerado_em)}
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded-[18px] border border-red-300/20 bg-red-950/30 px-4 py-3 text-[9px] leading-5 text-red-100">
                Não foi possível concluir o diagnóstico no banco. Nenhuma
                movimentação foi executada. Atualize a tela ou revise as
                permissões de estoque.
              </div>
            )}

            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Kpi
                label="Críticos"
                valor={diagnostico.resumo.criticos}
                detalhe="Inconsistências que exigem correção."
                alerta={diagnostico.resumo.criticos > 0}
              />
              <Kpi
                label="Saldo central"
                valor={diagnostico.resumo.saldo_central}
                detalhe="Posição física disponível."
              />
              <Kpi
                label="Em cargas"
                valor={diagnostico.resumo.saldo_em_cargas}
                detalhe="Saldo ainda em posse dos entregadores."
              />
              <Kpi
                label="Cargas ativas"
                valor={diagnostico.resumo.cargas_ativas}
                detalhe={`${diagnostico.resumo.cargas_total} carga(s) no histórico.`}
              />
              <Kpi
                label="Legado"
                valor={diagnostico.resumo.legados}
                detalhe="Histórico anterior à rastreabilidade completa."
                alerta={diagnostico.resumo.legados > 0}
              />
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          <article className="card-premium rounded-[24px] p-5">
            <Truck size={18} className="text-emerald-700" />
            <p className="mt-4 text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
              Entregues
            </p>
            <p className="mt-2 text-[24px] font-black">
              {diagnostico.resumo.entregues}
            </p>
          </article>

          <article className="card-premium rounded-[24px] p-5">
            <RotateCcw size={18} className="text-emerald-700" />
            <p className="mt-4 text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
              Retornadas
            </p>
            <p className="mt-2 text-[24px] font-black">
              {diagnostico.resumo.retornadas}
            </p>
          </article>

          <article className="card-premium rounded-[24px] p-5">
            <AlertTriangle size={18} className="text-amber-600" />
            <p className="mt-4 text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
              Avariadas
            </p>
            <p className="mt-2 text-[24px] font-black">
              {diagnostico.resumo.avariadas}
            </p>
          </article>
        </section>

        <section className="mt-7">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
              Regras auditadas
            </p>
            <h3 className="mt-1 text-[22px] font-black tracking-[-0.04em]">
              O que o sistema prova automaticamente
            </h3>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <RegraCard
              icon={<Boxes size={19} />}
              titulo="Balanço da carga"
              texto="Carregado = entregue + retornado + avariado + saldo ainda em posse. Saldo negativo é bloqueio crítico."
            />
            <RegraCard
              icon={<CircleCheckBig size={19} />}
              titulo="Carga encerrada"
              texto="Carga FINALIZADA ou CANCELADA não pode permanecer com saldo residual no item."
            />
            <RegraCard
              icon={<PackageCheck size={19} />}
              titulo="Entrega confirmada"
              texto="O total registrado em entrega_itens precisa reconciliar exatamente com a quantidade entregue da carga."
            />
            <RegraCard
              icon={<Barcode size={19} />}
              titulo="Rastreabilidade individual"
              texto="No modo VOLUME, cargas atuais precisam manter cobertura física e status dos volumes coerentes com o saldo numérico."
            />
          </div>
        </section>

        <section className="card-premium mt-7 rounded-[30px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                Resultado
              </p>
              <h3 className="mt-1 text-[21px] font-black tracking-[-0.04em]">
                Achados de consistência
              </h3>
              <p className="mt-2 text-[9px] leading-5 text-slate-500">
                Críticos impedem certificação. Itens de legado apenas
                documentam períodos anteriores à rastreabilidade completa.
              </p>
            </div>

            <div className="flex gap-2">
              <span className="rounded-full bg-red-50 px-3 py-2 text-[8px] font-black text-red-700">
                {criticos.length} crítico(s)
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-2 text-[8px] font-black text-amber-700">
                {legados.length} legado(s)
              </span>
            </div>
          </div>

          {diagnostico.achados.length === 0 ? (
            <div className="mt-5 flex items-start gap-4 rounded-[22px] border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white text-emerald-700">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-[11px] font-black text-emerald-900">
                  Nenhuma inconsistência encontrada
                </p>
                <p className="mt-1 text-[9px] leading-5 text-emerald-800/70">
                  As regras auditadas estão reconciliadas para os dados
                  disponíveis da empresa.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {diagnostico.achados.map((item, index) => {
                const critico = item.severidade === "CRITICO";

                return (
                  <article
                    key={`${item.codigo}-${item.carga_id ?? "central"}-${index}`}
                    className={
                      critico
                        ? "rounded-[22px] border border-red-200 bg-red-50/70 p-5"
                        : "rounded-[22px] border border-amber-200 bg-amber-50/70 p-5"
                    }
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div
                          className={
                            critico
                              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white text-red-600"
                              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white text-amber-600"
                          }
                        >
                          {critico ? (
                            <AlertTriangle size={18} />
                          ) : (
                            <Database size={18} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={
                                critico
                                  ? "rounded-full bg-red-100 px-2.5 py-1 text-[7px] font-black uppercase text-red-700"
                                  : "rounded-full bg-amber-100 px-2.5 py-1 text-[7px] font-black uppercase text-amber-700"
                              }
                            >
                              {rotuloSeveridade(item.severidade)}
                            </span>
                            <span className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">
                              {item.codigo}
                            </span>
                          </div>

                          <p className="mt-2 text-[11px] font-black">
                            {item.titulo}
                          </p>
                          <p className="mt-1 text-[9px] leading-5 text-slate-500">
                            {item.detalhe}
                          </p>
                          <p className="mt-2 text-[8px] text-slate-400">
                            {formatarDataHora(item.referencia_at)}
                          </p>
                        </div>
                      </div>

                      {item.carga_id ? (
                        <Link
                          href={`/admin/cargas/${item.carga_id}`}
                          className="inline-flex h-10 items-center justify-center rounded-[13px] bg-white px-4 text-[8px] font-black text-[#176f3c] shadow-sm"
                        >
                          Abrir carga
                        </Link>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="card-premium mt-7 rounded-[30px] p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-blue-50 text-blue-700">
              <Database size={19} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
                Baseline histórico
              </p>
              <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
                Saldo anterior à trilha completa
              </h3>
              <p className="mt-2 max-w-3xl text-[9px] leading-5 text-slate-500">
                O baseline legado é informativo. Ele representa saldo existente
                antes do conjunto completo de movimentos hoje disponível e não
                é tratado como divergência operacional.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {diagnostico.baseline.map((item) => (
              <article
                key={item.tipo_cesta_id}
                className="rounded-[20px] border border-slate-100 bg-[#f8faf8] p-4"
              >
                <p className="text-[9px] font-black">
                  {item.nome}
                </p>
                <p className="mt-1 text-[8px] text-slate-400">
                  {item.codigo || `Tipo ${item.tipo_cesta_id}`}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[7px] font-black uppercase text-slate-400">
                      Atual
                    </p>
                    <p className="mt-1 text-[16px] font-black">
                      {item.saldo_atual}
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] font-black uppercase text-slate-400">
                      Movimentos
                    </p>
                    <p className="mt-1 text-[16px] font-black">
                      {item.movimento_liquido_rastreado}
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] font-black uppercase text-slate-400">
                      Baseline
                    </p>
                    <p className="mt-1 text-[16px] font-black text-blue-700">
                      {item.baseline_legado}
                    </p>
                  </div>
                </div>
              </article>
            ))}

            {diagnostico.baseline.length === 0 && (
              <div className="rounded-[20px] bg-[#f8faf8] p-6 text-[9px] text-slate-400">
                Nenhum saldo central cadastrado.
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 flex items-start gap-3 rounded-[22px] border border-emerald-100 bg-emerald-50/70 px-5 py-4">
          <ShieldCheck
            size={18}
            className="mt-0.5 shrink-0 text-emerald-700"
          />
          <div>
            <p className="text-[9px] font-black text-emerald-900">
              Diagnóstico somente leitura
            </p>
            <p className="mt-1 text-[8px] leading-4 text-emerald-800/70">
              Esta rotina não executa INSERT, UPDATE ou DELETE de estoque.
              Nenhuma carga, volume, entrega, retorno ou avaria é alterada.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
