export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Boxes, PackageCheck } from "lucide-react";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

import {
  ApplyButton,
  EmptyState,
  Field,
  FilterChip,
  Hero,
  Kpi,
  KpiGrid,
  ModuleHeader,
  QuickGroup,
  QuickLink,
  SectionHeader,
  SmartFilters,
  StatusBadge,
  dateTodayFortaleza,
  formatDate,
  inputClass,
  subtractDays,
} from "@/components/admin/PremiumModuleUi";

type PageProps = {
  searchParams: Promise<{
    estoque?: string;
    periodo?: string;
    tipo?: string;
    movimento?: string;
    fluxo?: string;
    responsavel?: string;
    destino?: string;
    de?: string;
    ate?: string;
  }>;
};

type MovimentoVisual = {
  id: number;
  tipoCestaId: number;
  cargaId: number | null;
  usuarioId: string | null;
  tipoMovimento: string;
  quantidade: number;
  referencia: string | null;
  observacao: string | null;
  createdAt: string;
  cestaNome: string;
  cestaCodigo: string;
  cargaCodigo: string | null;
  responsavelNome: string;
  entregadorNome: string | null;
  clienteNome: string | null;
  clienteCodigo: string | null;
  origem: string;
  destino: string;
  destinoGrupo: "CENTRAL" | "CARGA" | "CLIENTE" | "OUTRO";
  titulo: string;
  natureza: "ENTRADA" | "SAIDA" | "RETORNO" | "TRANSFERENCIA";
  registrosTecnicos?: string[];
  registrosTecnicosIds?: number[];
};

