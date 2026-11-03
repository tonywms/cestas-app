import { categoriaDiagnostico, rotuloSeveridade, rotuloTecnico } from "@/lib/ui/rotulo-tecnico";

export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  TestTube2,
  UsersRound,
} from "lucide-react";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  avaliarCredito,
  dataLimiteAtraso,
  POLITICA_CREDITO_PADRAO,
  type PoliticaCredito,
} from "@/lib/credito/avaliar-credito";
import { createClient } from "@/lib/supabase/server";

/* V69_CREDITO_QA_RPC */

type Achado = {
  severidade: "CRITICO" | "ATENCAO" | "INFO";
  codigo: string;
  titulo: string;
  detalhe: string;
  cliente_id: number | null;
  cliente_codigo: string | null;
  cliente_nome: string | null;
  referencia_at: string | null;
};

type Diagnostico = {
  gerado_em: string;
  status: "APROVADO" | "CRITICO";
  politica: {
    alerta_qtd_atrasos: number;
    bloqueio_qtd_atrasos: number;
    dias_tolerancia: number;
    permitir_excecao: boolean;
    validade_excecao_dias: number;
    hoje: string;
    limite_atraso: string;
  };
  resumo: {
    clientes_ativos: number;
    parcelas_abertas: number;
    parcelas_vencidas: number;
    saldo_aberto: number;
    saldo_vencido: number;
    excecoes_validas: number;
    excecoes_expiradas_ativas: number;
    liberados: number;
    alertas: number;
    bloqueados: number;
    liberados_excecao: number;
    criticos: number;
    atencoes: number;
    informativos: number;
  };
  achados: Achado[];
};

type Cenario = {
  nome: string;
  esperado: string;
  obtido: string;
  ok: boolean;
  detalhe: string;
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}

function dataHora(valor: string | null | undefined) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function politicaDoDiagnostico(d: Diagnostico): PoliticaCredito {
  return {
    alertaQtdAtrasos: Number(d.politica.alerta_qtd_atrasos),
    bloqueioQtdAtrasos: Number(d.politica.bloqueio_qtd_atrasos),
    diasTolerancia: Number(d.politica.dias_tolerancia),
    permitirExcecao: Boolean(d.politica.permitir_excecao),
    validadeExcecaoDias: Number(d.politica.validade_excecao_dias),
  };
}

function montarCenarios(politica: PoliticaCredito): Cenario[] {
  const agora = new Date("2026-11-02T18:00:00-03:00");
  const futura = {
    id: 999001,
    motivo: "Cenário QA",
    validoAte: "2026-11-03T18:00:00-03:00",
  };
  const expirada = {
    id: 999002,
    motivo: "Cenário QA expirado",
    validoAte: "2026-11-01T18:00:00-03:00",
  };

  const liberado = avaliarCredito({
    qtdAtrasos: 0,
    politica,
    liberacaoAtiva: null,
    agora,
  });
  const alerta = avaliarCredito({
    qtdAtrasos: politica.alertaQtdAtrasos,
    politica,
    liberacaoAtiva: null,
    agora,
  });
  const bloqueado = avaliarCredito({
    qtdAtrasos: politica.bloqueioQtdAtrasos,
    politica,
    liberacaoAtiva: null,
    agora,
  });
  const excecao = avaliarCredito({
    qtdAtrasos: politica.bloqueioQtdAtrasos,
    politica: { ...politica, permitirExcecao: true },
    liberacaoAtiva: futura,
    agora,
  });
  const excecaoExpirada = avaliarCredito({
    qtdAtrasos: politica.bloqueioQtdAtrasos,
    politica: { ...politica, permitirExcecao: true },
    liberacaoAtiva: expirada,
    agora,
  });
  const excecaoDesativada = avaliarCredito({
    qtdAtrasos: politica.bloqueioQtdAtrasos,
    politica: { ...politica, permitirExcecao: false },
    liberacaoAtiva: futura,
    agora,
  });
  const limite = dataLimiteAtraso("2026-11-02", 3);

  return [
    {
      nome: "Sem atraso",
      esperado: "LIBERADO",
      obtido: liberado.statusEfetivo,
      ok: liberado.statusEfetivo === "LIBERADO" && !liberado.bloqueado,
      detalhe: "Zero parcelas vencidas deve manter o cliente liberado.",
    },
    {
      nome: "Faixa de alerta",
      esperado: "ALERTA",
      obtido: alerta.statusEfetivo,
      ok: alerta.statusEfetivo === "ALERTA" && !alerta.bloqueado,
      detalhe: "Ao atingir o limite de alerta, o crédito sinaliza risco sem bloquear.",
    },
    {
      nome: "Faixa de bloqueio",
      esperado: "BLOQUEADO",
      obtido: bloqueado.statusEfetivo,
      ok: bloqueado.statusEfetivo === "BLOQUEADO" && bloqueado.bloqueado,
      detalhe: "Ao atingir o limite de bloqueio, novas operações de crédito devem parar.",
    },
    {
      nome: "Exceção válida",
      esperado: "LIBERADO_EXCECAO",
      obtido: excecao.statusEfetivo,
      ok: excecao.statusEfetivo === "LIBERADO_EXCECAO" && excecao.liberadoPorExcecao,
      detalhe: "Cliente bloqueado pode ser liberado temporariamente quando a política permite.",
    },
    {
      nome: "Exceção vencida",
      esperado: "BLOQUEADO",
      obtido: excecaoExpirada.statusEfetivo,
      ok: excecaoExpirada.statusEfetivo === "BLOQUEADO" && excecaoExpirada.bloqueado,
      detalhe: "Exceção expirada não pode continuar liberando crédito.",
    },
    {
      nome: "Exceção desativada",
      esperado: "BLOQUEADO",
      obtido: excecaoDesativada.statusEfetivo,
      ok: excecaoDesativada.statusEfetivo === "BLOQUEADO" && excecaoDesativada.bloqueado,
      detalhe: "Com exceções desativadas, uma liberação existente não pode furar o bloqueio.",
    },
    {
      nome: "Tolerância de vencimento",
      esperado: "2026-10-30",
      obtido: limite,
      ok: limite === "2026-10-30",
      detalhe: "Com 3 dias de tolerância em 02/11/2026, somente vencimentos anteriores a 30/10 contam como atraso.",
    },
  ];
}

