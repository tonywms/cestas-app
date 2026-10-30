"use client";

import { Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import AuditoriaOperacaoCard from "./AuditoriaOperacaoCard";

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

type Filtro =
  | "TODAS"
  | "CARGA"
  | "ENTREGA"
  | "RETORNO"
  | "AVARIA"
  | "AJUSTE";

const FILTROS: Array<{ key: Filtro; label: string }> = [
  { key: "TODAS", label: "Todas" },
  { key: "CARGA", label: "Carga para entregador" },
  { key: "ENTREGA", label: "Entrega ao cliente" },
  { key: "RETORNO", label: "Retorno ao central" },
  { key: "AVARIA", label: "Avaria" },
  { key: "AJUSTE", label: "Ajustes" },
];

function correspondeFiltro(item: MovimentoVisual, filtro: Filtro) {
  if (filtro === "TODAS") return true;
  if (filtro === "CARGA") {
    return item.tipoMovimento === "SAIDA_CENTRAL_CARGA" || item.tipoMovimento === "ENTRADA_CARGA";
  }
  if (filtro === "ENTREGA") return item.tipoMovimento === "SAIDA_CARGA_ENTREGA";
  if (filtro === "RETORNO") return item.tipoMovimento === "RETORNO_CARGA_CENTRAL";
  if (filtro === "AVARIA") return item.tipoMovimento === "AVARIA_CARGA";
  return item.tipoMovimento.includes("AJUSTE") || item.tipoMovimento === "ENTRADA_CENTRAL";
}

export default function AuditoriaOperacoesLista({
  movimentos,
}: {
  movimentos: MovimentoVisual[];
}) {
  const [filtro, setFiltro] = useState<Filtro>("TODAS");
  const [busca, setBusca] = useState("");
  const [limite, setLimite] = useState(20);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");

    return movimentos.filter((item) => {
      if (!correspondeFiltro(item, filtro)) return false;
      if (!termo) return true;

      const texto = [
        item.titulo,
        item.tipoMovimento,
        item.cestaNome,
        item.cestaCodigo,
        item.cargaCodigo ?? "",
        item.responsavelNome,
        item.entregadorNome ?? "",
        item.clienteNome ?? "",
        item.clienteCodigo ?? "",
        item.origem,
        item.destino,
        item.referencia ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      return texto.includes(termo);
    });
  }, [movimentos, filtro, busca]);

  const visiveis = filtrados.slice(0, limite);
  const restantes = Math.max(0, filtrados.length - visiveis.length);

  function mudarFiltro(novo: Filtro) {
    setFiltro(novo);
    setLimite(20);
  }

  return (
    <div className="mt-5">
      <div className="mb-4 rounded-[20px] border border-[#dde9e0] bg-white p-4 shadow-[0_12px_30px_-28px_rgba(12,77,39,0.55)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            {FILTROS.map((item) => {
              const ativo = filtro === item.key;
              const qtd = movimentos.filter((movimento) => correspondeFiltro(movimento, item.key)).length;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => mudarFiltro(item.key)}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-2 text-[9px] font-extrabold transition ${
                    ativo
                      ? "border-[#176f3c] bg-[#176f3c] text-white"
                      : "border-[#d9e5dc] bg-[#f8fbf8] text-[#58665b] hover:border-[#b9d7c2] hover:bg-[#f0f8f2]"
                  }`}
                >
                  {item.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[7px] ${ativo ? "bg-white/15" : "bg-white"}`}>
                    {qtd}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full xl:w-[290px]">
            <Search
              size={14}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#91a095]"
            />
            <input
              value={busca}
              onChange={(event) => {
                setBusca(event.target.value);
                setLimite(20);
              }}
              placeholder="Buscar carga, cliente, cesta..."
              className="h-10 w-full rounded-[13px] border border-[#d9e5dc] bg-[#fbfdfb] pl-9 pr-3 text-[10px] font-semibold text-[#1d2b20] outline-none transition placeholder:text-[#9ba69d] focus:border-[#62aa79] focus:ring-2 focus:ring-[#dff2e5]"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#eef3ef] pt-3">
          <div className="flex items-center gap-2 text-[9px] font-semibold text-[#768379]">
            <Filter size={13} />
            {filtrados.length} operação(ões) encontrada(s)
          </div>

          <p className="text-[9px] font-semibold text-[#879389]">
            Exibindo {visiveis.length} de {filtrados.length}
          </p>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[#d7e3da] bg-white px-5 py-12 text-center">
          <p className="text-[12px] font-extrabold text-[#1d2b20]">Nenhuma operação neste filtro</p>
          <p className="mt-1 text-[9px] text-[#879389]">Troque o tipo de operação ou ajuste a busca.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visiveis.map((item) => (
              <AuditoriaOperacaoCard key={item.id} item={item} />
            ))}
          </div>

          {restantes > 0 ? (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setLimite((atual) => atual + 20)}
                className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[#cfe6d6] bg-white px-6 text-[10px] font-extrabold text-[#176f3c] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f4faf6]"
              >
                Carregar mais 20
                <span className="ml-2 rounded-full bg-[#eef8f1] px-2 py-1 text-[8px] text-[#176f3c]">
                  {restantes} restante(s)
                </span>
              </button>
            </div>
          ) : filtrados.length > 20 ? (
            <p className="mt-4 text-center text-[9px] font-semibold text-[#879389]">
              Todas as operações filtradas foram exibidas.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
