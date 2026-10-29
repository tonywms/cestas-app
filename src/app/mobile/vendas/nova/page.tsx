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
            <section className="rounded-[28px] border border-emerald-200 bg-white p-6 text-center shadow-[0_18px_45px_rgba(17,63,33,0.07)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-emerald-600 text-white">
                <ShieldCheck
                  size={27}
                />
              </div>

              <p className="mt-5 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">
                Venda já registrada
              </p>

              <h2 className="mt-2 text-[21px] font-black">
                {
                  vendaExistente.codigo
                }
              </h2>

              <p className="mt-2 text-[11px] text-slate-500">
                {moeda(
                  Number(
                    vendaExistente.valor_total,
                  ),
                )} • {
                  vendaExistente.tipo_venda ===
                  "CREDIARIO"
                    ? "Crediário"
                    : "À vista"
                }
              </p>

              <Link
                href="/mobile/rota"
                className="mt-6 flex h-[52px] items-center justify-center rounded-[16px] bg-[#176f3c] text-[11px] font-black text-white"
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