export default async function ConsistenciaCreditoPage() {
  const usuario = await getCurrentUserProfile();
  if (!usuario || !usuario.ativo) redirect("/");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("diagnostico_credito_qa", {
    p_empresa_id: usuario.empresa.id,
    p_limite: 100,
  });

  if (error || !data) {
    return (
      <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
        <div className="mx-auto max-w-[1180px]">
          <Link href="/admin/credito" className="inline-flex h-11 items-center gap-2 rounded-[14px] border border-slate-200 bg-white px-4 text-[10px] font-black text-slate-600">
            <ArrowLeft size={16} /> Voltar ao crédito
          </Link>
          <section className="mt-5 rounded-[30px] border border-red-200 bg-red-50 p-7">
            <ShieldAlert size={26} className="text-red-600" />
            <h1 className="mt-4 text-[24px] font-black">Não foi possível executar a certificação de crédito.</h1>
            <p className="mt-2 text-[10px] leading-5 text-red-700">{error?.message ?? "Diagnóstico indisponível."}</p>
          </section>
        </div>
      </main>
    );
  }

  const diagnostico = data as unknown as Diagnostico;
  const politica = politicaDoDiagnostico(diagnostico);
  const cenarios = montarCenarios(politica);
  const falhasMotor = cenarios.filter((item) => !item.ok).length;
  const aprovado = diagnostico.resumo.criticos === 0 && falhasMotor === 0;

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[1480px]">
        <header className="glass flex flex-wrap items-center justify-between gap-4 rounded-[28px] px-5 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/credito" className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-[#176f3c]">
              <ArrowLeft size={19} />
            </Link>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.20em] text-[#b07a12]">Qualidade financeira</p>
              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">Certificação do crédito</h1>
            </div>
          </div>
          <a href="/admin/credito/consistencia" className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-[#176f3c] px-5 text-[10px] font-black text-white">
            <RefreshCcw size={15} /> Executar novamente
          </a>
        </header>

        <section className={`grain relative mt-5 overflow-hidden rounded-[34px] border p-7 text-white md:p-8 ${aprovado ? "border-emerald-700 bg-[linear-gradient(135deg,#176f3c,#063c20)]" : "border-red-700 bg-[linear-gradient(135deg,#8d1f1f,#4f1111)]"}`}>
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.04]" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
              {aprovado ? <BadgeCheck size={16} /> : <ShieldAlert size={16} />}
              Certificação automática
            </div>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-5">
              <div>
                <h2 className="text-[32px] font-black tracking-[-0.055em]">
                  {aprovado ? "Motor de crédito aprovado" : "Crédito exige correção"}<span className="text-[#f4b13f]">.</span>
                </h2>
                <p className="mt-2 max-w-3xl text-[11px] leading-6 text-white/65">
                  O diagnóstico cruza política, parcelas e liberações e executa cenários no mesmo motor usado pelas operações reais. É somente leitura.
                </p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/[0.08] px-4 py-3 text-right">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/50">Executado em</p>
                <p className="mt-1 text-[11px] font-black">{dataHora(diagnostico.gerado_em)}</p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-6">
              <HeroKpi label="Críticos" valor={diagnostico.resumo.criticos + falhasMotor} />
              <HeroKpi label="Clientes" valor={diagnostico.resumo.clientes_ativos} />
              <HeroKpi label="Parcelas abertas" valor={diagnostico.resumo.parcelas_abertas} />
              <HeroKpi label="Vencidas" valor={diagnostico.resumo.parcelas_vencidas} />
              <HeroKpi label="Bloqueados" valor={diagnostico.resumo.bloqueados} />
              <HeroKpi label="Exceções válidas" valor={diagnostico.resumo.excecoes_validas} />
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <ResumoCard icon={<CircleDollarSign size={17} />} label="Saldo em aberto" valor={moeda(diagnostico.resumo.saldo_aberto)} detalhe="Carteira ainda a receber." />
          <ResumoCard icon={<AlertTriangle size={17} />} label="Saldo vencido" valor={moeda(diagnostico.resumo.saldo_vencido)} detalhe={`Vencimentos anteriores a ${diagnostico.politica.limite_atraso}.`} />
          <ResumoCard icon={<UsersRound size={17} />} label="Liberados" valor={String(diagnostico.resumo.liberados)} detalhe="Sem bloqueio pela regra atual." />
          <ResumoCard icon={<ShieldAlert size={17} />} label="Alertas" valor={String(diagnostico.resumo.alertas)} detalhe="Atingiram a faixa de atenção." />
          <ResumoCard icon={<ShieldCheck size={17} />} label="Liberados por exceção" valor={String(diagnostico.resumo.liberados_excecao)} detalhe="Bloqueio contornado por autorização válida." />
        </section>

        <section className="card-premium mt-6 rounded-[30px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b07a12]">Política vigente</p>
              <h3 className="mt-1 text-[21px] font-black tracking-[-0.04em]">Parâmetros que governam o crédito</h3>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">Os mesmos valores são consumidos pelo Admin, contratos e Mobile.</p>
            </div>
            <Link href="/admin/credito" className="inline-flex h-10 items-center rounded-[13px] border border-emerald-100 bg-white px-4 text-[10px] font-black text-[#176f3c]">Abrir gestão de crédito</Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <PolicyCard label="Alerta" value={`${politica.alertaQtdAtrasos} atraso(s)`} />
            <PolicyCard label="Bloqueio" value={`${politica.bloqueioQtdAtrasos} atraso(s)`} />
            <PolicyCard label="Tolerância" value={`${politica.diasTolerancia} dia(s)`} />
            <PolicyCard label="Exceções" value={politica.permitirExcecao ? "Permitidas" : "Desativadas"} />
            <PolicyCard label="Validade" value={`${politica.validadeExcecaoDias} dia(s)`} />
          </div>
        </section>

        {/* V69_1_PREMIUM_LAYOUT */}
        <section className="mt-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b07a12]">Teste do motor</p>
              <h3 className="mt-1 text-[24px] font-black tracking-[-0.045em] text-[#142018]">7 cenários determinísticos</h3>
              <p className="mt-2 max-w-3xl text-[11px] leading-5 text-slate-500">Se o código central mudar e quebrar uma regra, esta seção reprova automaticamente. O grid se reorganiza sem cortar conteúdo ou deixar cards órfãos.</p>
            </div>
            <span className={`inline-flex h-9 shrink-0 items-center justify-center self-start rounded-full px-4 text-[10px] font-black lg:self-auto ${falhasMotor === 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {cenarios.length - falhasMotor}/{cenarios.length} aprovados
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
            {cenarios.map((item, index) => (
              <article
                key={item.nome}
                className={`flex min-h-[230px] min-w-0 flex-col rounded-[26px] border p-5 shadow-[0_12px_28px_rgba(16,55,35,0.045)] md:p-6 ${index < 4 ? "xl:col-span-3" : "xl:col-span-4"} ${item.ok ? "border-emerald-100 bg-white" : "border-red-200 bg-red-50"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${item.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {item.ok ? <CheckCircle2 size={19} /> : <ShieldAlert size={19} />}
                  </div>
                  <span className={`inline-flex min-h-7 shrink-0 items-center rounded-full px-3 text-[9px] font-black uppercase tracking-[0.02em] ${item.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {item.ok ? "Aprovado" : "Reprovado"}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="mt-5 break-words text-[15px] font-black leading-5 text-[#142018]">{item.nome}</p>
                  <p className="mt-2 break-words text-[11px] leading-5 text-slate-500">{item.detalhe}</p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Mini label="Esperado" value={rotuloTecnico(item.esperado)} />
                  <Mini label="Obtido" value={rotuloTecnico(item.obtido)} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="card-premium mt-7 rounded-[30px] p-5 md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b07a12]">Dados reais</p>
              <h3 className="mt-1 text-[22px] font-black tracking-[-0.04em] text-[#142018]">Achados de consistência</h3>
              <p className="mt-2 max-w-3xl text-[11px] leading-5 text-slate-500">Críticos reprovam. Atenções pedem limpeza operacional. Informativos não bloqueiam a certificação.</p>
            </div>
            <div className="flex flex-wrap gap-2 xl:justify-end">
              <Badge tone="red">{diagnostico.resumo.criticos} crítico(s)</Badge>
              <Badge tone="amber">{diagnostico.resumo.atencoes} atenção(ões)</Badge>
              <Badge tone="slate">{diagnostico.resumo.informativos} informativo(s)</Badge>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {diagnostico.achados.length === 0 ? (
              <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/60 p-8 text-center">
                <CheckCircle2 size={26} className="mx-auto text-emerald-700" />
                <p className="mt-3 text-[14px] font-black">Nenhuma inconsistência encontrada</p>
              </div>
            ) : diagnostico.achados.map((item, index) => (
              <article
                key={`${item.codigo}-${item.cliente_id ?? "geral"}-${index}`}
                className={`min-w-0 rounded-[24px] border p-5 md:p-6 ${item.severidade === "CRITICO" ? "border-red-200 bg-red-50" : item.severidade === "ATENCAO" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}
              >
                <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <Badge tone={item.severidade === "CRITICO" ? "red" : item.severidade === "ATENCAO" ? "amber" : "slate"}>{rotuloSeveridade(item.severidade)}</Badge>
                      <span className="min-w-0 break-words text-[9px] font-bold text-slate-400">{categoriaDiagnostico(item.codigo)}</span>
                    </div>
                    <p className="mt-4 break-words text-[14px] font-black leading-5 text-[#142018]">{item.titulo}</p>
                    <p className="mt-2 max-w-5xl break-words text-[11px] leading-5 text-slate-500">{item.detalhe}</p>
                    {item.referencia_at && <p className="mt-3 text-[9px] font-semibold text-slate-400">{dataHora(item.referencia_at)}</p>}
                  </div>
                  {item.cliente_id && (
                    <Link href={`/admin/clientes/${item.cliente_id}`} className="inline-flex h-11 w-full shrink-0 items-center justify-center rounded-[14px] border border-slate-200 bg-white px-5 text-[10px] font-black text-[#176f3c] transition hover:bg-emerald-50 md:w-auto">Abrir cliente</Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-7 flex items-start gap-4 rounded-[24px] border border-emerald-100 bg-emerald-50/70 px-5 py-5">
          <TestTube2 size={19} className="mt-0.5 shrink-0 text-emerald-700" />
          <div className="min-w-0">
            <p className="text-[11px] font-black text-emerald-900">Diagnóstico somente leitura</p>
            <p className="mt-1 break-words text-[10px] leading-5 text-emerald-800/75">A V69 não cria, paga, altera ou cancela parcelas; não libera nem revoga crédito. Apenas testa o motor e audita a consistência dos dados existentes.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function HeroKpi({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-[19px] border border-white/10 bg-white/[0.07] px-4 py-3.5 backdrop-blur">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/50">{label}</p>
      <p className="mt-1.5 text-[24px] font-black text-white">{valor}</p>
    </div>
  );
}

function ResumoCard({ icon, label, valor, detalhe }: { icon: React.ReactNode; label: string; valor: string; detalhe: string }) {
  return (
    <div className="card-premium rounded-[24px] p-5">
      <div className="text-emerald-700">{icon}</div>
      <p className="mt-4 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 text-[22px] font-black tracking-[-0.04em]">{valor}</p>
      <p className="mt-1 text-[10px] leading-5 text-slate-500">{detalhe}</p>
    </div>
  );
}

function PolicyCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[19px] border border-slate-100 bg-[#fbfdfb] p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 text-[14px] font-black">{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[15px] border border-slate-100 bg-[#f6f9f6] px-3.5 py-3">
      <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1.5 min-w-0 break-words text-[10px] font-black leading-4 text-slate-700">{value}</p>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "red" | "amber" | "slate" }) {
  const cls = tone === "red" ? "bg-red-50 text-red-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
  return <span className={`inline-flex min-h-8 items-center rounded-full px-3.5 py-1.5 text-[9px] font-black ${cls}`}>{children}</span>;
}