/* =========================================================
   HELPERS DE FORMATAÇÃO
========================================================= */
function formatarDataHora(valor: string) {
  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return valor;
  }

  return data.toLocaleString("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dataLocalFortaleza(valor: string) {
  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return valor.slice(0, 10);
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

function formatarTipoMovimento(tipo: string) {
  switch (tipo) {
    case "SAIDA_CENTRAL_CARGA":
      return "Saída do central para carga";
    case "ENTRADA_CARGA":
      return "Entrada na carga do entregador";
    case "SAIDA_CARGA_ENTREGA":
      return "Saída para entrega ao cliente";
    case "RETORNO_CARGA_CENTRAL":
      return "Retorno da carga ao central";
    case "ENTRADA_CENTRAL":
      return "Entrada no estoque central";
    default:
      return tipo.replaceAll("_", " ");
  }
}

/* =========================================================
   MONTAGEM DA OPERAÇÃO VISUAL
========================================================= */
function montarMovimentoVisual({
  movimento,
  tipo,
  carga,
  responsavelNome,
  entregadorNome,
  cliente,
}: {
  movimento: any;
  tipo: { codigo: string; nome: string } | undefined;
  carga: { codigo: string; entregador_id: string } | undefined;
  responsavelNome: string;
  entregadorNome: string | null;
  cliente: { codigo: string; nome: string } | undefined;
}): MovimentoVisual {
  const tipoMovimento = String(movimento.tipo_movimento);
  const cestaNome = tipo?.nome ?? "Tipo de cesta";
  const cestaCodigo = tipo?.codigo ?? "—";

  let origem = "Estoque";
  let destino = "Movimentação interna";
  let destinoGrupo: MovimentoVisual["destinoGrupo"] = "OUTRO";
  let titulo = formatarTipoMovimento(tipoMovimento);
  let natureza: MovimentoVisual["natureza"] = "TRANSFERENCIA";

  switch (tipoMovimento) {
    case "SAIDA_CENTRAL_CARGA":
      origem = "Estoque central";
      destino = entregadorNome
        ? `Carga de ${entregadorNome}`
        : carga?.codigo
          ? `Carga ${carga.codigo}`
          : "Carga do entregador";
      destinoGrupo = "CARGA";
      titulo = "Central abasteceu o entregador";
      natureza = "SAIDA";
      break;

    case "ENTRADA_CARGA":
      origem = "Estoque central";
      destino = entregadorNome
        ? `Estoque móvel de ${entregadorNome}`
        : "Estoque móvel do entregador";
      destinoGrupo = "CARGA";
      titulo = "Carga recebida pelo entregador";
      natureza = "ENTRADA";
      break;

    case "SAIDA_CARGA_ENTREGA":
      origem = entregadorNome
        ? `Estoque móvel de ${entregadorNome}`
        : "Estoque móvel";
      destino = cliente?.nome ? `Cliente ${cliente.nome}` : "Cliente";
      destinoGrupo = "CLIENTE";
      titulo = "Cesta entregue ao cliente";
      natureza = "SAIDA";
      break;

    case "RETORNO_CARGA_CENTRAL":
      origem = entregadorNome
        ? `Estoque móvel de ${entregadorNome}`
        : "Estoque móvel";
      destino = "Estoque central";
      destinoGrupo = "CENTRAL";
      titulo = "Cesta retornou ao estoque central";
      natureza = "RETORNO";
      break;

    case "ENTRADA_CENTRAL":
      origem = "Entrada / ajuste";
      destino = "Estoque central";
      destinoGrupo = "CENTRAL";
      titulo = "Entrada no estoque central";
      natureza = "ENTRADA";
      break;
  }

  return {
    id: Number(movimento.id),
    tipoCestaId: Number(movimento.tipo_cesta_id),
    cargaId: movimento.carga_id ? Number(movimento.carga_id) : null,
    usuarioId: movimento.usuario_id ? String(movimento.usuario_id) : null,
    tipoMovimento,
    quantidade: Number(movimento.quantidade ?? 0),
    referencia: movimento.referencia ? String(movimento.referencia) : null,
    observacao: movimento.observacao ? String(movimento.observacao) : null,
    createdAt: String(movimento.created_at),
    cestaNome,
    cestaCodigo,
    cargaCodigo: carga?.codigo ?? null,
    responsavelNome,
    entregadorNome,
    clienteNome: cliente?.nome ?? null,
    clienteCodigo: cliente?.codigo ?? null,
    origem,
    destino,
    destinoGrupo,
    titulo,
    natureza,
  };
}

function consolidarOperacoes(movimentos: MovimentoVisual[]) {
  const ignorar = new Set<number>();
  const pares = new Map<number, MovimentoVisual>();

  for (const saida of movimentos) {
    if (saida.tipoMovimento !== "SAIDA_CENTRAL_CARGA") {
      continue;
    }

    const entrada = movimentos.find(
      (item) =>
        item.tipoMovimento === "ENTRADA_CARGA" &&
        item.cargaId === saida.cargaId &&
        item.tipoCestaId === saida.tipoCestaId &&
        item.quantidade === saida.quantidade &&
        item.createdAt === saida.createdAt,
    );

    if (entrada) {
      ignorar.add(entrada.id);
      pares.set(saida.id, entrada);
    }
  }

  return movimentos
    .filter((item) => !ignorar.has(item.id))
    .map((item) => {
      if (item.tipoMovimento !== "SAIDA_CENTRAL_CARGA") {
        return item;
      }

      const entrada = pares.get(item.id);

      const base = {
        ...item,
        natureza: "TRANSFERENCIA" as const,
        titulo: "Carga transferida para o entregador",
        destino: item.entregadorNome
          ? `Estoque móvel de ${item.entregadorNome}`
          : item.destino,
      };

      if (!entrada) {
        return {
          ...base,
          registrosTecnicos: [item.tipoMovimento],
          registrosTecnicosIds: [item.id],
        };
      }

      return {
        ...base,
        registrosTecnicos: [item.tipoMovimento, entrada.tipoMovimento],
        registrosTecnicosIds: [item.id, entrada.id],
      };
    });
}

function rotuloOperacao(item: Pick<MovimentoVisual, "tipoMovimento">) {
  switch (item.tipoMovimento) {
    case "ENTRADA_CENTRAL":
      return "Entrada no central";
    case "SAIDA_CENTRAL_CARGA":
      return "Carga para entregador";
    case "ENTRADA_CARGA":
      return "Carga para entregador";
    case "SAIDA_CARGA_ENTREGA":
      return "Entrega ao cliente";
    case "RETORNO_CARGA_CENTRAL":
      return "Retorno ao central";
    default:
      return formatarTipoMovimento(item.tipoMovimento);
  }
}

/* Estilo visual por natureza da operação */
const estiloNatureza = {
  ENTRADA: {
    tone: "green" as const,
    cor: "text-[#14743d]",
    sinal: "+",
    faixa: "bg-[#1f8a4b]",
  },
  RETORNO: {
    tone: "blue" as const,
    cor: "text-[#1f57b8]",
    sinal: "+",
    faixa: "bg-[#2f6fd1]",
  },
  SAIDA: {
    tone: "amber" as const,
    cor: "text-[#a15f00]",
    sinal: "−",
    faixa: "bg-[#d99a2b]",
  },
  TRANSFERENCIA: {
    tone: "slate" as const,
    cor: "text-[#44524a]",
    sinal: "",
    faixa: "bg-[#8a968b]",
  },
};

/* =========================================================
   COMPONENTES DE APRESENTAÇÃO
========================================================= */
function Ponto({
  label,
  valor,
  destaque = false,
}: {
  label: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-[16px] px-4 py-3.5 ${
        destaque
          ? "bg-[#e9f7ee] ring-1 ring-inset ring-[#bfe5cb]"
          : "bg-[#f6f9f6]"
      }`}
    >
      <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#8a968b]">
        {label}
      </p>
      <p
        className={`mt-1.5 break-words text-[14px] font-bold leading-5 ${
          destaque ? "text-[#0f5a30]" : "text-[#1c2a20]"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}

function OperacaoCard({ item }: { item: MovimentoVisual }) {
  const estilo = estiloNatureza[item.natureza];
  const temAuditoria = Boolean(item.registrosTecnicos?.length);

  return (
    <article className="relative overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_0_0_1px_rgba(17,63,33,0.05),0_18px_40px_-26px_rgba(12,77,39,0.35)]">
      <span
        className={`absolute inset-y-0 left-0 w-1.5 ${estilo.faixa}`}
        aria-hidden
      />

      {/* Topo: o que aconteceu, quando e quanto */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eef2ee] px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone={estilo.tone}>{rotuloOperacao(item)}</StatusBadge>
          <span className="text-[13px] font-semibold text-[#6b786c]">
            {formatarDataHora(item.createdAt)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#f3f7f4] px-3 py-1.5 text-[12px] font-bold text-[#44524a]">
            {item.cestaNome}
            <span className="ml-1.5 text-[#8a968b]">· {item.cestaCodigo}</span>
          </span>

          <div className="rounded-[16px] bg-[#f3f9f5] px-4 py-2 text-right">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#8a968b]">
              Quantidade
            </p>
            <p
              className={`text-[24px] font-extrabold leading-tight tabular-nums ${estilo.cor}`}
            >
              {estilo.sinal}
              {item.quantidade}
            </p>
          </div>
        </div>
      </div>

      {/* Corpo */}
      <div className="grid gap-6 px-6 py-5 lg:grid-cols-[1.25fr_1fr]">
        {/* Esquerda: título, trajeto e cliente */}
        <div className="min-w-0">
          <h4 className="text-[19px] font-extrabold leading-tight tracking-[-0.02em] text-[#0f1d13]">
            {item.titulo}
          </h4>

          <div className="mt-4 grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
            <Ponto label="De" valor={item.origem} />

            <div className="hidden md:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e3f5e9] text-[#14743d]">
                <ArrowRight size={16} />
              </span>
            </div>

            <Ponto label="Para" valor={item.destino} destaque />
          </div>

          {item.clienteNome ? (
            <p className="mt-3 text-[13px] text-[#6b786c]">
              Cliente:{" "}
              <span className="font-bold text-[#1c2a20]">
                {item.clienteNome}
              </span>{" "}
              <span className="text-[#8a968b]">({item.clienteCodigo})</span>
            </p>
          ) : null}
        </div>

        {/* Direita: detalhes */}
        <div className="grid grid-cols-2 gap-3">
          <Ponto label="Responsável" valor={item.responsavelNome} />
          <Ponto
            label="Entregador"
            valor={item.entregadorNome ?? "Não se aplica"}
          />
          <Ponto label="Carga" valor={item.cargaCodigo ?? "Não se aplica"} />
          <Ponto label="Referência" valor={item.referencia ?? "—"} />
        </div>
      </div>

      {/* Rodapé: observação e auditoria técnica */}
      <div className="flex flex-col gap-3 border-t border-[#eef2ee] bg-[#fbfdfb] px-6 py-4 md:flex-row md:items-center md:justify-between">
        <p className="text-[13px] leading-5 text-[#44524a]">
          <span className="font-extrabold text-[#0f1d13]">Detalhe: </span>
          {item.observacao ?? item.titulo}
        </p>

        {temAuditoria ? (
          <details className="group shrink-0">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-extrabold text-[#14743d] [&::-webkit-details-marker]:hidden">
              Ver auditoria técnica
              <span className="text-[#8a968b] transition group-open:rotate-180">
                ▾
              </span>
            </summary>

            <div className="mt-3 space-y-2 md:absolute md:right-6 md:z-10 md:w-[320px] md:rounded-[16px] md:bg-white md:p-3 md:shadow-xl md:ring-1 md:ring-[#dfe6df]">
              {item.registrosTecnicos?.map((registro, index) => (
                <div
                  key={`${registro}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-[12px] bg-[#f3f7f4] px-3 py-2"
                >
                  <span className="text-[12px] font-bold text-[#44524a]">
                    {formatarTipoMovimento(registro)}
                  </span>
                  {item.registrosTecnicosIds?.[index] ? (
                    <span className="text-[11px] font-semibold text-[#8a968b]">
                      #{item.registrosTecnicosIds[index]}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </article>
  );
}

function SaldoCard({
  codigo,
  nome,
  quantidade,
  minimo,
  updatedAt,
}: {
  codigo: string;
  nome: string;
  quantidade: number;
  minimo: number;
  updatedAt: string;
}) {
  const baixo = quantidade <= minimo;
  const zerado = quantidade === 0;
  const progresso =
    minimo > 0 ? Math.min(100, Math.round((quantidade / (minimo * 2)) * 100)) : 100;

  return (
    <article className="rounded-[28px] border border-white bg-white p-6 shadow-[0_0_0_1px_rgba(17,63,33,0.05),0_18px_40px_-26px_rgba(12,77,39,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#b28735]">
            {codigo}
          </p>
          <h3 className="mt-1 truncate text-[18px] font-extrabold text-[#0f1d13]">
            {nome}
          </h3>
        </div>

        <StatusBadge tone={zerado ? "red" : baixo ? "amber" : "green"}>
          {zerado ? "Zerado" : baixo ? "Abaixo do mínimo" : "Normal"}
        </StatusBadge>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4 rounded-[22px] bg-[#f3f9f5] px-5 py-4">
        <div>
          <p className="text-[12px] font-bold text-[#6b786c]">Disponível agora</p>
          <p className="mt-1 text-[44px] font-extrabold leading-none tabular-nums text-[#14743d]">
            {quantidade}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[12px] font-bold text-[#6b786c]">Mínimo</p>
          <p className="mt-1 text-[22px] font-extrabold leading-none tabular-nums text-[#0f1d13]">
            {minimo}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="h-2 overflow-hidden rounded-full bg-[#e9efea]">
          <div
            className={`h-full rounded-full ${baixo ? "bg-[#d99a2b]" : "bg-[#1f8a4b]"}`}
            style={{ width: `${progresso}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[12px] font-semibold text-[#6b786c]">
          <span>
            Diferença:{" "}
            <span className={baixo ? "text-[#a15f00]" : "text-[#14743d]"}>
              {quantidade - minimo > 0 ? "+" : ""}
              {quantidade - minimo}
            </span>
          </span>
          <span>Atualizado em {formatDate(updatedAt)}</span>
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   PÁGINA
========================================================= */
export default async function EstoquePage({ searchParams }: PageProps) {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const filtros = await searchParams;
  const supabase = await createClient();

  const [saldosResult, tiposResult, movimentosResult] = await Promise.all([
    supabase
      .from("estoque_central_saldos")
      .select(`
        tipo_cesta_id,
        quantidade,
        estoque_minimo,
        updated_at
      `)
      .eq("empresa_id", usuario.empresa.id),

    supabase
      .from("tipos_cesta")
      .select(`
        id,
        codigo,
        nome,
        ativo
      `)
      .eq("empresa_id", usuario.empresa.id),

    supabase
      .from("movimentacoes_estoque")
      .select(`
        id,
        tipo_cesta_id,
        carga_id,
        usuario_id,
        tipo_movimento,
        quantidade,
        referencia,
        observacao,
        created_at
      `)
      .eq("empresa_id", usuario.empresa.id)
      .order("created_at", { ascending: false })
      .limit(400),
  ]);

  const tiposMap = new Map(
    (tiposResult.data ?? []).map((item) => [
      Number(item.id),
      {
        codigo: String(item.codigo),
        nome: String(item.nome),
        ativo: Boolean(item.ativo),
      },
    ]),
  );

  const movimentosBase = movimentosResult.data ?? [];

  const cargaIds = Array.from(
    new Set(
      movimentosBase
        .map((item) => (item.carga_id ? Number(item.carga_id) : null))
        .filter((item): item is number => item !== null),
    ),
  );

  const entregaIds = Array.from(
    new Set(
      movimentosBase
        .map((item) => {
          const referencia = String(item.referencia ?? "");
          const match = referencia.match(/^ENTREGA-(\d+)$/);
          return match ? Number(match[1]) : null;
        })
        .filter((item): item is number => item !== null),
    ),
  );

  const [cargasResult, entregasResult] = await Promise.all([
    cargaIds.length > 0
      ? supabase
          .from("cargas")
          .select(`
            id,
            codigo,
            entregador_id
          `)
          .eq("empresa_id", usuario.empresa.id)
          .in("id", cargaIds)
      : Promise.resolve({ data: [], error: null }),

    entregaIds.length > 0
      ? supabase
          .from("entregas")
          .select(`
            id,
            cliente_id,
            entregador_id,
            carga_id,
            status,
            entregue_at
          `)
          .eq("empresa_id", usuario.empresa.id)
          .in("id", entregaIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const cargasMap = new Map(
    (cargasResult.data ?? []).map((item) => [
      Number(item.id),
      {
        codigo: String(item.codigo),
        entregador_id: String(item.entregador_id),
      },
    ]),
  );

  const usuarioIds = Array.from(
    new Set([
      ...movimentosBase
        .map((item) => (item.usuario_id ? String(item.usuario_id) : null))
        .filter((item): item is string => item !== null),

      ...(cargasResult.data ?? []).map((item) => String(item.entregador_id)),

      ...(entregasResult.data ?? []).map((item) => String(item.entregador_id)),
    ]),
  );

  const clienteIds = Array.from(
    new Set(
      (entregasResult.data ?? []).map((item) => Number(item.cliente_id)),
    ),
  );

  const [usuariosResult, clientesResult] = await Promise.all([
    usuarioIds.length > 0
      ? supabase
          .from("usuarios")
          .select(`
            id,
            nome
          `)
          .in("id", usuarioIds)
      : Promise.resolve({ data: [], error: null }),

    clienteIds.length > 0
      ? supabase
          .from("clientes")
          .select(`
            id,
            codigo,
            nome
          `)
          .eq("empresa_id", usuario.empresa.id)
          .in("id", clienteIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const usuariosMap = new Map(
    (usuariosResult.data ?? []).map((item) => [String(item.id), String(item.nome)]),
  );

  const clientesMap = new Map(
    (clientesResult.data ?? []).map((item) => [
      Number(item.id),
      {
        codigo: String(item.codigo),
        nome: String(item.nome),
      },
    ]),
  );

  const entregasMap = new Map(
    (entregasResult.data ?? []).map((item) => [
      Number(item.id),
      {
        cliente_id: Number(item.cliente_id),
        entregador_id: String(item.entregador_id),
        carga_id: Number(item.carga_id),
      },
    ]),
  );

  const movimentosVisuais = movimentosBase.map((movimento) => {
    const carga = movimento.carga_id
      ? cargasMap.get(Number(movimento.carga_id))
      : undefined;

    const referencia = String(movimento.referencia ?? "");
    const entregaMatch = referencia.match(/^ENTREGA-(\d+)$/);
    const entrega = entregaMatch
      ? entregasMap.get(Number(entregaMatch[1]))
      : undefined;

    const cliente = entrega ? clientesMap.get(entrega.cliente_id) : undefined;

    const responsavelNome = movimento.usuario_id
      ? usuariosMap.get(String(movimento.usuario_id)) ?? "Usuário"
      : "Sistema / ajuste";

    const entregadorId = carga?.entregador_id ?? entrega?.entregador_id ?? null;

    const entregadorNome = entregadorId
      ? usuariosMap.get(entregadorId) ?? "Entregador"
      : null;

    return montarMovimentoVisual({
      movimento,
      tipo: tiposMap.get(Number(movimento.tipo_cesta_id)),
      carga,
      responsavelNome,
      entregadorNome,
      cliente,
    });
  });

  const operacoesVisuais = consolidarOperacoes(movimentosVisuais);

  const saldos = (saldosResult.data ?? [])
    .map((saldo) => {
      const tipo = tiposMap.get(Number(saldo.tipo_cesta_id));

      return {
        tipoId: Number(saldo.tipo_cesta_id),
        codigo: tipo?.codigo ?? "—",
        nome: tipo?.nome ?? "Tipo de cesta",
        quantidade: Number(saldo.quantidade ?? 0),
        minimo: Number(saldo.estoque_minimo ?? 0),
        updatedAt: String(saldo.updated_at ?? ""),
      };
    })
    .filter((item) => {
      if (filtros.tipo && String(item.tipoId) !== filtros.tipo) return false;
      if (filtros.estoque === "baixo" && !(item.quantidade <= item.minimo)) return false;
      if (filtros.estoque === "zerado" && item.quantidade !== 0) return false;
      if (filtros.estoque === "ok" && item.quantidade <= item.minimo) return false;
      return true;
    });

  const hoje = dateTodayFortaleza();
  let inicio: string | null = null;

  if (filtros.periodo === "hoje") {
    inicio = hoje;
  } else if (["7", "15", "30"].includes(filtros.periodo ?? "")) {
    inicio = subtractDays(hoje, Number(filtros.periodo) - 1);
  }

  const movimentos = operacoesVisuais.filter((item) => {
    const created = dataLocalFortaleza(item.createdAt);

    if (filtros.tipo && String(item.tipoCestaId) !== filtros.tipo) return false;
    if (filtros.movimento && item.tipoMovimento !== filtros.movimento) return false;

    if (filtros.fluxo === "entrada" && item.tipoMovimento !== "ENTRADA_CENTRAL") return false;

    if (
      filtros.fluxo === "carga" &&
      item.tipoMovimento !== "SAIDA_CENTRAL_CARGA" &&
      item.tipoMovimento !== "ENTRADA_CARGA"
    ) {
      return false;
    }

    if (filtros.fluxo === "cliente" && item.tipoMovimento !== "SAIDA_CARGA_ENTREGA") return false;
    if (filtros.fluxo === "retorno" && item.tipoMovimento !== "RETORNO_CARGA_CENTRAL") return false;

    if (
      filtros.responsavel &&
      item.usuarioId !== filtros.responsavel &&
      !(
        item.entregadorNome &&
        usuariosMap.get(filtros.responsavel) === item.entregadorNome
      )
    ) {
      return false;
    }

    if (filtros.destino && item.destinoGrupo !== filtros.destino) return false;

    if (filtros.de && created < filtros.de) return false;
    if (filtros.ate && created > filtros.ate) return false;

    if (!filtros.de && !filtros.ate && inicio && created < inicio) return false;

    return true;
  });

  const total = saldos.reduce((sum, item) => sum + item.quantidade, 0);
  const abaixoMinimo = saldos.filter((item) => item.quantidade <= item.minimo).length;
  const zerados = saldos.filter((item) => item.quantidade === 0).length;

  const entradasCentral = movimentos
    .filter((item) => item.tipoMovimento === "ENTRADA_CENTRAL")
    .reduce((sum, item) => sum + item.quantidade, 0);

  const cargasEntregadores = movimentos
    .filter(
      (item) =>
        item.tipoMovimento === "SAIDA_CENTRAL_CARGA" ||
        item.tipoMovimento === "ENTRADA_CARGA",
    )
    .reduce((sum, item) => sum + item.quantidade, 0);

  const entregasClientes = movimentos
    .filter((item) => item.tipoMovimento === "SAIDA_CARGA_ENTREGA")
    .reduce((sum, item) => sum + item.quantidade, 0);

  const retornosCentral = movimentos
    .filter((item) => item.tipoMovimento === "RETORNO_CARGA_CENTRAL")
    .reduce((sum, item) => sum + item.quantidade, 0);

  const activeCount = Object.values(filtros).filter(
    (value) => typeof value === "string" && value.trim(),
  ).length;

  const movimentosTipos = Array.from(
    new Set(operacoesVisuais.map((item) => item.tipoMovimento)),
  ).sort();

  const responsaveisFiltro = Array.from(usuariosMap.entries())
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const nomeTipoFiltrado = tiposResult.data?.find(
    (t) => String(t.id) === filtros.tipo,
  )?.nome;

  const nomeResponsavelFiltrado = responsaveisFiltro.find(
    (r) => r.id === filtros.responsavel,
  )?.nome;

  const chipsAtivos = [
    filtros.periodo === "hoje" && "Hoje",
    filtros.periodo === "7" && "Últimos 7 dias",
    filtros.fluxo === "entrada" && "Entrada no central",
    filtros.fluxo === "carga" && "Carga para entregador",
    filtros.fluxo === "cliente" && "Entrega ao cliente",
    filtros.fluxo === "retorno" && "Retorno ao central",
    filtros.destino === "CENTRAL" && "Destino: estoque central",
    filtros.destino === "CARGA" && "Destino: carga / entregador",
    filtros.destino === "CLIENTE" && "Destino: cliente",
    nomeTipoFiltrado && `Cesta: ${nomeTipoFiltrado}`,
    nomeResponsavelFiltrado && `Responsável: ${nomeResponsavelFiltrado}`,
    filtros.de && `De ${formatDate(filtros.de)}`,
    filtros.ate && `Até ${formatDate(filtros.ate)}`,
  ].filter(Boolean) as string[];

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[1180px]">
        <ModuleHeader
          eyebrow="Estoque"
          title="Estoque central"
          actions={
            <>
              <Link
                href="/admin/cargas"
                className="inline-flex h-11 items-center rounded-[14px] border border-[#cfe6d6] bg-white px-5 text-[13px] font-extrabold text-[#14743d] transition hover:-translate-y-0.5 hover:bg-[#f4faf6]"
              >
                Cargas
              </Link>

              <Link
                href="/admin/volumes"
                className="inline-flex h-11 items-center rounded-[14px] bg-[linear-gradient(135deg,#1f8a4b,#0c4d27)] px-5 text-[13px] font-extrabold text-white shadow-[0_14px_26px_-12px_rgba(17,92,48,0.7)] transition hover:-translate-y-0.5"
              >
                Volumes
              </Link>
            </>
          }
        />

        <Hero
          eyebrow="Saldo central"
          title="Estoque disponível"
          description="Acompanhe o saldo físico, o mínimo operacional e o caminho completo de cada cesta."
        >
          <KpiGrid>
            <Kpi label="Saldo total" value={total} highlight />
            <Kpi label="Tipos de cesta" value={saldos.length} />
            <Kpi label="Abaixo do mínimo" value={abaixoMinimo} warning={abaixoMinimo > 0} />
            <Kpi label="Zerados" value={zerados} warning={zerados > 0} />
            <Kpi label="Entrada no central" value={entradasCentral} />
            <Kpi label="Enviadas aos entregadores" value={cargasEntregadores} />
            <Kpi label="Entregues aos clientes" value={entregasClientes} />
            <Kpi label="Retornos ao central" value={retornosCentral} />
          </KpiGrid>
        </Hero>

        <SmartFilters
          resetHref="/admin/estoque"
          activeCount={activeCount}
          description="Escolha o que você quer ver"
          chips={
            chipsAtivos.length > 0 ? (
              chipsAtivos.map((chip) => <FilterChip key={chip}>{chip}</FilterChip>)
            ) : null
          }
          quick={
            <>
              <QuickGroup
                title="Saldo dos produtos"
                hint="Afeta apenas os cards de saldo abaixo"
              >
                <QuickLink href="/admin/estoque" active={!filtros.estoque}>
                  Todos
                </QuickLink>
                <QuickLink
                  href="/admin/estoque?estoque=ok"
                  active={filtros.estoque === "ok"}
                >
                  Estoque normal
                </QuickLink>
                <QuickLink
                  href="/admin/estoque?estoque=baixo"
                  active={filtros.estoque === "baixo"}
                  tone="gold"
                >
                  Abaixo do mínimo
                </QuickLink>
                <QuickLink
                  href="/admin/estoque?estoque=zerado"
                  active={filtros.estoque === "zerado"}
                  tone="gold"
                >
                  Zerado
                </QuickLink>
              </QuickGroup>

              <div className="border-t border-dashed border-[#dfe6df] pt-5">
                <QuickGroup
                  title="Histórico de operações"
                  hint="Afeta apenas a auditoria abaixo"
                >
                  <QuickLink
                    href="/admin/estoque"
                    active={!filtros.periodo && !filtros.fluxo}
                  >
                    Todas
                  </QuickLink>
                  <QuickLink
                    href="/admin/estoque?periodo=hoje"
                    active={filtros.periodo === "hoje"}
                  >
                    Hoje
                  </QuickLink>
                  <QuickLink
                    href="/admin/estoque?periodo=7"
                    active={filtros.periodo === "7"}
                  >
                    Últimos 7 dias
                  </QuickLink>
                  <QuickLink
                    href="/admin/estoque?fluxo=entrada"
                    active={filtros.fluxo === "entrada"}
                  >
                    Entradas no central
                  </QuickLink>
                  <QuickLink
                    href="/admin/estoque?fluxo=carga"
                    active={filtros.fluxo === "carga"}
                  >
                    Envios aos entregadores
                  </QuickLink>
                  <QuickLink
                    href="/admin/estoque?fluxo=cliente"
                    active={filtros.fluxo === "cliente"}
                  >
                    Entregas aos clientes
                  </QuickLink>
                  <QuickLink
                    href="/admin/estoque?fluxo=retorno"
                    active={filtros.fluxo === "retorno"}
                    tone="gold"
                  >
                    Retornos ao central
                  </QuickLink>
                </QuickGroup>
              </div>
            </>
          }
        >
          <form method="get" className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <Field label="Tipo de cesta">
              <select name="tipo" defaultValue={filtros.tipo ?? ""} className={inputClass}>
                <option value="">Todos</option>
                {(tiposResult.data ?? []).map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tipo de operação">
              <select name="movimento" defaultValue={filtros.movimento ?? ""} className={inputClass}>
                <option value="">Todas</option>
                {movimentosTipos.map((movimento) => (
                  <option key={movimento} value={movimento}>
                    {rotuloOperacao({ tipoMovimento: movimento })}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Responsável / entregador">
              <select
                name="responsavel"
                defaultValue={filtros.responsavel ?? ""}
                className={inputClass}
              >
                <option value="">Todos</option>
                {responsaveisFiltro.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Destino">
              <select name="destino" defaultValue={filtros.destino ?? ""} className={inputClass}>
                <option value="">Todos</option>
                <option value="CENTRAL">Estoque central</option>
                <option value="CARGA">Carga / entregador</option>
                <option value="CLIENTE">Cliente</option>
              </select>
            </Field>

            <Field label="Data inicial">
              <input type="date" name="de" defaultValue={filtros.de ?? ""} className={inputClass} />
            </Field>

            <Field label="Data final">
              <input type="date" name="ate" defaultValue={filtros.ate ?? ""} className={inputClass} />
            </Field>

            <div className="md:col-span-2 xl:col-span-6">
              <ApplyButton />
            </div>
          </form>
        </SmartFilters>

        {/* Saldos */}
        <section className="mt-10">
          <SectionHeader
            eyebrow="Saldo atual"
            title="Quantidade por tipo de cesta"
            description="Barra verde: estoque saudável. Barra dourada: abaixo do mínimo."
            right={
              <span className="inline-flex items-center gap-2 rounded-full border border-[#cfe6d6] bg-white px-4 py-2 text-[13px] font-extrabold text-[#14743d] shadow-sm">
                <Boxes size={16} />
                {saldos.length} tipo(s)
              </span>
            }
          />

          {saldos.length === 0 ? (
            <EmptyState
              title="Nenhum saldo encontrado"
              text="Nenhum tipo de cesta corresponde ao filtro de saldo selecionado."
            />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {saldos.map((item) => (
                <SaldoCard
                  key={item.tipoId}
                  codigo={item.codigo}
                  nome={item.nome}
                  quantidade={item.quantidade}
                  minimo={item.minimo}
                  updatedAt={item.updatedAt}
                />
              ))}
            </div>
          )}
        </section>

        {/* Auditoria */}
        <section className="mt-12">
          <SectionHeader
            eyebrow="Auditoria operacional"
            title="O que aconteceu com cada cesta?"
            description="Cada cartão mostra uma operação real: de onde saiu, para onde foi, quem fez e quando."
            right={
              <span className="inline-flex items-center gap-2 rounded-full border border-[#cfe6d6] bg-white px-4 py-2 text-[13px] font-extrabold text-[#14743d] shadow-sm">
                <PackageCheck size={16} />
                {movimentos.length} operação(ões)
              </span>
            }
          />

          {movimentos.length === 0 ? (
            <EmptyState
              title="Nenhuma operação encontrada"
              text="Ajuste os filtros de período, responsável ou destino para ver outras operações."
            />
          ) : (
            <div className="space-y-5">
              {movimentos.slice(0, 100).map((item) => (
                <OperacaoCard key={item.id} item={item} />
              ))}

              {movimentos.length > 100 ? (
                <p className="pt-2 text-center text-[13px] font-semibold text-[#6b786c]">
                  Mostrando as 100 operações mais recentes. Use os filtros para refinar a busca.
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
