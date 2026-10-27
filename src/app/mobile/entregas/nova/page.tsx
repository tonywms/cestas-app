export const instant = false;

import {
  ArrowLeft,
  CircleAlert,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";

import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  PERMISSOES,
} from "@/lib/auth/permissions";

import {
  requirePermission,
} from "@/lib/auth/require-permission";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  getCargaAtiva,
} from "@/services/cargas/get-carga-ativa";

import EntregaForm from "./EntregaForm";

/* =========================================================
   PROPS NEXT 16
========================================================= */

type PageProps = {
  searchParams:
    Promise<{
      rotaClienteId?: string;
    }>;
};

/* =========================================================
   PÁGINA
========================================================= */

export default async function NovaEntregaPage({
  searchParams,
}: PageProps) {
  /*
   * =======================================================
   * PERMISSÃO
   * =======================================================
   */

  const usuario =
    await requirePermission(
      PERMISSOES.ENTREGA_REALIZAR,
    );

  const params =
    await searchParams;

  if (
    usuario.configuracao
      .modoControleCarga ===
    "VOLUME"
  ) {
    const query =
      params.rotaClienteId
        ? `?rotaClienteId=${encodeURIComponent(params.rotaClienteId)}`
        : "";

    redirect(
      `/mobile/entregas/volume${query}`,
    );
  }

  /*
   * =======================================================
   * ROTA CLIENTE
   * =======================================================
   */

  const rotaClienteIdInformado =
    params.rotaClienteId
      ? Number(
          params.rotaClienteId,
        )
      : null;

  /*
   * =======================================================
   * CARGA ATIVA
   * =======================================================
   */

  const {
    carga,
    erro,
  } = await getCargaAtiva({
    entregadorId:
      usuario.id,

    empresaId:
      usuario.empresa.id,
  });

  /*
   * =======================================================
   * ERRO DA CARGA
   * =======================================================
   */

  if (erro) {
    return (
      <main className="min-h-dvh bg-[#eaf2ec] px-4 py-6 text-[#142018]">

        <div className="mx-auto max-w-[480px]">

          <div className="rounded-[30px] border border-red-100 bg-white p-7 shadow-[0_24px_60px_-30px_rgba(127,29,29,0.25)]">

            <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-red-50 text-red-600">
              <CircleAlert
                size={25}
              />
            </div>

            <h1 className="mt-5 text-xl font-black">
              Não foi possível iniciar a entrega
            </h1>

            <p className="mt-3 text-xs leading-6 text-slate-500">
              {erro}
            </p>

            <Link
              href="/mobile"
              className="mt-6 flex h-[50px] items-center justify-center rounded-[16px] bg-[#176f3c] text-xs font-black text-white"
            >
              Voltar
            </Link>

          </div>

        </div>

      </main>
    );
  }

  /*
   * =======================================================
   * SEM CARGA
   * =======================================================
   */

  if (!carga) {
    return (
      <main className="min-h-dvh bg-[#eaf2ec] px-4 py-6 text-[#142018]">

        <div className="mx-auto max-w-[480px]">

          <div className="rounded-[30px] border border-black/[0.04] bg-white p-7 text-center shadow-[0_24px_60px_-30px_rgba(17,63,33,0.22)]">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[21px] bg-[#eaf5ed] text-[#176f3c]">
              <Truck
                size={28}
              />
            </div>

            <h1 className="mt-5 text-xl font-black">
              Nenhuma carga disponível
            </h1>

            <p className="mt-3 text-xs leading-6 text-slate-400">
              Você precisa possuir uma carga ativa
              antes de realizar entregas.
            </p>

            <Link
              href="/mobile"
              className="mt-6 flex h-[50px] items-center justify-center rounded-[16px] bg-[#176f3c] text-xs font-black text-white"
            >
              Voltar
            </Link>

          </div>

        </div>

      </main>
    );
  }

  const supabase =
    await createClient();

  /*
   * =======================================================
   * CLIENTE VINDO DA ROTA
   * =======================================================
   */

  let rotaClienteId:
    number | null =
    null;

  let clienteSelecionadoId:
    number | null =
    null;

  let sequenciaRota:
    number | null =
    null;

  if (
    rotaClienteIdInformado &&
    Number.isInteger(
      rotaClienteIdInformado,
    ) &&
    rotaClienteIdInformado >
      0
  ) {
    const {
      data: itemRota,
      error: itemRotaError,
    } = await supabase
      .from(
        "rota_clientes",
      )
      .select(`
        id,
        rota_id,
        cliente_id,
        sequencia,
        status
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "id",
        rotaClienteIdInformado,
      )
      .maybeSingle();

    if (
      itemRotaError ||
      !itemRota
    ) {
      redirect(
        "/mobile/rota",
      );
    }

    /*
     * CONFIRMA QUE A ROTA É DO USUÁRIO
     */

    const {
      data: rota,
      error: rotaError,
    } = await supabase
      .from("rotas")
      .select(`
        id,
        codigo,
        entregador_id,
        status
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "id",
        itemRota.rota_id,
      )
      .eq(
        "entregador_id",
        usuario.id,
      )
      .in(
        "status",
        [
          "PLANEJADA",
          "EM_ROTA",
        ],
      )
      .maybeSingle();

    if (
      rotaError ||
      !rota
    ) {
      redirect(
        "/mobile/rota",
      );
    }

    /*
     * CLIENTE JÁ ATENDIDO
     */

    if (
      itemRota.status ===
      "ENTREGUE"
    ) {
      redirect(
        "/mobile/rota",
      );
    }

    rotaClienteId =
      itemRota.id;

    clienteSelecionadoId =
      itemRota.cliente_id;

    sequenciaRota =
      itemRota.sequencia;
  }

  /*
   * =======================================================
   * CLIENTES
   * =======================================================
   */

  const {
    data: clientes,
    error: clientesError,
  } = await supabase
    .from("clientes")
    .select(`
      id,
      codigo,
      nome,
      telefone,
      logradouro,
      numero,
      bairro,
      cidade,
      uf
    `)
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "ativo",
      true,
    )
    .order(
      "nome",
    );

  if (
    clientesError
  ) {
    console.error(
      "Erro ao consultar clientes:",
      clientesError,
    );
  }

  /*
   * =======================================================
   * ITENS DISPONÍVEIS
   * =======================================================
   */

  const itens =
    carga.carga_itens
      .filter(
        (item) =>
          item.tipos_cesta,
      )
      .map(
        (item) => {
          const saldo =
            item.quantidade_carregada -
            item.quantidade_entregue -
            item.quantidade_retornada -
            item.quantidade_avariada;

          return {
            tipoCestaId:
              item.tipos_cesta!.id,

            nome:
              item.tipos_cesta!.nome,

            codigo:
              item.tipos_cesta!.codigo,

            saldo:
              Math.max(
                0,
                saldo,
              ),
          };
        },
      )
      .filter(
        (item) =>
          item.saldo > 0,
      );

  /*
   * =======================================================
   * CLIENTE SELECIONADO
   * =======================================================
   */

  const clienteSelecionado =
    clienteSelecionadoId
      ? (
          clientes ??
          []
        ).find(
          (cliente) =>
            cliente.id ===
            clienteSelecionadoId,
        ) ?? null
      : null;

  if (
    rotaClienteId &&
    !clienteSelecionado
  ) {
    redirect(
      "/mobile/rota",
    );
  }

  /*
   * =======================================================
   * TELA
   * =======================================================
   */

  return (
    <main className="min-h-dvh bg-[#e9f1eb] text-[#142018]">

      <div className="mx-auto min-h-dvh w-full max-w-[480px] overflow-hidden bg-[#f7faf7] shadow-[0_0_70px_rgba(17,63,33,0.14)]">

        {/* =================================================
            TOPBAR
        ================================================= */}

        <header className="relative overflow-hidden bg-white px-5 py-4">

          <div className="flex items-center gap-4">

            <Link
              href={
                rotaClienteId
                  ? "/mobile/rota"
                  : "/mobile/carga"
              }
              className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-[#eaf5ed] text-[#176f3c] transition active:scale-95"
            >
              <ArrowLeft
                size={19}
              />
            </Link>

            <div>

              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700">
                Operação
              </p>

              <h1 className="mt-0.5 text-[17px] font-black tracking-[-0.03em]">
                Nova entrega
              </h1>

            </div>

          </div>

        </header>

        {/* =================================================
            HERO
        ================================================= */}

        <section className="relative overflow-hidden bg-[linear-gradient(150deg,#17733f_0%,#0f6536_48%,#084825_100%)] px-5 pb-7 pt-7 text-white">

          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full border-[28px] border-white/[0.035]" />

          <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-white/[0.035]" />

          <div className="relative z-10">

            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-white/10 bg-white/10 backdrop-blur">

              <PackageCheck
                size={22}
              />

            </div>

            <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              {rotaClienteId
                ? "Atendimento da rota"
                : "Entrega avulsa"}
            </p>

            <h2 className="mt-2 text-[30px] font-black leading-none tracking-[-0.05em]">
              Entregar cesta
              <span className="text-emerald-300">
                .
              </span>
            </h2>

            <p className="mt-4 max-w-[330px] text-[11px] leading-5 text-white/60">
              {rotaClienteId
                ? "O cliente desta parada já foi definido pelo planejamento da rota."
                : "Selecione o cliente, a cesta e informe a quantidade da entrega."}
            </p>

            {/* INFO OPERAÇÃO */}

            <div className="mt-5 grid grid-cols-2 gap-2.5">

              <div className="rounded-[17px] border border-white/10 bg-white/[0.07] px-3 py-3 backdrop-blur-xl">

                <p className="text-[7px] font-black uppercase tracking-[0.16em] text-white/40">
                  Carga
                </p>

                <p className="mt-1 truncate text-[10px] font-black">
                  {carga.codigo}
                </p>

              </div>

              <div className="rounded-[17px] border border-white/10 bg-white/[0.07] px-3 py-3 backdrop-blur-xl">

                <p className="text-[7px] font-black uppercase tracking-[0.16em] text-white/40">
                  Saldo
                </p>

                <p className="mt-1 text-[10px] font-black">
                  {itens.reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      item.saldo,
                    0,
                  )}{" "}
                  cesta(s)
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            CONTEÚDO
        ================================================= */}

        <div className="px-5 pb-10 pt-5">

          {/* CLIENTE DA ROTA */}

          {clienteSelecionado && (
            <div className="mb-4 overflow-hidden rounded-[26px] border border-emerald-200 bg-[linear-gradient(145deg,#f1fbf4,#ffffff)] p-5 shadow-[0_18px_45px_-30px_rgba(16,185,129,0.40)]">

              <div className="flex items-start justify-between gap-3">

                <div className="flex items-start gap-3">

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[#176f3c] text-white shadow-[0_10px_25px_rgba(23,111,60,0.18)]">

                    <MapPin
                      size={20}
                    />

                  </div>

                  <div>

                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-700">
                      Cliente da rota
                    </p>

                    <h3 className="mt-1 text-[17px] font-black">
                      {
                        clienteSelecionado.nome
                      }
                    </h3>

                    <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
                      {
                        clienteSelecionado.codigo
                      }
                    </p>

                  </div>

                </div>

                {sequenciaRota && (
                  <div className="rounded-[13px] bg-white px-3 py-2 text-center shadow-sm">

                    <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">
                      Parada
                    </p>

                    <p className="mt-0.5 text-sm font-black text-[#176f3c]">
                      #{sequenciaRota}
                    </p>

                  </div>
                )}

              </div>

              <div className="mt-4 flex items-start gap-2.5 rounded-[16px] bg-white/70 p-3">

                <MapPin
                  size={14}
                  className="mt-0.5 shrink-0 text-[#176f3c]"
                />

                <p className="text-[10px] leading-5 text-slate-500">

                  {clienteSelecionado.logradouro ??
                    "Endereço não informado"}

                  {clienteSelecionado.numero
                    ? `, ${clienteSelecionado.numero}`
                    : ""}

                  {clienteSelecionado.bairro
                    ? ` - ${clienteSelecionado.bairro}`
                    : ""}

                </p>

              </div>

            </div>
          )}

          {/* SEGURANÇA */}

          {rotaClienteId && (
            <div className="mb-4 flex items-start gap-3 rounded-[20px] border border-emerald-100 bg-emerald-50 px-4 py-4">

              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-emerald-700"
              />

              <div>

                <p className="text-[10px] font-black text-emerald-800">
                  Atendimento vinculado à rota
                </p>

                <p className="mt-1 text-[9px] leading-5 text-emerald-700/70">
                  Esta entrega será registrada automaticamente
                  na parada selecionada.
                </p>

              </div>

            </div>
          )}

          {/* SEM CLIENTE */}

          {(clientes ?? [])
            .length === 0 ? (
            <div className="rounded-[26px] bg-white p-7 text-center shadow-sm">

              <h2 className="text-base font-black">
                Nenhum cliente cadastrado
              </h2>

              <p className="mt-2 text-xs text-slate-400">
                Cadastre clientes antes de realizar a entrega.
              </p>

            </div>
          ) : itens.length ===
            0 ? (
            <div className="rounded-[26px] bg-white p-7 text-center shadow-sm">

              <PackageCheck
                size={30}
                className="mx-auto text-slate-300"
              />

              <h2 className="mt-4 text-base font-black">
                Sem saldo disponível
              </h2>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                Sua carga não possui mais cestas disponíveis.
              </p>

            </div>
          ) : (
            <EntregaForm
              cargaId={
                carga.id
              }
              cargaCodigo={
                carga.codigo
              }
              clientes={
                clientes ??
                []
              }
              itens={
                itens
              }
              rotaClienteId={
                rotaClienteId
              }
              clienteSelecionado={
                clienteSelecionado
              }
            />
          )}

        </div>

      </div>

    </main>
  );
}