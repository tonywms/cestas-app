"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  Upload,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Linha = {
  linha: number;
  codigo: string;
  nome: string;
  cpf_cnpj: string;
  telefone: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  status: "NOVO" | "ATUALIZAR" | "SEM_ALTERACAO" | "REVISAR" | "ERRO";
  mensagens: string[];
  clienteExistenteId: number | null;
  clienteExistenteNome: string | null;
  identificadoPor: string | null;
  alteracoes: string[];
};

type Analise = {
  ok: boolean;
  arquivo: string;
  aba: string;
  resumo: {
    total: number;
    novos: number;
    atualizar: number;
    semAlteracao: number;
    revisar: number;
    erros: number;
  };
  linhas: Linha[];
  previewLimitado?: boolean;
  message?: string;
};

type Resultado = {
  ok: boolean;
  message: string;
  novosImportados?: number;
  atualizados?: number;
  semAlteracao?: number;
  revisar?: number;
  errosPlanilha?: number;
  falhas?: Array<{
    codigo: string;
    nome: string;
    mensagem: string;
  }>;
};

export default function ImportarClientesClient() {
  const router = useRouter();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [carregando, setCarregando] = useState<"analisar" | "importar" | null>(null);
  const [erro, setErro] = useState("");

  async function enviar(modo: "analisar" | "importar") {
    if (!arquivo) {
      setErro("Selecione uma planilha Excel .xlsx.");
      return;
    }

    setCarregando(modo);
    setErro("");

    try {
      const formData = new FormData();
      formData.set("arquivo", arquivo);
      formData.set("modo", modo);

      const response = await fetch("/api/admin/clientes/importar", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setErro(
          payload.message ??
            "Não foi possível processar a planilha.",
        );
        return;
      }

      if (modo === "analisar") {
        setAnalise(payload as Analise);
        setResultado(null);
        return;
      }

      setResultado(payload as Resultado);
      setAnalise(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      setErro(
        "Não foi possível enviar a planilha. Verifique sua conexão e tente novamente.",
      );
    } finally {
      setCarregando(null);
    }
  }

  function trocarArquivo(file: File | null) {
    setArquivo(file);
    setAnalise(null);
    setResultado(null);
    setErro("");
  }

  return (
    <div className="mt-5 space-y-5">
      <section className="card-premium rounded-[30px] p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
              1. Prepare o arquivo
            </p>
            <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
              Use o modelo oficial
            </h3>
            <p className="mt-2 max-w-[650px] text-[10px] leading-5 text-slate-500">
              Obrigatórios: Nome, Telefone, Endereço, Número e Bairro. Código de referência é opcional e serve para cruzamento com ERP/legado.
            </p>
          </div>

          <a
            href="/modelos/MODELO_IMPORTACAO_CLIENTES_CESTAS_APP.xlsx"
            download
            className="inline-flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 text-[9px] font-black text-[#176f3c]"
          >
            <Download size={15} />
            Baixar modelo Excel
          </a>
        </div>

        <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-emerald-200 bg-emerald-50/40 px-5 py-8 text-center transition hover:bg-emerald-50">
          <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-white text-[#176f3c] shadow-sm">
            <Upload size={21} />
          </div>

          <p className="mt-3 text-[12px] font-black">
            {arquivo ? arquivo.name : "Selecionar planilha .xlsx"}
          </p>

          <p className="mt-1 text-[9px] text-slate-400">
            Até 5.000 clientes por arquivo • máximo 10 MB
          </p>

          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(event) =>
              trocarArquivo(event.target.files?.[0] ?? null)
            }
          />
        </label>

        <button
          type="button"
          disabled={!arquivo || carregando !== null}
          onClick={() => enviar("analisar")}
          className="mt-4 flex h-[48px] w-full items-center justify-center gap-2 rounded-[15px] bg-[#176f3c] text-[10px] font-black text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {carregando === "analisar" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <FileSpreadsheet size={16} />
          )}
          Analisar planilha antes de importar
        </button>

        {erro && (
          <div className="mt-4 flex items-start gap-3 rounded-[18px] border border-red-200 bg-red-50 p-4 text-red-700">
            <XCircle size={18} className="mt-0.5 shrink-0" />
            <p className="text-[10px] font-bold leading-5">{erro}</p>
          </div>
        )}
      </section>

      {analise && (
        <section className="card-premium overflow-hidden rounded-[30px]">
          <div className="border-b border-slate-100 px-5 py-5 md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
                  2. Pré-validação
                </p>
                <h3 className="mt-1 text-[19px] font-black tracking-[-0.04em]">
                  Resultado da análise
                </h3>
              </div>

              <button
                type="button"
                onClick={() => enviar("analisar")}
                disabled={carregando !== null}
                className="inline-flex h-[38px] items-center gap-2 rounded-[13px] border border-slate-200 bg-white px-3 text-[8px] font-black text-slate-500"
              >
                <RotateCcw size={13} />
                Analisar novamente
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
              <Resumo label="Clientes analisados" valor={analise.resumo.total} />
              <Resumo label="Novos" valor={analise.resumo.novos} tone="green" />
              <Resumo label="Atualizar" valor={analise.resumo.atualizar} tone="sky" />
              <Resumo label="Sem alteração" valor={analise.resumo.semAlteracao} />
              <Resumo label="Revisar" valor={analise.resumo.revisar} tone="amber" />
              <Resumo label="Erros" valor={analise.resumo.erros} tone="red" />
            </div>

            <div className="mt-3 rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-[9px] leading-5 text-slate-500">
              <span className="font-black text-slate-700">Contagem:</span> {analise.resumo.total} cliente(s) encontrado(s). A coluna <span className="font-black">Cliente</span> mostra 1, 2, 3...; <span className="font-black">Linha Excel</span> mantém a posição original para auditoria.
            </div>

            {(analise.resumo.atualizar > 0 || analise.resumo.revisar > 0) && (
              <div className="mt-4 rounded-[18px] border border-sky-200 bg-sky-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={17} className="mt-0.5 shrink-0 text-sky-700" />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-sky-700">
                      Análise inteligente de cadastros
                    </p>
                    <p className="mt-1 text-[10px] leading-5 text-slate-600">
                      O sistema compara código de referência, CPF/CNPJ e telefone. Atualizações seguras mostram exatamente o que mudou. Linhas marcadas como REVISAR nunca são gravadas automaticamente.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-[#f7faf7] text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Linha Excel</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Código referência</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">CPF/CNPJ</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Endereço</th>
                  <th className="px-4 py-3">Identificação</th>
                  <th className="px-4 py-3">Observação / diferenças</th>
                </tr>
              </thead>
              <tbody>
                {analise.linhas.map((linha, index) => (
                  <tr key={linha.linha} className="border-t border-slate-100 text-[9px]">
                    <td className="px-4 py-3 font-black">#{index + 1}</td>
                    <td className="px-4 py-3 text-slate-400">{linha.linha}</td>
                    <td className="px-4 py-3">
                      <Status status={linha.status} />
                    </td>
                    <td className="px-4 py-3 font-bold">{linha.codigo || "Gerado pelo sistema"}</td>
                    <td className="px-4 py-3 font-black">{linha.nome || "—"}</td>
                    <td className="px-4 py-3">{linha.cpf_cnpj || "—"}</td>
                    <td className="px-4 py-3 font-bold">{linha.telefone || "—"}</td>
                    <td className="max-w-[230px] px-4 py-3 text-slate-500">
                      {linha.logradouro
                        ? `${linha.logradouro}${linha.numero ? `, ${linha.numero}` : ""}${linha.bairro ? ` - ${linha.bairro}` : ""}`
                        : "—"}
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      {linha.clienteExistenteNome ? (
                        <div>
                          <p className="font-black text-slate-700">{linha.clienteExistenteNome}</p>
                          <p className="mt-1 text-[7px] font-black uppercase tracking-[0.08em] text-slate-400">
                            {linha.identificadoPor ?? "Cadastro existente"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">Novo cadastro</span>
                      )}
                    </td>
                    <td className="max-w-[430px] px-4 py-3 text-slate-500">
                      <div className="space-y-1.5">
                        {linha.mensagens.map((mensagem, index) => (
                          <p key={`${linha.linha}-msg-${index}`} className={linha.status === "ATUALIZAR" && index > 0 ? "font-bold text-sky-700" : ""}>
                            {mensagem}
                          </p>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {analise.previewLimitado && (
            <div className="border-t border-amber-100 bg-amber-50 px-5 py-3 text-[9px] font-bold text-amber-700">
              A prévia mostra as primeiras 200 linhas. A importação considera todos os NOVOS e todas as ATUALIZAÇÕES seguras do arquivo. Linhas REVISAR e ERRO não são gravadas.
            </div>
          )}

          <div className="border-t border-slate-100 p-5 md:p-6">
            <button
              type="button"
              disabled={analise.resumo.novos + analise.resumo.atualizar <= 0 || carregando !== null}
              onClick={() => enviar("importar")}
              className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#176f3c] text-[10px] font-black text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              {carregando === "importar" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Importar {analise.resumo.novos} novo(s) e atualizar {analise.resumo.atualizar}
            </button>
          </div>
        </section>
      )}

      {resultado?.ok && (
        <section className="rounded-[30px] border border-emerald-200 bg-[linear-gradient(145deg,#effbf3,#ffffff)] p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={22} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">
                Importação concluída
              </p>
              <h3 className="mt-1 text-[20px] font-black">{resultado.message}</h3>

              <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
                <Resumo label="Novos" valor={resultado.novosImportados ?? 0} tone="green" />
                <Resumo label="Atualizados" valor={resultado.atualizados ?? 0} tone="sky" />
                <Resumo label="Sem alteração" valor={resultado.semAlteracao ?? 0} />
                <Resumo label="Revisar" valor={resultado.revisar ?? 0} tone="amber" />
                <Resumo label="Erros" valor={(resultado.errosPlanilha ?? 0) + (resultado.falhas?.length ?? 0)} tone="red" />
              </div>

              {Boolean(resultado.falhas?.length) && (
                <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle size={16} />
                    <p className="text-[9px] font-black">Algumas linhas não puderam ser gravadas</p>
                  </div>
                  <div className="mt-2 space-y-1 text-[9px] text-amber-700">
                    {resultado.falhas?.slice(0, 10).map((falha, index) => (
                      <p key={`${falha.codigo}-${index}`}>
                        {falha.codigo} • {falha.nome}: {falha.mensagem}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href="/admin/clientes"
                  className="inline-flex h-[42px] items-center justify-center rounded-[14px] bg-[#176f3c] px-5 text-[9px] font-black text-white"
                >
                  Ver clientes importados
                </Link>

                <button
                  type="button"
                  onClick={() => trocarArquivo(null)}
                  className="inline-flex h-[42px] items-center justify-center rounded-[14px] border border-slate-200 bg-white px-5 text-[9px] font-black text-slate-600"
                >
                  Importar outro arquivo
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Resumo({
  label,
  valor,
  tone = "slate",
}: {
  label: string;
  valor: number;
  tone?: "slate" | "green" | "sky" | "amber" | "red";
}) {
  const styles = {
    slate: "bg-[#f5f8f5] text-slate-700",
    green: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className={`rounded-[16px] p-3 ${styles[tone]}`}>
      <p className="text-[7px] font-black uppercase tracking-[0.12em] opacity-60">{label}</p>
      <p className="mt-1 text-[20px] font-black">{valor}</p>
    </div>
  );
}

function Status({
  status,
}: {
  status: Linha["status"];
}) {
  if (status === "NOVO") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[7px] font-black text-emerald-700">
        <CheckCircle2 size={11} /> NOVO
      </span>
    );
  }

  if (status === "ATUALIZAR") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[7px] font-black text-sky-700">
        <RotateCcw size={11} /> ATUALIZAR
      </span>
    );
  }

  if (status === "SEM_ALTERACAO") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[7px] font-black text-slate-600">
        <CheckCircle2 size={11} /> SEM ALTERAÇÃO
      </span>
    );
  }

  if (status === "REVISAR") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[7px] font-black text-amber-700">
        <AlertTriangle size={11} /> REVISAR
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[7px] font-black text-red-700">
      <XCircle size={11} /> ERRO
    </span>
  );
}
