export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

import {
  EmptyState,
  Hero,
  Kpi,
  KpiGrid,
  ModuleHeader,
  StatusBadge,
} from "@/components/admin/PremiumModuleUi";

type PageProps = {
  searchParams: Promise<{
    tipo?: string;
    pagina?: string;
  }>;
};

type ClienteQualidade = {
  id: number | string;
  codigo: string | null;
  nome: string | null;
  cpf_cnpj: string | null;
  telefone: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  ativo: boolean | null;
};

type Problema = {
  chave: string;
  clienteId: number;
  clienteNome: string;
  clienteCodigo: string;
  tipo: "DUPLICIDADE" | "INCOMPLETO" | "TELEFONE";
  gravidade: "ALTA" | "MEDIA";
  titulo: string;
  detalhe: string;
  recomendacao: string;
  relacionados?: string[];
};

function somenteDigitos(valor: string | null | undefined) {
  return String(valor ?? "").replace(/\D/g, "");
}

function textoNormalizado(valor: string | null | undefined) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function agruparPor(
  clientes: ClienteQualidade[],
  obterChave: (cliente: ClienteQualidade) => string,
) {
  const mapa = new Map<string, ClienteQualidade[]>();

  for (const cliente of clientes) {
    const chave = obterChave(cliente);
    if (!chave) continue;

    const lista = mapa.get(chave) ?? [];
    lista.push(cliente);
    mapa.set(chave, lista);
  }

  return Array.from(mapa.entries()).filter(([, lista]) => lista.length > 1);
}

