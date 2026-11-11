export const instant = false;

import {
  ArrowLeft,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

import FinalizarVendaForm from "./FinalizarVendaForm";
import CancelarVendaPreparada from "./CancelarVendaPreparada";

type PageProps = {
  searchParams: Promise<{
    fluxoId?: string;
  }>;
};

function moeda(valor: number) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  ).format(valor);
}

function dataBR(
  valor: string | null,
) {
  if (!valor) {
    return "—";
  }

  const [
    ano,
    mes,
    dia,
  ] = valor.split("-");

  if (
    !ano ||
    !mes ||
    !dia
  ) {
    return valor;
  }

  return `${dia}/${mes}/${ano}`;
}

function modalidade(
  tipo: string,
  parcelas:
    number | null,
) {
  if (
    tipo ===
    "SALDO_ABERTO"
  ) {
    return "Saldo em aberto";
  }

  if (
    tipo ===
    "CREDIARIO"
  ) {
    return parcelas
      ? `Parcelado em ${parcelas}x`
      : "Parcelado";
  }

  return "À vista";
}

export default async function FinalizarVendaPage({
  searchParams,
}: PageProps) {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const podePagamento =
    usuario.configuracao
      .permitirPagamentoMobile &&
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

  if (
    !podePagamento ||
    !podeEntrega
  ) {
    redirect(
      "/mobile/sem-acesso",
    );
  }

  const params =
    await searchParams;

  const fluxoId =
    Number(
      params.fluxoId,
    );

  if (
    !Number.isInteger(
      fluxoId,
    ) ||
    fluxoId <= 0
  ) {
    redirect(
      "/mobile/rota",
    );
  }

  const supabase =
    await createClient();

  const {
    data: fluxo,
    error: fluxoError,
  } =
    await supabase
      .from(
        "venda_fluxos_campo",
      )
      .select(`
        id,
        rota_cliente_id,
        cliente_id,
        carga_id,
        tipo_cesta_id,
        quantidade,
        tipo_venda,
        forma_pagamento,
        valor_total,
        valor_entrada,
        quantidade_parcelas,
        primeiro_vencimento,
        observacao,
        modo_controle,
        exigir_bipagem,
        status,
        entrega_id,
        venda_id
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "entregador_id",
        usuario.id,
      )
      .eq(
        "id",
        fluxoId,
      )
      .maybeSingle();

  if (
    fluxoError ||
    !fluxo
  ) {
    redirect(
      "/mobile/rota",
    );
  }

  if (
    fluxo.status ===
      "CONCLUIDO" &&
    fluxo.entrega_id
  ) {
    redirect(
      `/mobile/vendas/nova?entregaId=${fluxo.entrega_id}`,
    );
  }

  if (
    fluxo.status !==
    "AGUARDANDO_ENTREGA"
  ) {
    redirect(
      "/mobile/rota",
    );
  }

  const [
    clienteResult,
    tipoResult,
    cargaResult,
  ] =
    await Promise.all([
      supabase
        .from("clientes")
        .select(`
          id,
          codigo,
          nome
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "id",
          fluxo.cliente_id,
        )
        .maybeSingle(),

      supabase
        .from("tipos_cesta")
        .select(`
          id,
          codigo,
          nome,
          valor_venda
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "id",
          fluxo.tipo_cesta_id,
        )
        .maybeSingle(),

      supabase
        .from("cargas")
        .select(`
          id,
          codigo,
          status
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "id",
          fluxo.carga_id,
        )
        .maybeSingle(),
    ]);

  if (
    clienteResult.error ||
    !clienteResult.data ||
    tipoResult.error ||
    !tipoResult.data ||
    cargaResult.error ||
    !cargaResult.data
  ) {
    redirect(
      "/mobile/rota",
    );
  }

  const cliente =
    clienteResult.data;

  const tipo =
    tipoResult.data;

  const carga =
    cargaResult.data;

  const valorTotal =
    Number(
      fluxo.valor_total,
    );

  const valorEntrada =
    Number(
      fluxo.valor_entrada,
    );

  const saldo =
    Math.max(
      0,
      valorTotal -
        valorEntrada,
    );

  const exigeScanner =
    fluxo.modo_controle ===
      "VOLUME" &&
    Boolean(
      fluxo.exigir_bipagem,
    );

  return (
    <main className="app-premium min-h-dvh text-[#142018]">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] overflow-hidden bg-[#f7faf7]/90 shadow-[0_0_70px_rgba(17,63,33,0.14)]">
        <header className="hero-premium grain relative overflow-hidden px-5 pb-7 pt-5 text-white">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full border-[30px] border-white/[0.04]" />

          <div className="relative z-10 flex items-center justify-between">
            <Link
              href={fluxo.rota_cliente_id ? "/mobile/rota" : "/mobile/estoque"}
              className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/10"
            >
              <ArrowLeft
                size={19}
              />
            </Link>

            <div className="text-center">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-200">
                Etapa 2 de 2
              </p>
              <h1 className="mt-1 text-lg font-black">
                Entrega física
              </h1>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/10">
              <PackageCheck
                size={19}
              />
            </div>
          </div>

          <div className="relative z-10 mt-6">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#a8d8b7]">
              Estoque móvel do entregador
            </p>
            <h2 className="mt-2 text-[26px] font-black tracking-[-0.05em]">
              Agora entregue a cesta
              <span className="text-[#f4b13f]">.</span>
            </h2>
            <p className="mt-2 text-[11px] leading-5 text-white/65">
              O pagamento já foi informado e está salvo como pendência. A venda só entra no caixa quando esta etapa for concluída.
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
          </section>

          <section className="rounded-[26px] bg-white p-5 shadow-[0_14px_36px_rgba(17,63,33,0.05)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#b07a12]">
                  Venda preparada
                </p>
                <h3 className="mt-1 text-[18px] font-black">
                  {tipo.nome}
                </h3>
                <p className="mt-1 text-[9px] text-slate-400">
                  {fluxo.quantidade} unidade(s)
                </p>
              </div>

              <ReceiptText
                size={22}
                className="text-[#176f3c]"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Resumo
                label="Venda"
                valor={moeda(
                  valorTotal,
                )}
              />
              <Resumo
                label="Recebido"
                valor={moeda(
                  valorEntrada,
                )}
                destaque
              />
              <Resumo
                label="Saldo"
                valor={moeda(
                  saldo,
                )}
              />
              <Resumo
                label="Modalidade"
                valor={modalidade(
                  fluxo.tipo_venda,
                  fluxo.quantidade_parcelas,
                )}
              />
            </div>

            {fluxo.tipo_venda !==
              "AVISTA" && (
              <div className="mt-3 rounded-[16px] bg-[#f6f9f6] p-3">
                <p className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
                  {fluxo.tipo_venda ===
                  "SALDO_ABERTO"
                    ? "Próxima visita"
                    : "1º vencimento"}
                </p>
                <p className="mt-1 text-[12px] font-black">
                  {dataBR(
                    fluxo.primeiro_vencimento,
                  )}
                </p>
              </div>
            )}

            {valorEntrada >
              0 && (
              <p className="mt-3 text-[9px] font-bold text-slate-500">
                Forma informada: {fluxo.forma_pagamento ?? "—"}
              </p>
            )}
          </section>

          <section className="rounded-[22px] border border-sky-100 bg-sky-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={19}
                className="mt-0.5 shrink-0 text-sky-700"
              />
              <div>
                <p className="text-[10px] font-black text-sky-900">
                  Pode fechar o app sem perder a venda
                </p>
                <p className="mt-1 text-[9px] leading-5 text-sky-800/80">
                  Enquanto esta etapa não for concluída, a venda fica como negociação preparada. Se houver falha, o lançamento de entrega, estoque e financeiro será revertido em conjunto.
                </p>
              </div>
            </div>
          </section>

          {/* V65_CANCELAMENTO_VENDA_PREPARADA_UI */}
          <CancelarVendaPreparada
            fluxoId={fluxo.id}
            clienteNome={cliente.nome}
            valorTotal={valorTotal}
          />

          <FinalizarVendaForm
            fluxoId={fluxo.id}
            quantidade={Number(
              fluxo.quantidade,
            )}
            exigeScanner={exigeScanner}
            modoControle={
              fluxo.modo_controle
            }
          />

          <div className="flex items-center justify-center gap-2 pb-2 text-[8px] font-bold text-slate-400">
            <WalletCards
              size={12}
            />
            Entrega, estoque e financeiro são efetivados juntos.
          </div>
        </section>
      </div>
    </main>
  );
}

function Resumo({
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
      className={`rounded-[16px] p-3 ${
        destaque
          ? "bg-emerald-50"
          : "bg-[#f6f9f6]"
      }`}
    >
      <p className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-[13px] font-black ${
          destaque
            ? "text-emerald-800"
            : ""
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
