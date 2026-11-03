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

import VendaCampoForm from "./VendaCampoForm";

type PageProps = {
  searchParams: Promise<{
    entregaId?: string;
  }>;
};

function dataMais30Dias() {
  const hoje = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Fortaleza",
      year:
        "numeric",
      month:
        "2-digit",
      day:
        "2-digit",
    },
  ).format(new Date());

  const data =
    new Date(
      `${hoje}T12:00:00Z`,
    );

  data.setUTCDate(
    data.getUTCDate() +
      30,
  );

  return data
    .toISOString()
    .slice(0, 10);
}

function moeda(
  valor: number,
) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style:
        "currency",
      currency:
        "BRL",
    },
  ).format(valor);
}

function dataBR(
  valor: string | null | undefined,
) {
  if (!valor) {
    return "—";
  }

  const [ano, mes, dia] = valor.slice(0, 10).split("-");

  if (!ano || !mes || !dia) {
    return valor;
  }

  return `${dia}/${mes}/${ano}`;
}

export default async function NovaVendaCampoPage({
  searchParams,
}: PageProps) {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const autorizado =
    usuario.configuracao
      .permitirPagamentoMobile &&
    (
      usuario.isPlatformAdmin ||
      temPermissao(
        usuario.permissoes,
        PERMISSOES.PAGAMENTO_REGISTRAR,
      )
    );

  if (!autorizado) {
    redirect(
      "/mobile/sem-acesso",
    );
  }

  const params =
    await searchParams;

  const entregaId =
    Number(
      params.entregaId,
    );

  if (
    !Number.isInteger(
      entregaId,
    ) ||
    entregaId <= 0
  ) {
    redirect(
      "/mobile/rota",
    );
  }

  const supabase =
    await createClient();

  const {
    data: entrega,
    error: entregaError,
  } =
    await supabase
      .from("entregas")
      .select(`
        id,
        cliente_id,
        entregador_id,
        status,
        rota_cliente_id,
        entregue_at
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "id",
        entregaId,
      )
      .eq(
        "entregador_id",
        usuario.id,
      )
      .eq(
        "status",
        "CONCLUIDA",
      )
      .maybeSingle();

  if (
    entregaError ||
    !entrega
  ) {
    redirect(
      "/mobile/rota",
    );
  }

  const {
    data: vendaExistente,
  } =
    await supabase
      .from("vendas")
      .select(`
        id,
        codigo,
        tipo_venda,
        valor_total,
        valor_entrada,
        forma_pagamento,
        contrato_id
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "entrega_id",
        entregaId,
      )
      .maybeSingle();

  const [
    clienteResult,
    itensResult,
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
          entrega.cliente_id,
        )
        .maybeSingle(),

      supabase
        .from(
          "entrega_itens",
        )
        .select(`
          id,
          tipo_cesta_id,
          quantidade
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "entrega_id",
          entregaId,
        ),
    ]);

  if (
    clienteResult.error ||
    !clienteResult.data ||
    itensResult.error
  ) {
    redirect(
      "/mobile/rota",
    );
  }

  const cliente =
    clienteResult.data;

  const itensRaw =
    itensResult.data ??
    [];

  const tipoIds =
    Array.from(
      new Set(
        itensRaw.map(
          (item) =>
            Number(
              item.tipo_cesta_id,
            ),
        ),
      ),
    );

  const {
    data: tipos,
  } =
    tipoIds.length >
    0
      ? await supabase
          .from(
            "tipos_cesta",
          )
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
          .in(
            "id",
            tipoIds,
          )
      : {
          data: [],
        };

  const tiposMap =
    new Map(
      (
        tipos ??
        []
      ).map(
        (item) => [
          Number(
            item.id,
          ),
          item,
        ],
      ),
    );

  const itens =
    itensRaw.map(
      (item) => {
        const tipo =
          tiposMap.get(
            Number(
              item.tipo_cesta_id,
            ),
          );

        const quantidade =
          Number(
            item.quantidade ??
              0,
          );

        const valorUnitario =
          Number(
            tipo
              ?.valor_venda ??
              0,
          );

        return {
          nome:
            String(
              tipo?.nome ??
                "Cesta",
            ),
          quantidade,
          valorUnitario,
          subtotal:
            quantidade *
            valorUnitario,
        };
      },
    );

  const valorTotal =
    itens.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.subtotal,
      0,
    );

  let contratoVenda: {
    codigo: string;
    modalidade: string | null;
    quantidade_parcelas: number;
    proxima_visita_sugerida: string | null;
    primeiro_vencimento: string;
  } | null = null;

  let saldoRestante = 0;
  let proximoCompromisso: string | null = null;

  if (
    vendaExistente?.contrato_id
  ) {
    const [
      contratoVendaResult,
      parcelasVendaResult,
    ] = await Promise.all([
      supabase
        .from("contratos")
        .select(`
          codigo,
          modalidade,
          quantidade_parcelas,
          proxima_visita_sugerida,
          primeiro_vencimento
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "id",
          vendaExistente.contrato_id,
        )
        .maybeSingle(),

      supabase
        .from("parcelas")
        .select(`
          valor,
          valor_pago,
          status,
          vencimento
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "contrato_id",
          vendaExistente.contrato_id,
        )
        .in(
          "status",
          [
            "ABERTA",
            "PARCIAL",
          ],
        )
        .order(
          "vencimento",
          { ascending: true },
        ),
    ]);

    contratoVenda =
      contratoVendaResult.data ??
      null;

    const parcelasVenda =
      parcelasVendaResult.data ??
      [];

    saldoRestante =
      parcelasVenda.reduce(
        (total, parcela) =>
          total +
          (
            Number(
              parcela.valor,
            ) -
            Number(
              parcela.valor_pago,
            )
          ),
        0,
      );

    proximoCompromisso =
      contratoVenda
        ?.modalidade ===
      "SALDO_ABERTO"
        ? contratoVenda
            .proxima_visita_sugerida
        : parcelasVenda[0]
            ?.vencimento ??
          contratoVenda
            ?.primeiro_vencimento ??
          null;
  }

  const valorVendaExistente =
    vendaExistente
      ? Number(
          vendaExistente.valor_total ??
            0,
        )
      : 0;

  const valorRecebidoHoje =
    vendaExistente
      ? vendaExistente.tipo_venda ===
        "AVISTA"
        ? valorVendaExistente
        : Number(
            vendaExistente.valor_entrada ??
              0,
          )
      : 0;

  const saldoExibido =
    vendaExistente
      ? vendaExistente.contrato_id
        ? saldoRestante
        : Math.max(
            0,
            valorVendaExistente -
              valorRecebidoHoje,
          )
      : 0;

  return (
    <main className="app-premium min-h-dvh text-[#142018]">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] overflow-hidden bg-[#f7faf7]/90 shadow-[0_0_70px_rgba(17,63,33,0.14)]">
        <header className="hero-premium grain relative overflow-hidden px-5 pb-8 pt-5 text-white">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full border-[30px] border-white/[0.04]" />

          <div className="relative z-10 flex items-center justify-between">
            <Link
              href="/mobile/rota"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/10"
            >
              <ArrowLeft
                size={19}
              />
            </Link>

            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
                Financeiro
              </p>

              <h1 className="mt-1 text-lg font-black">
                Venda em Campo
              </h1>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/10">
              <WalletCards
                size={19}
              />
            </div>
          </div>

          <div className="relative z-10 mt-7">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#a8d8b7]">
              Entrega #{entrega.id}
            </p>

            <h2 className="mt-2 text-[27px] font-black tracking-[-0.05em]">
              Feche a venda
              <span className="text-[#f4b13f]">
                .
              </span>
            </h2>

            <p className="mt-2 text-[11px] leading-5 text-white/65">
              A cesta já foi entregue. Registre agora como esta venda será recebida.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-[9px] font-black">
              <ReceiptText
                size={13}
              />
              {moeda(
                valorTotal,
              )}
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 py-6">
          {vendaExistente ? (
            <section className="rounded-[28px] border border-emerald-200 bg-white p-5 shadow-[0_18px_45px_rgba(17,63,33,0.07)]">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-emerald-600 text-white">
                  <ShieldCheck
                    size={27}
                  />
                </div>

                <p className="mt-4 text-[8px] font-black uppercase tracking-[0.18em] text-emerald-700">
                  Venda registrada
                </p>

                <h2 className="mt-1 text-[20px] font-black">
                  {cliente.nome}
                </h2>

                <p className="mt-1 text-[9px] font-bold text-slate-400">
                  {cliente.codigo} • {vendaExistente.codigo}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 text-left">
                <div className="rounded-[16px] bg-[#f6f9f6] p-3.5">
                  <p className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
                    Valor da venda
                  </p>
                  <p className="mt-1 text-[16px] font-black">
                    {moeda(
                      valorVendaExistente,
                    )}
                  </p>
                </div>

                <div className="rounded-[16px] bg-emerald-50 p-3.5">
                  <p className="text-[7px] font-black uppercase tracking-[0.1em] text-emerald-700">
                    Recebido hoje
                  </p>
                  <p className="mt-1 text-[16px] font-black text-emerald-800">
                    {moeda(
                      valorRecebidoHoje,
                    )}
                  </p>
                  <p className="mt-1 text-[8px] font-bold text-emerald-700">
                    {vendaExistente.forma_pagamento ??
                      "—"}
                  </p>
                </div>

                <div className="rounded-[16px] bg-amber-50 p-3.5">
                  <p className="text-[7px] font-black uppercase tracking-[0.1em] text-amber-700">
                    Saldo restante
                  </p>
                  <p className="mt-1 text-[16px] font-black text-amber-800">
                    {moeda(
                      saldoExibido,
                    )}
                  </p>
                </div>

                <div className="rounded-[16px] bg-sky-50 p-3.5">
                  <p className="text-[7px] font-black uppercase tracking-[0.1em] text-sky-700">
                    Modalidade
                  </p>
                  <p className="mt-1 text-[12px] font-black text-sky-900">
                    {vendaExistente.tipo_venda ===
                    "CREDIARIO"
                      ? `Parcelado${
                          contratoVenda
                            ?.quantidade_parcelas
                            ? ` em ${contratoVenda.quantidade_parcelas}x`
                            : ""
                        }`
                      : vendaExistente.tipo_venda ===
                          "SALDO_ABERTO"
                        ? "Saldo em aberto"
                        : "À vista"}
                  </p>
                </div>
              </div>

              {vendaExistente.contrato_id && (
                <div className="mt-3 rounded-[16px] border border-slate-100 bg-white p-3.5 text-left">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
                        {contratoVenda
                          ?.modalidade ===
                        "SALDO_ABERTO"
                          ? "Próxima visita sugerida"
                          : "Próximo vencimento"}
                      </p>
                      <p className="mt-1 text-[13px] font-black">
                        {dataBR(
                          proximoCompromisso,
                        )}
                      </p>
                    </div>

                    {contratoVenda
                      ?.codigo && (
                      <div className="text-right">
                        <p className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
                          Contrato
                        </p>
                        <p className="mt-1 text-[9px] font-black text-slate-600">
                          {contratoVenda.codigo}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <p className="mt-4 text-center text-[9px] leading-4 text-slate-400">
                O valor da venda é o total da cesta. O recebido hoje é o que entrou no caixa; o saldo restante continua na carteira do cliente.
              </p>

              <Link
                href="/mobile/rota"
                className="mt-5 flex h-[52px] items-center justify-center rounded-[16px] bg-[#176f3c] text-[11px] font-black text-white"
              >
                Continuar minha rota
              </Link>
            </section>
          ) : valorTotal <=
            0 ? (
            <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-center">
              <h2 className="text-[18px] font-black text-amber-900">
                Preço não configurado
              </h2>

              <p className="mt-2 text-[10px] leading-5 text-amber-800">
                Configure o valor de venda da cesta no administrativo antes de registrar a venda.
              </p>

              <Link
                href="/mobile/rota"
                className="mt-5 flex h-[50px] items-center justify-center rounded-[16px] bg-amber-700 text-[10px] font-black text-white"
              >
                Voltar para rota
              </Link>
            </section>
          ) : (
            <VendaCampoForm
              entregaId={
                entrega.id
              }
              clienteNome={
                cliente.nome
              }
              clienteCodigo={
                cliente.codigo
              }
              valorTotal={
                valorTotal
              }
              itens={
                itens
              }
              primeiroVencimento={
                dataMais30Dias()
              }
            />
          )}
        </section>
      </div>
    </main>
  );
}