export default async function QualidadeClientesPage({
  searchParams,
}: PageProps) {
  const usuario = await getCurrentUserProfile();
  if (!usuario) redirect("/");

  const filtros = await searchParams;
  const supabase = await createClient();

  const clientes: ClienteQualidade[] = [];
  const LOTE = 1000;

  for (let inicio = 0; ; inicio += LOTE) {
    const { data, error } = await supabase
      .from("clientes")
      .select(`
        id,
        codigo,
        nome,
        cpf_cnpj,
        telefone,
        logradouro,
        numero,
        bairro,
        cidade,
        uf,
        ativo
      `)
      .eq("empresa_id", usuario.empresa.id)
      .order("nome")
      .range(inicio, inicio + LOTE - 1);

    if (error) {
      throw new Error("Não foi possível analisar a carteira de clientes.");
    }

    const lote = (data ?? []) as ClienteQualidade[];
    clientes.push(...lote);

    if (lote.length < LOTE) break;
  }

  const problemas: Problema[] = [];
  const clientesComProblema = new Set<number>();

  const duplicadosCodigo = agruparPor(clientes, (cliente) =>
    textoNormalizado(cliente.codigo),
  );

  const duplicadosCpf = agruparPor(clientes, (cliente) => {
    const cpf = somenteDigitos(cliente.cpf_cnpj);
    return cpf.length >= 11 ? cpf : "";
  });

  const duplicadosTelefone = agruparPor(clientes, (cliente) => {
    const telefone = somenteDigitos(cliente.telefone);
    return telefone.length >= 10 ? telefone.slice(-11) : "";
  });

  for (const [, grupo] of duplicadosCodigo) {
    for (const cliente of grupo) {
      const id = Number(cliente.id);
      clientesComProblema.add(id);

      problemas.push({
        chave: `codigo-${id}-${textoNormalizado(cliente.codigo)}`,
        clienteId: id,
        clienteNome: String(cliente.nome ?? "Cliente sem nome"),
        clienteCodigo: String(cliente.codigo ?? "Sem código"),
        tipo: "DUPLICIDADE",
        gravidade: "ALTA",
        titulo: "Código de referência repetido",
        detalhe: `O código ${cliente.codigo ?? "—"} aparece em ${grupo.length} cadastros da mesma empresa.`,
        recomendacao:
          "Confirme qual cadastro representa o cliente correto antes de novas importações do ERP.",
        relacionados: grupo
          .filter((item) => Number(item.id) !== id)
          .map((item) => String(item.nome ?? `Cliente #${item.id}`)),
      });
    }
  }

  for (const [cpf, grupo] of duplicadosCpf) {
    for (const cliente of grupo) {
      const id = Number(cliente.id);
      clientesComProblema.add(id);

      problemas.push({
        chave: `cpf-${id}-${cpf}`,
        clienteId: id,
        clienteNome: String(cliente.nome ?? "Cliente sem nome"),
        clienteCodigo: String(cliente.codigo ?? "Sem código"),
        tipo: "DUPLICIDADE",
        gravidade: "ALTA",
        titulo: "CPF/CNPJ já usado em outro cadastro",
        detalhe: `O documento final ${cpf.slice(-4).padStart(cpf.length, "•")} está vinculado a ${grupo.length} clientes.`,
        recomendacao:
          "Revise os cadastros relacionados. Documento igual é um forte indício de duplicidade.",
        relacionados: grupo
          .filter((item) => Number(item.id) !== id)
          .map((item) => String(item.nome ?? `Cliente #${item.id}`)),
      });
    }
  }

  for (const [telefone, grupo] of duplicadosTelefone) {
    const nomes = new Set(
      grupo.map((cliente) =>
        textoNormalizado(cliente.nome).split(" ").slice(0, 2).join(" "),
      ),
    );

    for (const cliente of grupo) {
      const id = Number(cliente.id);
      clientesComProblema.add(id);

      problemas.push({
        chave: `telefone-${id}-${telefone}`,
        clienteId: id,
        clienteNome: String(cliente.nome ?? "Cliente sem nome"),
        clienteCodigo: String(cliente.codigo ?? "Sem código"),
        tipo: "TELEFONE",
        gravidade: nomes.size > 1 ? "MEDIA" : "ALTA",
        titulo:
          nomes.size > 1
            ? "Telefone compartilhado entre clientes"
            : "Possível cliente duplicado pelo telefone",
        detalhe: `O telefone final ${telefone.slice(-4).padStart(telefone.length, "•")} aparece em ${grupo.length} cadastros.`,
        recomendacao:
          nomes.size > 1
            ? "Confirme se o número é realmente compartilhado pela família/empresa antes de alterar qualquer cadastro."
            : "Os nomes também são semelhantes. Compare endereço e documento antes de manter cadastros separados.",
        relacionados: grupo
          .filter((item) => Number(item.id) !== id)
          .map((item) => String(item.nome ?? `Cliente #${item.id}`)),
      });
    }
  }

  for (const cliente of clientes) {
    const faltantes: string[] = [];

    if (!String(cliente.nome ?? "").trim()) faltantes.push("Nome");
    if (!String(cliente.telefone ?? "").trim()) faltantes.push("Telefone");
    if (!String(cliente.logradouro ?? "").trim()) faltantes.push("Endereço");
    if (!String(cliente.numero ?? "").trim()) faltantes.push("Número");
    if (!String(cliente.bairro ?? "").trim()) faltantes.push("Bairro");

    const telefone = somenteDigitos(cliente.telefone);
    const telefoneInvalido =
      telefone.length > 0 && (telefone.length < 10 || telefone.length > 13);

    if (faltantes.length > 0) {
      const id = Number(cliente.id);
      clientesComProblema.add(id);

      problemas.push({
        chave: `incompleto-${id}`,
        clienteId: id,
        clienteNome: String(cliente.nome ?? "Cliente sem nome"),
        clienteCodigo: String(cliente.codigo ?? "Sem código"),
        tipo: "INCOMPLETO",
        gravidade: "MEDIA",
        titulo: "Cadastro incompleto",
        detalhe: `Campos obrigatórios ausentes: ${faltantes.join(", ")}.`,
        recomendacao:
          "Complete os dados antes de usar este cliente em novas vendas ou rotas.",
      });
    }

    if (telefoneInvalido) {
      const id = Number(cliente.id);
      clientesComProblema.add(id);

      problemas.push({
        chave: `telefone-invalido-${id}`,
        clienteId: id,
        clienteNome: String(cliente.nome ?? "Cliente sem nome"),
        clienteCodigo: String(cliente.codigo ?? "Sem código"),
        tipo: "TELEFONE",
        gravidade: "MEDIA",
        titulo: "Telefone fora do padrão esperado",
        detalhe: `O telefone possui ${telefone.length} dígitos.`,
        recomendacao:
          "Revise o número para facilitar cobrança, entrega e identificação de duplicidades.",
      });
    }
  }

  const idsAlta = new Set(
    problemas
      .filter((problema) => problema.gravidade === "ALTA")
      .map((problema) => problema.clienteId),
  );

  const idsDuplicidade = new Set(
    problemas
      .filter((problema) => problema.tipo === "DUPLICIDADE")
      .map((problema) => problema.clienteId),
  );

  const idsIncompleto = new Set(
    problemas
      .filter((problema) => problema.tipo === "INCOMPLETO")
      .map((problema) => problema.clienteId),
  );

  const saudaveis = Math.max(0, clientes.length - clientesComProblema.size);
  const indiceQualidade =
    clientes.length === 0
      ? 100
      : Math.round((saudaveis / clientes.length) * 100);

  const filtroTipo = String(filtros.tipo ?? "todos");
  const problemasFiltrados = problemas
    .filter((problema) => {
      if (filtroTipo === "duplicidade") {
        return problema.tipo === "DUPLICIDADE";
      }
      if (filtroTipo === "incompleto") {
        return problema.tipo === "INCOMPLETO";
      }
      if (filtroTipo === "telefone") {
        return problema.tipo === "TELEFONE";
      }
      if (filtroTipo === "critico") {
        return problema.gravidade === "ALTA";
      }
      return true;
    })
    .sort((a, b) => {
      if (a.gravidade !== b.gravidade) {
        return a.gravidade === "ALTA" ? -1 : 1;
      }
      return a.clienteNome.localeCompare(b.clienteNome, "pt-BR");
    });

  const POR_PAGINA = 30;
  const totalPaginas = Math.max(
    1,
    Math.ceil(problemasFiltrados.length / POR_PAGINA),
  );
  const paginaAtual = Math.min(
    Math.max(
      1,
      Number.parseInt(String(filtros.pagina ?? "1"), 10) || 1,
    ),
    totalPaginas,
  );

  const inicio = (paginaAtual - 1) * POR_PAGINA;
  const fim = Math.min(inicio + POR_PAGINA, problemasFiltrados.length);
  const paginaProblemas = problemasFiltrados.slice(inicio, fim);

  const hrefFiltro = (tipo: string, pagina = 1) => {
    const params = new URLSearchParams();
    if (tipo !== "todos") params.set("tipo", tipo);
    if (pagina > 1) params.set("pagina", String(pagina));
    const query = params.toString();
    return query
      ? `/admin/clientes/qualidade?${query}`
      : "/admin/clientes/qualidade";
  };

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto w-full">
        <ModuleHeader
          eyebrow="Governança de dados"
          title="Qualidade da carteira"
          actions={
            <Link
              href="/admin/clientes"
              className="inline-flex h-[38px] items-center rounded-[13px] border border-slate-200 bg-white px-3 text-[9px] font-black text-slate-600"
            >
              ← Voltar para clientes
            </Link>
          }
        />

        <Hero
          eyebrow="Inteligência cadastral"
          title="O sistema mostra o que precisa de atenção"
          description="Nenhum cadastro é alterado automaticamente aqui. A auditoria apenas identifica conflitos e explica por que cada cliente precisa ou não de revisão."
          badge={
            <div className="rounded-[16px] border border-white/10 bg-white/[0.07] px-4 py-3 text-right">
              <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/45">
                Qualidade
              </p>
              <p className="mt-1 text-[22px] font-black">
                {indiceQualidade}%
              </p>
            </div>
          }
        >
          <KpiGrid>
            <Kpi label="Clientes" value={clientes.length} />
            <Kpi label="Saudáveis" value={saudaveis} />
            <Kpi
              label="Revisar"
              value={clientesComProblema.size}
              warning={clientesComProblema.size > 0}
            />
            <Kpi
              label="Críticos"
              value={idsAlta.size}
              warning={idsAlta.size > 0}
            />
            <Kpi
              label="Duplicidades"
              value={idsDuplicidade.size}
              warning={idsDuplicidade.size > 0}
            />
            <Kpi
              label="Incompletos"
              value={idsIncompleto.size}
              warning={idsIncompleto.size > 0}
            />
          </KpiGrid>
        </Hero>

        <section className="mt-4 rounded-[22px] border border-white bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#b07a12]">
                Filtros da auditoria
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                Mostre somente o tipo de problema que deseja revisar.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["todos", "Todos"],
                ["critico", "Críticos"],
                ["duplicidade", "Duplicidades"],
                ["telefone", "Telefones"],
                ["incompleto", "Incompletos"],
              ].map(([valor, label]) => (
                <Link
                  key={valor}
                  href={hrefFiltro(valor)}
                  className={`rounded-[11px] px-3 py-2 text-[9px] font-black ${
                    filtroTipo === valor
                      ? "bg-[#176f3c] text-white"
                      : "border border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b07a12]">
                Pontos encontrados
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                Exibindo {problemasFiltrados.length === 0 ? 0 : inicio + 1}–{fim} de {problemasFiltrados.length} ocorrência(s)
              </p>
            </div>

            <div className="rounded-[12px] bg-slate-100 px-3 py-2 text-[9px] font-bold text-slate-500">
              Cada ocorrência explica o motivo e a ação recomendada
            </div>
          </div>

          {paginaProblemas.length === 0 ? (
            <EmptyState
              title="Nenhum problema neste filtro"
              text="A carteira não possui ocorrências para o tipo selecionado."
            />
          ) : (
            <div className="grid gap-2">
              {paginaProblemas.map((problema) => (
                <article
                  key={problema.chave}
                  className={`grid gap-3 rounded-[18px] border-l-[4px] bg-white px-4 py-3 xl:grid-cols-[minmax(230px,.9fr)_minmax(330px,1.3fr)_minmax(330px,1.2fr)_150px] xl:items-center ${
                    problema.gravidade === "ALTA"
                      ? "border border-red-100 border-l-red-400"
                      : "border border-amber-100 border-l-amber-400"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        tone={
                          problema.gravidade === "ALTA"
                            ? "red"
                            : "amber"
                        }
                      >
                        {problema.gravidade === "ALTA"
                          ? "Revisão prioritária"
                          : "Revisar"}
                      </StatusBadge>

                      <span className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">
                        {problema.tipo}
                      </span>
                    </div>

                    <p className="mt-2 truncate text-[13px] font-black text-slate-800">
                      {problema.clienteNome}
                    </p>
                    <p className="mt-0.5 text-[9px] font-bold text-[#b28735]">
                      {problema.clienteCodigo}
                    </p>
                  </div>

                  <div className="min-w-0 xl:border-l xl:border-slate-100 xl:pl-4">
                    <p className="text-[11px] font-black text-slate-700">
                      {problema.titulo}
                    </p>
                    <p className="mt-1 text-[10px] font-medium leading-4 text-slate-500">
                      {problema.detalhe}
                    </p>

                    {problema.relacionados?.length ? (
                      <p className="mt-1.5 text-[9px] font-semibold text-slate-400">
                        Relacionado com: {problema.relacionados.join(", ")}
                      </p>
                    ) : null}
                  </div>

                  <div className="min-w-0 rounded-[12px] bg-[#f6f8f6] px-3 py-2.5 xl:border-l xl:border-slate-100">
                    <p className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
                      Ação recomendada
                    </p>
                    <p className="mt-1 text-[9px] font-semibold leading-4 text-slate-600">
                      {problema.recomendacao}
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Link
                      href={`/admin/clientes/${problema.clienteId}/editar`}
                      className="inline-flex h-9 items-center rounded-[11px] bg-[#176f3c] px-3 text-[9px] font-black text-white"
                    >
                      Corrigir cadastro →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {totalPaginas > 1 ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-slate-200 bg-white px-4 py-3">
              <p className="text-[9px] font-bold text-slate-500">
                Página {paginaAtual} de {totalPaginas}
              </p>

              <div className="flex gap-2">
                {paginaAtual > 1 ? (
                  <Link
                    href={hrefFiltro(filtroTipo, paginaAtual - 1)}
                    className="rounded-[10px] border border-slate-200 px-3 py-2 text-[9px] font-black text-slate-600"
                  >
                    ← Anterior
                  </Link>
                ) : null}

                {paginaAtual < totalPaginas ? (
                  <Link
                    href={hrefFiltro(filtroTipo, paginaAtual + 1)}
                    className="rounded-[10px] bg-[#176f3c] px-3 py-2 text-[9px] font-black text-white"
                  >
                    Próxima →
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
