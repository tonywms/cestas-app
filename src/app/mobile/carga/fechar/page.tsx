export const instant = false;

import {
  AlertTriangle,
  ArrowLeft,
  Barcode,
  Boxes,
  CheckCircle2,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";

import Link from "next/link";
import { redirect } from "next/navigation";

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

import FecharCargaForm from "./FecharCargaForm";

type PageProps = {
  searchParams?: Promise<{
    rotaFinalizada?: string;
    rota?: string;
  }>;
};

type Bloqueio = {
  id: string;
  titulo: string;
  detalhe: string;
  href: string;
  acao: string;
};

export default async function FecharCargaPage({
  searchParams,
}: PageProps) {
  const usuario =
    await requirePermission(
      PERMISSOES.CARGA_RETORNAR,
    );

  const params =
    searchParams
      ? await searchParams
      : {};

  const {
    carga,
    erro,
  } = await getCargaAtiva({
    entregadorId:
      usuario.id,

    empresaId:
      usuario.empresa.id,
  });

  if (
    erro ||
    !carga
  ) {
    redirect(
      "/mobile/carga",
    );
  }

  const itens =
    carga.carga_itens.map(
      (item) => ({
        id:
          item.id,

        nome:
          item.tipos_cesta
            ?.nome ??
          "Tipo de cesta",

        codigo:
          item.tipos_cesta
            ?.codigo ??
          "-",

        saldo:
          Math.max(
            0,
            item.quantidade_carregada -
              item.quantidade_entregue -
              item.quantidade_retornada -
              item.quantidade_avariada,
          ),

        tipoCestaId:
          item.tipos_cesta?.id ?? 0,
      }),
    );

  if (itens.some((item) => !Number.isInteger(item.tipoCestaId) || item.tipoCestaId <= 0)) {
    redirect("/mobile/carga");
  }

  const totalSaldo =
    itens.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.saldo,
      0,
    );

  const modoVolume =
    usuario.configuracao
      .modoControleCarga ===
    "VOLUME";

  const exigeBipagemCarga =
    modoVolume &&
    usuario.configuracao
      .exigirBipagemCarga;

  const supabase =
    await createClient();

  const {
    data: rotaAtiva,
    error: rotaAtivaError,
  } = await supabase
    .from("rotas")
    .select("id, codigo, status")
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "entregador_id",
      usuario.id,
    )
    .eq("carga_id", carga.id)
    .in(
      "status",
      [
        "PLANEJADA",
        "EM_ROTA",
      ],
    )
    .order(
      "created_at",
      {
        ascending:
          false,
      },
    )
    .limit(1)
    .maybeSingle();

  if (rotaAtivaError) {
    console.error(
      "Erro ao conferir rota no fechamento da carga:",
      rotaAtivaError,
    );
  }

  // V61_4_GATE_DIRETO_FECHAMENTO
  const {
    data: rotaFinalizadaDaCarga,
    error: rotaFinalizadaError,
  } = await supabase
    .from("rotas")
    .select("id, codigo, status, carga_id, finalizada_at")
    .eq("empresa_id", usuario.empresa.id)
    .eq("entregador_id", usuario.id)
    .eq("carga_id", carga.id)
    .eq("status", "FINALIZADA")
    .not("finalizada_at", "is", null)
    .order("finalizada_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (rotaFinalizadaError) {
    console.error(
      "Erro ao conferir jornada finalizada no fechamento da carga:",
      rotaFinalizadaError,
    );
  }

  const {
    count: fluxosPendentes,
    error: fluxosPendentesError,
  } = await supabase
    .from(
      "venda_fluxos_campo",
    )
    .select(
      "id",
      {
        count:
          "exact",
        head:
          true,
      },
    )
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "entregador_id",
      usuario.id,
    )
    .eq("carga_id", carga.id)
    .eq(
      "status",
      "AGUARDANDO_ENTREGA",
    );

  if (
    fluxosPendentesError
  ) {
    console.error(
      "Erro ao conferir vendas preparadas no fechamento da carga:",
      fluxosPendentesError,
    );
  }

  let volumesEsperados = 0;
  let volumesConfirmados = 0;
  let volumesEmPosse = 0;
  let volumesEmPosseDetalhes: Array<{
    id: string;
    codigoVolume: string;
    tipoCestaId: number;
  }> = [];
  let erroConferenciaVolume = false;

  if (modoVolume) {
    const [
      esperadosResult,
      emPosseResult,
      confirmadosResult,
    ] = await Promise.all([
      supabase
        .from(
          "cesta_volumes",
        )
        .select(
          "id",
          {
            count:
              "exact",
            head:
              true,
          },
        )
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "carga_id",
          carga.id,
        ),

      supabase
        .from(
          "cesta_volumes",
        )
        .select(
          "id, codigo_volume, tipo_cesta_id",
        )
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "carga_id",
          carga.id,
        )
        .eq(
          "status",
          "EM_CARGA",
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          },
        )
        .order(
          "id",
          {
            ascending:
              true,
          },
        ),

      exigeBipagemCarga
        ? supabase
            .from(
              "carga_volume_bipagens",
            )
            .select(
              "id",
              {
                count:
                  "exact",
                head:
                  true,
              },
            )
            .eq(
              "empresa_id",
              usuario.empresa.id,
            )
            .eq(
              "carga_id",
              carga.id,
            )
        : Promise.resolve({
            count:
              null,
            error:
              null,
          }),
    ]);

    if (
      esperadosResult.error ||
      emPosseResult.error ||
      confirmadosResult.error
    ) {
      erroConferenciaVolume =
        true;

      console.error(
        "Erro ao conferir volumes no fechamento da carga:",
        {
          esperados:
            esperadosResult.error,
          emPosse:
            emPosseResult.error,
          confirmados:
            confirmadosResult.error,
        },
      );
    }

    volumesEsperados =
      esperadosResult.count ??
      0;

    volumesEmPosseDetalhes =
      (
        emPosseResult.data ??
        []
      ).map(
        (volume) => ({
          id:
            volume.id,
          codigoVolume:
            volume.codigo_volume,
          tipoCestaId:
            volume.tipo_cesta_id,
        }),
      );

    volumesEmPosse =
      volumesEmPosseDetalhes.length;

    volumesConfirmados =
      exigeBipagemCarga
        ? confirmadosResult.count ??
          0
        : volumesEsperados;
  }

  const bloqueios:
    Bloqueio[] = [];

  if (rotaAtivaError) {
    bloqueios.push({
      id: "erro-verificacao-rota",
      titulo: "Não foi possível verificar a rota desta carga",
      detalhe: "Atualize a tela antes de fechar. Nenhuma movimentação foi registrada.",
      href: "/mobile/carga/fechar",
      acao: "Atualizar",
    });
  }

  if (rotaAtiva) {
    bloqueios.push({
      id:
        "rota-ativa",
      titulo:
        "Rota ainda aberta",
      detalhe:
        rotaAtiva.codigo
          ? `Finalize a rota ${rotaAtiva.codigo} antes de fechar a carga.`
          : "Finalize a rota antes de fechar a carga.",
      href:
        "/mobile/rota",
      acao:
        "Ir para rota",
    });
  }

  if (!rotaFinalizadaDaCarga) {
    bloqueios.push({
      id:
        "jornada-nao-finalizada",
      titulo:
        "Jornada ainda não concluída",
      detalhe:
        "Esta carga só pode ser fechada depois que uma rota vinculada a ela for finalizada.",
      href:
        "/mobile/rota",
      acao:
        "Ir para Minha Rota",
    });
  }

  if (
    (fluxosPendentes ?? 0) >
    0
  ) {
    bloqueios.push({
      id:
        "venda-pendente",
      titulo:
        "Venda aguardando entrega",
      detalhe:
        `Existe${(fluxosPendentes ?? 0) === 1 ? "" : "m"} ${fluxosPendentes ?? 0} venda(s) preparada(s) que ainda não foram concluídas.`,
      href:
        "/mobile/rota",
      acao:
        "Resolver venda",
    });
  }

  if (
    exigeBipagemCarga &&
    volumesEsperados > 0 &&
    volumesConfirmados <
      volumesEsperados
  ) {
    bloqueios.push({
      id:
        "bipagem-pendente",
      titulo:
        "Conferência da carga incompleta",
      detalhe:
        `${volumesConfirmados} de ${volumesEsperados} volume(s) foram confirmados.`,
      href:
        "/mobile/carga/receber",
      acao:
        "Conferir volumes",
    });
  }

  // Fechamento completo: confere saldo e volumes ativos por TIPO,
  // evitando compensacao entre dois modelos de cesta.
  if (modoVolume && !erroConferenciaVolume) {
    const tipos = new Set([
      ...itens.map((item) => item.tipoCestaId),
      ...volumesEmPosseDetalhes.map((volume) => volume.tipoCestaId),
    ]);
    for (const tipoId of tipos) {
      const tipoItens = itens.filter((item) => item.tipoCestaId === tipoId);
      const saldoTipo = tipoItens.reduce((total, item) => total + item.saldo, 0);
      const ativosTipo = volumesEmPosseDetalhes.filter((volume) => volume.tipoCestaId === tipoId).length;
      if (saldoTipo !== ativosTipo) {
        const descricao = tipoItens[0]?.nome ?? ("Tipo nº " + tipoId);
        bloqueios.push({
          id: "divergencia-tipo-" + tipoId,
          titulo: "Volume físico divergente: " + descricao,
          detalhe: "Saldo esperado " + saldoTipo + "; volumes em posse " + ativosTipo + ". Revise as etiquetas antes de encerrar.",
          href: "/mobile/carga",
          acao: "Ver Minha Carga",
        });
      }
    }
  }

  if (
    modoVolume &&
    !erroConferenciaVolume &&
    volumesEmPosse !==
      totalSaldo
  ) {
    bloqueios.push({
      id:
        "divergencia-volume",
      titulo:
        "Saldo físico divergente",
      detalhe:
        `A carga indica ${totalSaldo} cesta(s) em posse, mas existem ${volumesEmPosse} volume(s) ativos. Atualize e confira antes de finalizar.`,
      href:
        "/mobile/carga",
      acao:
        "Ver Minha Carga",
    });
  }

  if (
    modoVolume &&
    erroConferenciaVolume
  ) {
    bloqueios.push({
      id:
        "erro-volume",
      titulo:
        "Não foi possível conferir os volumes",
      detalhe:
        "Atualize a carga antes de finalizar para garantir que o saldo físico esteja correto.",
      href:
        "/mobile/carga",
      acao:
        "Atualizar carga",
    });
  }

  const liberado =
    bloqueios.length ===
    0;

  const rotaFinalizadaAgora =
    params.rotaFinalizada ===
    "1";

  return (
    <main className="min-h-dvh bg-[#eaf2ec] text-[#142018]">

      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7] pb-10">

        <header className="relative overflow-hidden bg-[linear-gradient(155deg,#176b3a,#0d5a30)] px-4 pb-5 pt-4 text-white">

          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full border-[28px] border-white/[0.04]" />

          <div className="relative z-10 flex items-center justify-between">

            <Link
              href="/mobile/carga"
              className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/10"
            >
              <ArrowLeft
                size={18}
              />
            </Link>

            <div className="text-center">

              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-200">
                Estoque móvel
              </p>

              <h1 className="mt-0.5 text-[17px] font-black">
                Fechar carga
              </h1>

            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/10">
              <RotateCcw
                size={17}
              />
            </div>

          </div>

          <div className="relative z-10 mt-4">

            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.15em] text-[#a8d8b7]">
              <Boxes
                size={13}
              />

              {carga.codigo}
            </div>

            <div className="mt-2 flex items-end justify-between gap-4">

              <div>
                <h2 className="text-[24px] font-black tracking-[-0.045em]">
                  Devolução ao CD
                  <span className="text-[#f4b13f]">
                    .
                  </span>
                </h2>

                <p className="mt-1 text-[10px] leading-5 text-white/65">
                  Encerramento da carga selecionada. Nada é devolvido enquanto você não confirmar.
                </p>
              </div>

              <div className="shrink-0 rounded-[16px] border border-white/10 bg-white/[0.08] px-3 py-2 text-right">
                <p className="text-[7px] font-black uppercase tracking-[0.12em] text-white/55">
                  Em posse
                </p>
                <p className="mt-0.5 text-[22px] font-black">
                  {totalSaldo}
                </p>
              </div>

            </div>

          </div>

        </header>

        <section className="space-y-4 px-4 py-4">

          {rotaFinalizadaAgora && (
            <div className="flex items-start gap-3 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0 text-emerald-700"
              />

              <div>
                <p className="text-[10px] font-black text-emerald-800">
                  Rota finalizada
                </p>
                <p className="mt-1 text-[9px] leading-4 text-emerald-700/80">
                  Agora falta somente conferir o saldo físico e finalizar a carga.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <ChecklistCard
              label="Rota"
              valor={
                rotaAtiva
                  ? "Pendente"
                  : rotaFinalizadaDaCarga
                    ? "Finalizada"
                    : "Não iniciada"
              }
              ok={
                !rotaAtiva &&
                !!rotaFinalizadaDaCarga
              }
              icon={
                <Truck
                  size={14}
                />
              }
            />

            <ChecklistCard
              label="Em posse"
              valor={
                String(
                  totalSaldo,
                )
              }
              ok
              icon={
                <PackageCheck
                  size={14}
                />
              }
            />

            <ChecklistCard
              label={
                modoVolume
                  ? "Volumes"
                  : "Controle"
              }
              valor={
                modoVolume
                  ? `${volumesEmPosse}/${totalSaldo}`
                  : "Qtd."
              }
              ok={
                !modoVolume ||
                (
                  !erroConferenciaVolume &&
                  volumesEmPosse ===
                    totalSaldo
                )
              }
              icon={
                modoVolume
                  ? <Barcode size={14} />
                  : <Boxes size={14} />
              }
            />
          </div>

          {exigeBipagemCarga && (
            <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_28px_rgba(17,63,33,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Conferência de recebimento
                  </p>
                  <p className="mt-1 text-[11px] font-black">
                    {volumesConfirmados}/{volumesEsperados} volumes confirmados
                  </p>
                </div>

                <span className={`rounded-full px-3 py-1.5 text-[8px] font-black uppercase ${
                  volumesEsperados > 0 &&
                  volumesConfirmados >= volumesEsperados
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {volumesEsperados > 0 &&
                  volumesConfirmados >= volumesEsperados
                    ? "Conferida"
                    : "Pendente"}
                </span>
              </div>
            </div>
          )}

          {!liberado ? (
            <div className="overflow-hidden rounded-[22px] border border-amber-200 bg-[#fffaf0]">

              <div className="flex items-start gap-3 border-b border-amber-100 px-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-amber-100 text-amber-700">
                  <AlertTriangle
                    size={18}
                  />
                </div>

                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.15em] text-amber-700">
                    Antes de fechar
                  </p>
                  <h2 className="mt-1 text-[15px] font-black">
                    {bloqueios.length === 1
                      ? "1 pendência encontrada"
                      : `${bloqueios.length} pendências encontradas`}
                  </h2>
                  <p className="mt-1 text-[8px] leading-4 text-slate-500">
                    Resolva os itens abaixo. Nenhum fechamento será gravado antes disso.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-amber-100">
                {bloqueios.map(
                  (bloqueio) => (
                    <div
                      key={
                        bloqueio.id
                      }
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black">
                          {bloqueio.titulo}
                        </p>
                        <p className="mt-1 text-[8px] leading-4 text-slate-400">
                          {bloqueio.detalhe}
                        </p>
                      </div>

                      <Link
                        href={
                          bloqueio.href
                        }
                        className="flex h-[38px] shrink-0 items-center justify-center rounded-[12px] bg-[#176f3c] px-3 text-[8px] font-black text-white"
                      >
                        {bloqueio.acao}
                      </Link>
                    </div>
                  ),
                )}
              </div>

            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3">
                <ShieldCheck
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-700"
                />

                <div>
                  <p className="text-[10px] font-black text-emerald-800">
                    Carga liberada para fechamento
                  </p>
                  <p className="mt-1 text-[9px] leading-4 text-emerald-700/80">
                    Esta tela prepara uma devolução, não um recebimento do CD. O saldo continua no estoque móvel até a confirmação final. Só informe avaria quando houver dano real.
                  </p>
                </div>
              </div>

              <FecharCargaForm
                key={carga.id}
                cargaId={
                  carga.id
                }
                cargaCodigo={carga.codigo}
                itens={
                  itens
                }
                modoVolume={
                  modoVolume
                }
                volumesEmPosse={
                  volumesEmPosseDetalhes
                }
              />
            </>
          )}

        </section>

      </div>

    </main>
  );
}

function ChecklistCard({
  label,
  valor,
  ok,
  icon,
}: {
  label: string;
  valor: string;
  ok: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className={`rounded-[16px] border px-3 py-3 ${
      ok
        ? "border-emerald-100 bg-emerald-50"
        : "border-amber-200 bg-amber-50"
    }`}>
      <div className={`flex items-center gap-1.5 ${
        ok
          ? "text-emerald-700"
          : "text-amber-700"
      }`}>
        {icon}
        <p className="truncate text-[7px] font-black uppercase tracking-[0.1em]">
          {label}
        </p>
      </div>
      <p className="mt-2 truncate text-[12px] font-black">
        {valor}
      </p>
    </div>
  );
}