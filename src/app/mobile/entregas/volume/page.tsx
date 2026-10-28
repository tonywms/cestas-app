export const instant = false;

import {
  ArrowLeft,
  Barcode,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";

import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  getCurrentUserProfile,
} from "@/lib/auth/get-current-user";

import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";

import {
  createClient,
} from "@/lib/supabase/server";

import EntregaVolumeForm from "./EntregaVolumeForm";

type PageProps = {
  searchParams: Promise<{
    rotaClienteId?: string;
    clienteId?: string;
  }>;
};

function montarEndereco({
  logradouro,
  numero,
  bairro,
}: {
  logradouro:
    string | null;
  numero:
    string | null;
  bairro:
    string | null;
}) {
  const parte1 =
    [
      logradouro,
      numero,
    ]
      .filter(Boolean)
      .join(", ");

  const parte2 =
    bairro
      ? ` - ${bairro}`
      : "";

  return (
    `${parte1}${parte2}` ||
    "Endereço não informado"
  );
}

export default async function EntregaVolumePage({
  searchParams,
}: PageProps) {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const podeEntregar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ENTREGA_REALIZAR,
    );

  if (!podeEntregar) {
    redirect(
      "/mobile/sem-acesso",
    );
  }

  if (
    String(
      usuario.configuracao
        .modoControleCarga,
    ) !== "VOLUME"
  ) {
    redirect(
      "/mobile/entregas/nova",
    );
  }

  if (
    usuario.configuracao
      .exigirBipagemEntrega &&
    !usuario.isPlatformAdmin &&
    !temPermissao(
      usuario.permissoes,
      PERMISSOES.ENTREGA_BIPAR_VOLUME,
    )
  ) {
    redirect(
      "/mobile/sem-acesso",
    );
  }

  const params =
    await searchParams;

  const rotaClienteIdInformado =
    params.rotaClienteId
      ? Number(
          params.rotaClienteId,
        )
      : null;

  const clienteIdInformado =
    params.clienteId
      ? Number(
          params.clienteId,
        )
      : null;

  const supabase =
    await createClient();

  const {
    data: carga,
    error: cargaError,
  } =
    await supabase
      .from("cargas")
      .select(`
        id,
        codigo,
        status,
        recebida_at
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "entregador_id",
        usuario.id,
      )
      .in(
        "status",
        [
          "ABERTA",
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

  if (
    cargaError ||
    !carga
  ) {
    return (
      <main className="min-h-dvh bg-[#eaf2ec] text-[#142018]">
        <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7] p-5">
          <EstadoVazio
            titulo="Nenhuma carga ativa"
            texto="Você precisa possuir uma carga ativa para realizar uma entrega."
          />
        </div>
      </main>
    );
  }

  if (
    usuario.configuracao
      .exigirBipagemCarga &&
    !carga.recebida_at
  ) {
    return (
      <main className="min-h-dvh bg-[#eaf2ec] text-[#142018]">
        <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7] p-5">
          <EstadoVazio
            titulo="Receba a carga primeiro"
            texto="A conferência física da carga ainda não foi concluída."
            href="/mobile/carga/receber"
            botao="Receber carga"
          />
        </div>
      </main>
    );
  }

  let rotaClienteId:
    number | null = null;

  let clienteSelecionadoId:
    number | null =
      clienteIdInformado &&
      Number.isInteger(
        clienteIdInformado,
      ) &&
      clienteIdInformado > 0
        ? clienteIdInformado
        : null;

  let enderecoPlanejado:
    string | null = null;

  if (
    rotaClienteIdInformado &&
    Number.isInteger(
      rotaClienteIdInformado,
    ) &&
    rotaClienteIdInformado >
      0
  ) {
    const {
      data: parada,
      error: paradaError,
    } =
      await supabase
        .from(
          "rota_clientes",
        )
        .select(`
          id,
          rota_id,
          cliente_id,
          status,
          endereco_logradouro,
          endereco_numero,
          endereco_bairro
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
      paradaError ||
      !parada
    ) {
      redirect(
        "/mobile/rota",
      );
    }

    const {
      data: rota,
    } =
      await supabase
        .from("rotas")
        .select(`
          id,
          entregador_id,
          status
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "id",
          parada.rota_id,
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

    if (!rota) {
      redirect(
        "/mobile/rota",
      );
    }

    if (
      parada.status ===
      "ENTREGUE"
    ) {
      redirect(
        "/mobile/rota",
      );
    }

    rotaClienteId =
      parada.id;

    clienteSelecionadoId =
      parada.cliente_id;

    enderecoPlanejado =
      montarEndereco({
        logradouro:
          parada.endereco_logradouro,
        numero:
          parada.endereco_numero,
        bairro:
          parada.endereco_bairro,
      });
  }

  const [
    clientesResult,
    itensResult,
    tiposResult,
    volumesResult,
  ] =
    await Promise.all([
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
        ),

      supabase
        .from(
          "carga_itens",
        )
        .select(`
          id,
          tipo_cesta_id,
          quantidade_carregada,
          quantidade_entregue,
          quantidade_retornada,
          quantidade_avariada
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "carga_id",
          carga.id,
        ),

      supabase
        .from("tipos_cesta")
        .select(`
          id,
          codigo,
          nome
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        ),

      supabase
        .from(
          "cesta_volumes",
        )
        .select(`
          id,
          tipo_cesta_id
        `)
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
        ),
    ]);

  if (itensResult.error) {
    console.error(
      "Erro ao consultar itens da carga:",
      itensResult.error,
    );
  }

  if (tiposResult.error) {
    console.error(
      "Erro ao consultar tipos de cesta:",
      tiposResult.error,
    );
  }

  if (volumesResult.error) {
    console.error(
      "Erro ao consultar volumes da carga:",
      volumesResult.error,
    );
  }

  const clientes =
    (
      clientesResult.data ??
      []
    ).map(
      (
        cliente,
      ) => ({
        id:
          Number(
            cliente.id,
          ),

        codigo:
          String(
            cliente.codigo ??
            "",
          ),

        nome:
          String(
            cliente.nome ??
            "",
          ),

        endereco:
          montarEndereco({
            logradouro:
              cliente.logradouro,
            numero:
              cliente.numero,
            bairro:
              cliente.bairro,
          }),
      }),
    );

  const tiposPorId =
    new Map<
      number,
      {
        id: number;
        codigo: string;
        nome: string;
      }
    >();

  for (
    const tipo of
      tiposResult.data ??
      []
  ) {
    tiposPorId.set(
      Number(
        tipo.id,
      ),
      {
        id:
          Number(
            tipo.id,
          ),

        codigo:
          String(
            tipo.codigo ??
            "",
          ),

        nome:
          String(
            tipo.nome ??
            "",
          ),
      },
    );
  }

  const volumesPorTipo =
    new Map<
      number,
      number
    >();

  for (
    const volume of
      volumesResult.data ??
      []
  ) {
    const tipoCestaId =
      Number(
        volume.tipo_cesta_id,
      );

    volumesPorTipo.set(
      tipoCestaId,
      (
        volumesPorTipo.get(
          tipoCestaId,
        ) ?? 0
      ) + 1,
    );
  }

  const tipos =
    (
      itensResult.data ??
      []
    )
      .flatMap(
        (
          item,
        ) => {
          const tipoCestaId =
            Number(
              item.tipo_cesta_id,
            );

          const tipo =
            tiposPorId.get(
              tipoCestaId,
            );

          if (!tipo) {
            return [];
          }

          const carregada =
            Number(
              item.quantidade_carregada ??
              0,
            );

          const entregue =
            Number(
              item.quantidade_entregue ??
              0,
            );

          const retornada =
            Number(
              item.quantidade_retornada ??
              0,
            );

          const avariada =
            Number(
              item.quantidade_avariada ??
              0,
            );

          const saldo =
            Math.max(
              0,
              carregada -
                entregue -
                retornada -
                avariada,
            );

          if (saldo <= 0) {
            return [];
          }

          return [
            {
              id:
                tipo.id,

              codigo:
                tipo.codigo,

              nome:
                tipo.nome,

              saldo,

              volumesDisponiveis:
                volumesPorTipo.get(
                  tipoCestaId,
                ) ?? 0,
            },
          ];
        },
      );

  const clienteSelecionado =
    clienteSelecionadoId
      ? clientes.find(
          (
            cliente,
          ) =>
            cliente.id ===
            clienteSelecionadoId,
        ) ??
        null
      : null;

  const clienteFinal =
    clienteSelecionado
      ? {
          ...clienteSelecionado,
          endereco:
            enderecoPlanejado ??
            clienteSelecionado.endereco,
        }
      : null;

  return (
    <main className="min-h-dvh bg-[#eaf2ec] text-[#142018]">

      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7] pb-12">

        <header className="relative overflow-hidden bg-[linear-gradient(155deg,#176b3a,#0d5a30)] px-5 pb-8 pt-5 text-white">

          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full border-[28px] border-white/[0.04]" />

          <div className="relative z-10 flex items-center justify-between">

            <Link
              href={
                rotaClienteId
                  ? "/mobile/rota"
                  : clienteIdInformado
                    ? "/mobile/clientes"
                    : "/mobile/carga"
              }
              className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/10"
            >
              <ArrowLeft
                size={19}
              />
            </Link>

            <div className="text-center">

              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
                Operação
              </p>

              <h1 className="mt-1 text-lg font-black">
                Entrega
              </h1>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/10">
              <Barcode
                size={18}
              />
            </div>

          </div>

          <div className="relative z-10 mt-6">

            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.17em] text-[#a8d8b7]">
              <ShieldCheck
                size={14}
              />
              Rastreabilidade por volume
            </div>

            <h2 className="mt-2 text-[28px] font-black tracking-[-0.05em]">
              Bipe e entregue
              <span className="text-[#f4b13f]">
                .
              </span>
            </h2>

            <p className="mt-2 text-[11px] leading-5 text-white/65">
              {usuario.configuracao
                .exigirBipagemEntrega
                ? "Somente volumes físicos vinculados à sua carga podem ser entregues."
                : "A empresa controla volumes, mas a bipagem na entrega está desativada."}
            </p>

          </div>

        </header>

        <section className="px-5 py-6">

          {tipos.length ===
          0 ? (
            <EstadoVazio
              titulo="Sem saldo disponível"
              texto="Sua carga não possui mais cestas disponíveis para entrega."
            />
          ) : (
            <EntregaVolumeForm
              cargaId={
                carga.id
              }
              cargaCodigo={
                carga.codigo
              }
              clientes={
                clientes
              }
              clienteSelecionado={
                clienteFinal
              }
              rotaClienteId={
                rotaClienteId
              }
              tipos={
                tipos
              }
              exigirBipagem={
                usuario.configuracao
                  .exigirBipagemEntrega
              }
            />
          )}

        </section>

      </div>

    </main>
  );
}

function EstadoVazio({
  titulo,
  texto,
  href = "/mobile/carga",
  botao = "Voltar",
}: {
  titulo: string;
  texto: string;
  href?: string;
  botao?: string;
}) {
  return (
    <section className="rounded-[28px] border border-black/[0.04] bg-white p-7 text-center shadow-[0_18px_45px_rgba(17,63,33,0.07)]">

      <PackageCheck
        size={34}
        className="mx-auto text-emerald-700"
      />

      <h2 className="mt-5 text-[20px] font-black">
        {titulo}
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-slate-400">
        {texto}
      </p>

      <Link
        href={href}
        className="mt-6 flex h-[50px] items-center justify-center rounded-[16px] bg-[#176f3c] text-[10px] font-black text-white"
      >
        {botao}
      </Link>

    </section>
  );
}