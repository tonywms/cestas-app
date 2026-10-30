export const instant = false;

import {
  Activity,
  ArrowLeft,
  Database,
  Filter,
  History,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import RelatorioExportActions from "../RelatorioExportActions";
import AuditoriaCardsClient, { type AuditoriaItem } from "./AuditoriaCardsClient";

type PageProps = {
  searchParams: Promise<{
    de?: string;
    ate?: string;
    entidade?: string;
    usuario?: string;
    busca?: string;
  }>;
};

function dataIsoLocal(data: Date) {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dataBR(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(new Date(valor));
}

function texto(valor: unknown) {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "string") return valor;
  if (typeof valor === "number" || typeof valor === "boolean") return String(valor);
  return "";
}

function entidadeLegivel(entidade: string) {
  const mapa: Record<string, string> = {
    ROTA: "Rotas",
    CLIENTE: "Clientes",
    CARGA: "Cargas",
    CREDITO: "Crédito",
    CREDITO_CONFIGURACAO: "Crédito",
    VENDA: "Vendas",
    FINANCEIRO: "Financeiro",
    ESTOQUE: "Estoque",
    USUARIO: "Usuários",
  };

  return mapa[entidade] ?? entidade.replaceAll("_", " ");
}

function acaoLegivel(acao: string) {
  const mapa: Record<string, string> = {
    CARGA_FINALIZADA: "Carga finalizada",
    ROTA_CLIENTE_ADICIONADO_CAMPO: "Cliente adicionado à rota em campo",
    CLIENTE_DADOS_ATUALIZADOS: "Dados do cliente atualizados",
    ROTA_MOBILE_INICIADA: "Rota iniciada pelo entregador",
    CLIENTE_CRIADO_MOBILE: "Cliente cadastrado pelo entregador",
    ROTA_MOBILE_FINALIZADA: "Rota finalizada pelo entregador",
    CLIENTE_DADOS_E_ENDERECO_ATUALIZADOS: "Cadastro e endereço do cliente atualizados",
    CREDITO_LIBERADO_EXCECAO: "Crédito liberado excepcionalmente",
    POLITICA_CREDITO_ATUALIZADA: "Política de crédito atualizada",
    CREDITO_EXCECAO_REVOGADA: "Liberação excepcional de crédito revogada",
    VENDA_CAMPO_REGISTRADA: "Venda registrada em campo",
    EMPRESA_CRIADA: "Empresa cadastrada",
    EMPRESA_ATUALIZADA: "Configuração da empresa atualizada",
  };

  return mapa[acao] ?? acao.replaceAll("_", " ").toLowerCase().replace(
    /^./,
    (letra) => letra.toUpperCase(),
  );
}

function resumoEvento(
  acao: string,
  dados: Record<string, unknown>,
) {
  const cliente = texto(dados.cliente);
  const carga = texto(dados.carga_codigo ?? dados.carga);
  const rota = texto(dados.rota_codigo ?? dados.rota);

  switch (acao) {
    case "ROTA_CLIENTE_ADICIONADO_CAMPO":
      return cliente
        ? `${cliente} foi incluído na rota durante a operação em campo.`
        : "Um cliente foi incluído na rota durante a operação em campo.";

    case "ROTA_MOBILE_INICIADA":
      return rota
        ? `A rota ${rota} foi iniciada pelo entregador no aplicativo mobile.`
        : "O entregador iniciou uma rota no aplicativo mobile.";

    case "ROTA_MOBILE_FINALIZADA":
      return rota
        ? `A rota ${rota} foi finalizada pelo entregador.`
        : "O entregador encerrou a rota.";

    case "CLIENTE_CRIADO_MOBILE":
      return cliente
        ? `${cliente} foi cadastrado pelo entregador durante a operação.`
        : "Um novo cliente foi cadastrado durante a operação.";

    case "CLIENTE_DADOS_ATUALIZADOS":
    case "CLIENTE_DADOS_E_ENDERECO_ATUALIZADOS":
      return cliente
        ? `O cadastro de ${cliente} foi atualizado.`
        : "O cadastro de um cliente foi atualizado.";

    case "CARGA_FINALIZADA":
      return carga
        ? `A carga ${carga} foi encerrada e teve seu saldo classificado.`
        : "A carga foi encerrada e teve seu saldo classificado.";

    case "CREDITO_LIBERADO_EXCECAO":
      return cliente
        ? `Foi concedida uma liberação excepcional de crédito para ${cliente}.`
        : "Foi concedida uma liberação excepcional de crédito.";

    case "VENDA_CAMPO_REGISTRADA":
      return cliente
        ? `Uma venda para ${cliente} foi registrada em campo.`
        : "Uma venda foi registrada em campo.";

    default:
      return "Operação registrada automaticamente pelo Cestas APP.";
  }
}

function detalhesEvento(
  acao: string,
  dados: Record<string, unknown>,
) {
  const itens: Array<{ label: string; valor: string }> = [];

  const push = (label: string, valor: unknown) => {
    const convertido = texto(valor);
    if (convertido) itens.push({ label, valor: convertido });
  };

  switch (acao) {
    case "ROTA_CLIENTE_ADICIONADO_CAMPO":
      push("Cliente", dados.cliente);
      push("Sequência da visita", dados.sequencia);
      push(
        "Origem da rota",
        texto(dados.origem_rota).toUpperCase() === "MOBILE"
          ? "Criada pelo entregador no mobile"
          : dados.origem_rota,
      );
      break;

    case "ROTA_MOBILE_INICIADA":
    case "ROTA_MOBILE_FINALIZADA":
      push("Rota", dados.rota_codigo ?? dados.rota);
      push("Carga", dados.carga_codigo ?? dados.carga);
      push("Paradas", dados.paradas ?? dados.total_paradas);
      break;

    case "CLIENTE_CRIADO_MOBILE":
      push("Cliente", dados.cliente);
      push("Código", dados.codigo_cliente ?? dados.codigo);
      push("Bairro", dados.bairro);
      push("Cidade", dados.cidade);
      break;

    case "CLIENTE_DADOS_ATUALIZADOS":
    case "CLIENTE_DADOS_E_ENDERECO_ATUALIZADOS":
      push("Cliente", dados.cliente);
      push("Código", dados.codigo_cliente ?? dados.codigo);
      break;

    case "CARGA_FINALIZADA":
      push("Carga", dados.carga_codigo ?? dados.carga);
      push("Entregues", dados.entregues);
      push("Retornados", dados.retornados);
      push("Avariados", dados.avariados);
      break;

    case "CREDITO_LIBERADO_EXCECAO":
      push("Cliente", dados.cliente);
      push("Validade", dados.valido_ate ?? dados.validade);
      push("Motivo", dados.motivo);
      break;

    case "VENDA_CAMPO_REGISTRADA":
      push("Cliente", dados.cliente);
      push("Tipo de venda", dados.tipo_venda);
      push("Valor total", dados.valor_total);
      push("Valor de entrada", dados.valor_entrada);
      break;

    default:
      for (const [chave, valor] of Object.entries(dados)) {
        if (
          chave.endsWith("_id") ||
          chave === "id" ||
          chave === "empresa_id" ||
          chave === "usuario_id"
        ) {
          continue;
        }

        const legivel = chave
          .replaceAll("_", " ")
          .replace(/^./, (letra) => letra.toUpperCase());

        push(legivel, valor);
      }
      break;
  }

  return itens.slice(0, 12);
}

export default async function RelatorioAuditoriaPage({
  searchParams,
}: PageProps) {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  if (usuario.perfilCodigo === "ENTREGADOR") {
    redirect("/mobile");
  }

  const params = await searchParams;
  const hoje = new Date();
  const inicio = new Date();
  inicio.setDate(hoje.getDate() - 29);

  const de = params.de || dataIsoLocal(inicio);
  const ate = params.ate || dataIsoLocal(hoje);
  const entidadeFiltro = params.entidade || "TODAS";
  const usuarioFiltro = params.usuario || "TODOS";
  const busca = (params.busca || "").trim().toLowerCase();

  const supabase = await createClient();

  let query = supabase
    .from("auditoria_eventos")
    .select("id, usuario_id, entidade, entidade_id, acao, dados, created_at")
    .eq("empresa_id", usuario.empresa.id)
    .gte("created_at", `${de}T00:00:00-03:00`)
    .lte("created_at", `${ate}T23:59:59.999-03:00`)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (entidadeFiltro !== "TODAS") {
    query = query.eq("entidade", entidadeFiltro);
  }

  if (usuarioFiltro !== "TODOS") {
    query = query.eq("usuario_id", usuarioFiltro);
  }

  const eventosResult = await query;
  let eventos = eventosResult.data ?? [];

  const usuarioIds = Array.from(
    new Set(eventos.map((evento) => String(evento.usuario_id)).filter(Boolean)),
  );

  const usuariosResult =
    usuarioIds.length > 0
      ? await supabase
          .from("usuarios")
          .select("id, nome, email")
          .in("id", usuarioIds)
      : { data: [] as Array<{ id: string; nome: string; email: string | null }> };

  const usuarios = new Map(
    (usuariosResult.data ?? []).map((item) => [String(item.id), item]),
  );

  if (busca) {
    eventos = eventos.filter((evento) => {
      const autor = usuarios.get(String(evento.usuario_id));
      const acaoLabel = acaoLegivel(String(evento.acao));
      const entidadeLabel = entidadeLegivel(String(evento.entidade));

      const textoBusca = [
        acaoLabel,
        entidadeLabel,
        autor?.nome,
        autor?.email,
        JSON.stringify(evento.dados ?? {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return textoBusca.includes(busca);
    });
  }

  const entidades = Array.from(
    new Set((eventosResult.data ?? []).map((evento) => String(evento.entidade))),
  ).sort();

  const contagemPorEntidade = new Map<string, number>();
  const contagemPorUsuario = new Map<string, number>();

  for (const evento of eventos) {
    const entidade = String(evento.entidade);
    contagemPorEntidade.set(
      entidade,
      (contagemPorEntidade.get(entidade) ?? 0) + 1,
    );

    const uid = String(evento.usuario_id);
    contagemPorUsuario.set(uid, (contagemPorUsuario.get(uid) ?? 0) + 1);
  }

  const principalEntidade =
    Array.from(contagemPorEntidade.entries()).sort((a, b) => b[1] - a[1])[0] ??
    null;

  const principalUsuario =
    Array.from(contagemPorUsuario.entries()).sort((a, b) => b[1] - a[1])[0] ??
    null;

  const dados: AuditoriaItem[] = eventos.map((evento) => {
    const autor = usuarios.get(String(evento.usuario_id));
    const dadosEvento = (evento.dados ?? {}) as Record<string, unknown>;
    const acao = String(evento.acao);
    const entidade = String(evento.entidade);

    return {
      id: Number(evento.id),
      dataHora: dataBR(String(evento.created_at)),
      dataIso: String(evento.created_at),
      usuario: autor?.nome ?? "Usuário",
      usuarioEmail: autor?.email ?? "",
      entidade,
      entidadeLabel: entidadeLegivel(entidade),
      entidadeId: String(evento.entidade_id ?? ""),
      acao,
      acaoLabel: acaoLegivel(acao),
      resumo: resumoEvento(acao, dadosEvento),
      detalhes: detalhesEvento(acao, dadosEvento),
      dados: dadosEvento,
    };
  });

  const linhasExportacao = dados.map((evento) => ({
    dataHora: evento.dataHora,
    usuario: evento.usuario,
    rotina: evento.entidadeLabel,
    operacao: evento.acaoLabel,
    resumo: evento.resumo,
  }));

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-6 md:py-8">
      <div className="mx-auto max-w-[1240px]">
        <header className="glass flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/relatorios"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-[#176f3c]"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#b07a12]">
                Governança
              </p>
              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Auditoria operacional
              </h1>
            </div>
          </div>

          <RelatorioExportActions
            nomeArquivo={`auditoria_operacional_${de}_${ate}`}
            titulo="Relatório de auditoria operacional"
            subtitulo={`Eventos da empresa entre ${de} e ${ate}`}
            colunas={[
              { chave: "dataHora", titulo: "Data / hora" },
              { chave: "usuario", titulo: "Responsável" },
              { chave: "rotina", titulo: "Rotina" },
              { chave: "operacao", titulo: "Operação" },
              { chave: "resumo", titulo: "Descrição" },
            ]}
            linhas={linhasExportacao}
            resumo={[
              { label: "Eventos", valor: dados.length },
              { label: "Rotinas", valor: contagemPorEntidade.size },
              { label: "Usuários", valor: contagemPorUsuario.size },
              {
                label: "Rotina mais movimentada",
                valor: principalEntidade
                  ? entidadeLegivel(principalEntidade[0])
                  : "—",
              },
            ]}
          />
        </header>

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <ShieldCheck size={16} />
              Rastreabilidade
            </div>

            <h2 className="mt-4 text-[32px] font-black tracking-[-0.055em]">
              Quem fez, o que fez e quando
              <span className="text-[#f4b13f]">.</span>
            </h2>

            <p className="mt-3 max-w-3xl text-[11px] leading-6 text-white/65">
              Histórico operacional da {usuario.empresa.nomeFantasia}. A visão abaixo usa linguagem de negócio; detalhes técnicos ficam restritos ao Super Admin.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi label="Eventos no filtro" valor={String(dados.length)} />
              <Kpi label="Rotinas" valor={String(contagemPorEntidade.size)} />
              <Kpi label="Usuários envolvidos" valor={String(contagemPorUsuario.size)} />
              <Kpi
                label="Maior atividade"
                valor={
                  principalUsuario
                    ? usuarios.get(principalUsuario[0])?.nome ?? "Usuário"
                    : "—"
                }
              />
            </div>
          </div>
        </section>

        <section className="card-premium mt-5 rounded-[30px] p-5">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
            <Filter size={15} />
            Filtros
          </div>

          <form className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1.2fr_1.4fr_1.7fr_auto]">
            <label>
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                De
              </span>
              <input
                name="de"
                type="date"
                defaultValue={de}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 px-3 text-[10px] font-semibold"
              />
            </label>

            <label>
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Até
              </span>
              <input
                name="ate"
                type="date"
                defaultValue={ate}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 px-3 text-[10px] font-semibold"
              />
            </label>

            <label>
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Rotina
              </span>
              <select
                name="entidade"
                defaultValue={entidadeFiltro}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-semibold"
              >
                <option value="TODAS">Todas</option>
                {entidades.map((entidade) => (
                  <option key={entidade} value={entidade}>
                    {entidadeLegivel(entidade)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Responsável
              </span>
              <select
                name="usuario"
                defaultValue={usuarioFiltro}
                className="mt-1 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[10px] font-semibold"
              >
                <option value="TODOS">Todos</option>
                {Array.from(usuarios.entries()).map(([id, item]) => (
                  <option key={id} value={id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Busca
              </span>
              <div className="relative mt-1">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  name="busca"
                  defaultValue={params.busca ?? ""}
                  placeholder="Cliente, operação, responsável..."
                  className="h-11 w-full rounded-[14px] border border-slate-200 pl-10 pr-3 text-[10px] font-semibold"
                />
              </div>
            </label>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex h-11 items-center gap-2 rounded-[14px] bg-[#176f3c] px-4 text-[9px] font-black text-white"
              >
                <Filter size={14} />
                Aplicar
              </button>

              <Link
                href="/admin/relatorios/auditoria"
                className="flex h-11 items-center rounded-[14px] border border-slate-200 bg-white px-4 text-[9px] font-black text-slate-500"
              >
                Limpar
              </Link>
            </div>
          </form>
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-4">
          <Resumo
            icon={<History size={17} />}
            label="Eventos"
            valor={String(dados.length)}
          />
          <Resumo
            icon={<Database size={17} />}
            label="Rotinas auditadas"
            valor={String(contagemPorEntidade.size)}
          />
          <Resumo
            icon={<UserRound size={17} />}
            label="Usuários"
            valor={String(contagemPorUsuario.size)}
          />
          <Resumo
            icon={<Activity size={17} />}
            label="Mais movimentada"
            valor={
              principalEntidade
                ? entidadeLegivel(principalEntidade[0])
                : "—"
            }
          />
        </section>

        <section className="card-premium mt-5 rounded-[30px] p-5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#b07a12]">
              Histórico
            </p>
            <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em]">
              Extrato de auditoria
            </h3>
            <p className="mt-1 text-[8px] text-slate-400">
              Auditoria em formato de extrato: uma linha por acontecimento, com data, rotina, responsável, referência e descrição.
            </p>
          </div>

          <div className="mt-5">
            {dados.length > 0 ? (
              <AuditoriaCardsClient
                eventos={dados}
                mostrarTecnico={Boolean(usuario.isPlatformAdmin)}
              />
            ) : (
              <div className="rounded-[20px] bg-[#f6f9f6] p-12 text-center">
                <ShieldCheck size={28} className="mx-auto text-slate-300" />
                <p className="mt-3 text-[10px] font-black">
                  Nenhum evento encontrado
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Kpi({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-[19px] border border-white/10 bg-white/[0.07] px-4 py-3.5">
      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>
      <p className="mt-1.5 truncate text-[18px] font-black text-white">{valor}</p>
    </div>
  );
}

function Resumo({
  icon,
  label,
  valor,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="card-premium rounded-[24px] p-5">
      <div className="text-emerald-700">{icon}</div>
      <p className="mt-4 text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 truncate text-[18px] font-black">{valor}</p>
    </div>
  );
}
