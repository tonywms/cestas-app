export const instant = false;

import {
  ArrowLeft,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

import PrepararVendaForm from "./PrepararVendaForm";

type PageProps = {
  searchParams: Promise<{
    rotaClienteId?: string;
  }>;
};

function dataMais30Dias() {
  const hoje = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "America/Fortaleza",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date());

  const data = new Date(`${hoje}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + 30);
  return data.toISOString().slice(0, 10);
}

function endereco({
  logradouro,
  numero,
  bairro,
}: {
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
}) {
  const principal = [logradouro, numero].filter(Boolean).join(", ");
  return `${principal || "Endereço não informado"}${bairro ? ` - ${bairro}` : ""}`;
}

export default async function PrepararVendaPage({
  searchParams,
}: PageProps) {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const podePagamento =
    usuario.configuracao.permitirPagamentoMobile &&
    (
      usuario.isPlatformAdmin ||
      temPermissao(
        usuario.permissoes,
        PERMISSOES.PAGAMENTO_REGISTRAR,
      )
    );

  const podeEntrega =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ENTREGA_REALIZAR,
    );

  const podeRota =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ROTA_MOBILE_GERENCIAR_PROPRIA,
    );

  if (!podePagamento || !podeEntrega || !podeRota) {
    redirect("/mobile/sem-acesso");
  }

  const params = await searchParams;
  const rotaClienteId = Number(params.rotaClienteId);

  if (!Number.isInteger(rotaClienteId) || rotaClienteId <= 0) {
    redirect("/mobile/rota");
  }

  const supabase = await createClient();

  const {
    data: fluxoExistente,
  } = await supabase
    .from("venda_fluxos_campo")
    .select("id")
    .eq("empresa_id", usuario.empresa.id)
    .eq("entregador_id", usuario.id)
    .eq("rota_cliente_id", rotaClienteId)
    .eq("status", "AGUARDANDO_ENTREGA")
    .maybeSingle();

  if (fluxoExistente?.id) {
    redirect(
      `/mobile/vendas/finalizar?fluxoId=${fluxoExistente.id}`,
    );
  }

  const {
    data: parada,
    error: paradaError,
  } = await supabase
    .from("rota_clientes")
    .select(`
      id,
      rota_id,
      cliente_id,
      status,
      endereco_logradouro,
      endereco_numero,
      endereco_bairro
    `)
    .eq("empresa_id", usuario.empresa.id)
    .eq("id", rotaClienteId)
    .in("status", ["PENDENTE", "EM_ATENDIMENTO"])
    .maybeSingle();

  if (paradaError || !parada) {
    redirect("/mobile/rota");
  }

  const {
    data: rota,
    error: rotaError,
  } = await supabase
    .from("rotas")
    .select(`
      id,
      codigo,
      origem,
      status,
      carga_id
    `)
    .eq("empresa_id", usuario.empresa.id)
    .eq("id", parada.rota_id)
    .eq("entregador_id", usuario.id)
    .eq("origem", "MOBILE")
    .in("status", ["PLANEJADA", "EM_ROTA"])
    .maybeSingle();

  if (rotaError || !rota) {
    redirect("/mobile/rota");
  }

  const cargaQuery = supabase
    .from("cargas")
    .select(`
      id,
      codigo,
      status,
      recebida_at,
      created_at
    `)
    .eq("empresa_id", usuario.empresa.id)
    .eq("entregador_id", usuario.id)
    .in("status", ["ABERTA", "EM_ROTA"])
    .order("created_at", { ascending: false })
    .limit(1);

  const {
    data: carga,
    error: cargaError,
  } = rota.carga_id
    ? await supabase
        .from("cargas")
        .select(`
          id,
          codigo,
          status,
          recebida_at,
          created_at
        `)
        .eq("empresa_id", usuario.empresa.id)
        .eq("id", rota.carga_id)
        .eq("entregador_id", usuario.id)
        .in("status", ["ABERTA", "EM_ROTA"])
        .maybeSingle()
    : await cargaQuery.maybeSingle();

  if (cargaError || !carga) {
    return (
      <Estado
        titulo="Nenhuma carga ativa"
        texto="Você precisa possuir uma carga ativa antes de iniciar uma venda em campo."
        href="/mobile/carga"
        botao="Ver minha carga"
      />
    );
  }

  if (
    usuario.configuracao.exigirBipagemCarga &&
    !carga.recebida_at
  ) {
    return (
      <Estado
        titulo="Receba a carga primeiro"
        texto="A carga ainda não foi conferida. Conclua o recebimento antes de iniciar a venda."
        href="/mobile/carga/receber"
        botao="Receber carga"
      />
    );
  }

  const [
    clienteResult,
    itensResult,
  ] = await Promise.all([
    supabase
      .from("clientes")
      .select(`
        id,
        codigo,
        nome,
        logradouro,
        numero,
        bairro
      `)
      .eq("empresa_id", usuario.empresa.id)
      .eq("id", parada.cliente_id)
      .eq("ativo", true)
      .maybeSingle(),

    supabase
      .from("carga_itens")
      .select(`
        id,
        tipo_cesta_id,
        quantidade_carregada,
        quantidade_entregue,
        quantidade_retornada,
        quantidade_avariada
      `)
      .eq("empresa_id", usuario.empresa.id)
      .eq("carga_id", carga.id),
  ]);

  if (
    clienteResult.error ||
    !clienteResult.data ||
    itensResult.error
  ) {
    redirect("/mobile/rota");
  }

  const cliente = clienteResult.data;
  const itens = itensResult.data ?? [];

  const tipoIds = Array.from(
    new Set(
      itens.map(
        (item) => Number(item.tipo_cesta_id),
      ),
    ),
  );

  const {
    data: tipos,
    error: tiposError,
  } = tipoIds.length > 0
    ? await supabase
        .from("tipos_cesta")
        .select(`
          id,
          codigo,
          nome,
          valor_venda,
          ativo
        `)
        .eq("empresa_id", usuario.empresa.id)
        .eq("ativo", true)
        .in("id", tipoIds)
        .order("nome")
    : { data: [], error: null };

  if (tiposError) {
    console.error(
      "Erro ao carregar tipos de cesta para venda:",
      tiposError,
    );
  }

  const tiposMap = new Map(
    (tipos ?? []).map((item) => [
      Number(item.id),
      item,
    ]),
  );

  const opcoes = itens
    .map((item) => {
      const tipo = tiposMap.get(
        Number(item.tipo_cesta_id),
      );

      const saldo =
        Number(item.quantidade_carregada) -
        Number(item.quantidade_entregue) -
        Number(item.quantidade_retornada) -
        Number(item.quantidade_avariada);

      return {
        id: Number(item.tipo_cesta_id),
        codigo: String(tipo?.codigo ?? ""),
        nome: String(tipo?.nome ?? "Cesta"),
        valorVenda: Number(tipo?.valor_venda ?? 0),
        saldo,
      };
    })
    .filter(
      (item) =>
        item.saldo > 0 &&
        item.valorVenda > 0,
    );

  if (opcoes.length === 0) {
    return (
      <Estado
        titulo="Sem cesta disponível"
        texto="A carga não possui cesta com saldo e preço de venda disponível para este atendimento."
        href="/mobile/rota"
        botao="Voltar para rota"
      />
    );
  }

  const enderecoCliente =
    endereco({
      logradouro:
        parada.endereco_logradouro ??
        cliente.logradouro,
      numero:
        parada.endereco_numero ??
        cliente.numero,
      bairro:
        parada.endereco_bairro ??
        cliente.bairro,
    });

  const proximaEtapa =
    String(
      usuario.configuracao.modoControleCarga,
    ) === "VOLUME" &&
    usuario.configuracao.exigirBipagemEntrega
      ? "BIPAGEM"
      : "CONFIRMACAO";

  return (
    <main className="app-premium min-h-dvh text-[#142018]">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] overflow-hidden bg-[#f7faf7]/90 shadow-[0_0_70px_rgba(17,63,33,0.14)]">
        <header className="hero-premium grain relative overflow-hidden px-5 pb-7 pt-5 text-white">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full border-[30px] border-white/[0.04]" />

          <div className="relative z-10 flex items-center justify-between">
            <Link
              href="/mobile/rota"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/10"
            >
              <ArrowLeft size={19} />
            </Link>

            <div className="text-center">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-200">
                Etapa 1 de 2
              </p>
              <h1 className="mt-1 text-lg font-black">
                Venda / pagamento
              </h1>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/10">
              <WalletCards size={19} />
            </div>
          </div>

          <div className="relative z-10 mt-6">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#a8d8b7]">
              {rota.codigo} • {carga.codigo}
            </p>
            <h2 className="mt-2 text-[26px] font-black tracking-[-0.05em]">
              Primeiro combine a venda
              <span className="text-[#f4b13f]">.</span>
            </h2>
            <p className="mt-2 text-[11px] leading-5 text-white/65">
              Informe o valor e a forma de recebimento antes de entregar a cesta.
            </p>
          </div>
        </header>

        <section className="space-y-4 px-5 py-6">
          <section className="rounded-[26px] border border-emerald-100 bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.06)]">
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-700">
              Cliente
            </p>
            <h2 className="mt-1 text-[18px] font-black">
              {cliente.nome}
            </h2>
            <p className="mt-1 text-[9px] font-bold text-slate-400">
              {cliente.codigo}
            </p>
            <p className="mt-3 text-[10px] leading-5 text-slate-500">
              {enderecoCliente}
            </p>
          </section>

          <section className="rounded-[22px] border border-sky-100 bg-sky-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={19}
                className="mt-0.5 shrink-0 text-sky-700"
              />
              <div>
                <p className="text-[10px] font-black text-sky-900">
                  Operação recuperável
                </p>
                <p className="mt-1 text-[9px] leading-5 text-sky-800/80">
                  Ao continuar, estes dados ficam salvos como pendência. Nada entra no caixa e nenhum volume é baixado até a entrega física ser confirmada.
                </p>
              </div>
            </div>
          </section>

          <PrepararVendaForm
            empresaId={usuario.empresa.id}
            usuarioId={usuario.id}
            clienteId={cliente.id}
            clienteNome={cliente.nome}
            cargaId={carga.id}
            modoControle={usuario.configuracao.modoControleCarga}
            rotaClienteId={rotaClienteId}
            opcoes={opcoes}
            primeiroVencimento={dataMais30Dias()}
            proximaEtapa={proximaEtapa}
          />

          <div className="flex items-center justify-center gap-2 pb-2 text-[8px] font-bold text-slate-400">
            <ReceiptText size={12} />
            Venda e estoque só são efetivados juntos na etapa final.
          </div>
        </section>
      </div>
    </main>
  );
}

function Estado({
  titulo,
  texto,
  href,
  botao,
}: {
  titulo: string;
  texto: string;
  href: string;
  botao: string;
}) {
  return (
    <main className="app-premium min-h-dvh px-5 py-8 text-[#142018]">
      <div className="mx-auto max-w-[480px] rounded-[28px] border border-amber-200 bg-white p-7 text-center shadow-sm">
        <h1 className="text-[20px] font-black">
          {titulo}
        </h1>
        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          {texto}
        </p>
        <Link
          href={href}
          className="mt-6 flex h-[52px] items-center justify-center rounded-[16px] bg-[#176f3c] text-[11px] font-black text-white"
        >
          {botao}
        </Link>
      </div>
    </main>
  );
}
