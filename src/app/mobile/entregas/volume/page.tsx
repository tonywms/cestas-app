export const instant = false;

import {
  ArrowLeft,
  Barcode,
  CircleAlert,
  PackageCheck,
  ShieldCheck,
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

import EntregaVolumeForm from "./EntregaVolumeForm";

type PageProps = {
  searchParams:
    Promise<{
      rotaClienteId?: string;
    }>;
};

function enderecoTexto(
  dados: {
    logradouro?: string | null;
    numero?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    uf?: string | null;
  },
) {
  const partes = [
    dados.logradouro &&
    dados.numero
      ? `${dados.logradouro}, ${dados.numero}`
      : dados.logradouro,
    dados.bairro,
    dados.cidade && dados.uf
      ? `${dados.cidade} - ${dados.uf}`
      : dados.cidade ?? dados.uf,
  ].filter(Boolean);

  return partes.join(" • ") ||
    "Endereço não informado";
}

export default async function EntregaVolumePage({
  searchParams,
}: PageProps) {
  const usuario =
    await requirePermission(
      PERMISSOES.ENTREGA_REALIZAR,
    );

  if (
    usuario.configuracao
      .modoControleCarga !==
    "VOLUME"
  ) {
    redirect(
      "/mobile/entregas/nova",
    );
  }

  const params =
    await searchParams;

  const rotaClienteId =
    params.rotaClienteId
      ? Number(
          params.rotaClienteId,
        )
      : null;

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

  const supabase =
    await createClient();

  const {
    data: cargaBanco,
  } = await supabase
    .from("cargas")
    .select(`
      id,
      recebida_at
    `)
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "id",
      carga.id,
    )
    .maybeSingle();

  if (
    usuario.configuracao
      .exigirBipagemCarga &&
    !cargaBanco?.recebida_at
  ) {
    return (
      <main className="min-h-dvh bg-[#eaf2ec] px-4 py-6 text-[#142018]">
        <div className="mx-auto max-w-[480px] rounded-[30px] border border-amber-200 bg-white p-7 shadow-[0_24px_60px_-30px_rgba(120,80,20,0.2)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-amber-100 text-amber-700">
            <CircleAlert size={25} />
          </div>
          <h1 className="mt-5 text-[21px] font-black">
            Receba a carga primeiro
          </h1>
          <p className="mt-3 text-[11px] leading-6 text-slate-500">
            Esta empresa exige a bipagem de todos os volumes antes da primeira entrega.
          </p>
          <Link
            href="/mobile/carga/receber"
            className="mt-6 flex h-[50px] items-center justify-center gap-2 rounded-[16px] bg-[#176f3c] text-[10px] font-black text-white"
          >
            <Barcode size={16} />
            Bipar volumes da carga
          </Link>
        </div>
      </main>
    );
  }

  let clienteSelecionado:
    {
      id: number;
      codigo: string;
      nome: string;
      endereco: string;
    } | null = null;

  let rotaClienteValido:
    number | null = null;

  if (
    rotaClienteId &&
    Number.isInteger(
      rotaClienteId,
    ) &&
    rotaClienteId > 0
  ) {
    const {
      data: parada,
    } = await supabase
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
        endereco_bairro,
        endereco_cidade,
        endereco_uf
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "id",
        rotaClienteId,
      )
      .maybeSingle();

    if (!parada) {
      redirect(
        "/mobile/rota",
      );
    }

    const {
      data: rota,
    } = await supabase
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

    if (
      !rota ||
      ![
        "PENDENTE",
        "EM_ATENDIMENTO",
      ].includes(
        parada.status,
      )
    ) {
      redirect(
        "/mobile/rota",
      );
    }

    const {
      data: cliente,
    } = await supabase
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
        parada.cliente_id,
      )
      .maybeSingle();

    if (!cliente) {
      redirect(
        "/mobile/rota",
      );
    }

    clienteSelecionado = {
      id: cliente.id,
      codigo:
        cliente.codigo,
      nome:
        cliente.nome,
      endereco:
        enderecoTexto({
          logradouro:
            parada.endereco_logradouro,
          numero:
            parada.endereco_numero,
          bairro:
            parada.endereco_bairro,
          cidade:
            parada.endereco_cidade,
          uf:
            parada.endereco_uf,
        }),
    };

    rotaClienteValido =
      parada.id;
  }

  const [
    clientesResult,
    volumesResult,
  ] = await Promise.all([
    supabase
      .from("clientes")
      .select(`
        id,
        codigo,
        nome,
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
      ),

    supabase
      .from(
        "cesta_volumes",
      )
      .select(`
        codigo_volume,
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

  const clientes =
    (clientesResult.data ?? [])
      .map(
        (cliente) => ({
          id: cliente.id,
          codigo:
            cliente.codigo,
          nome:
            cliente.nome,
          endereco:
            enderecoTexto({
              logradouro:
                cliente.logradouro,
              numero:
                cliente.numero,
              bairro:
                cliente.bairro,
              cidade:
                cliente.cidade,
              uf:
                cliente.uf,
            }),
        }),
      );

  const itens =
    carga.carga_itens
      .filter(
        (item) =>
          item.tipos_cesta,
      )
      .map(
        (item) => ({
          tipoCestaId:
            item.tipos_cesta!.id,
          nome:
            item.tipos_cesta!.nome,
          codigo:
            item.tipos_cesta!.codigo,
          saldo:
            Math.max(
              0,
              item.quantidade_carregada -
                item.quantidade_entregue -
                item.quantidade_retornada -
                item.quantidade_avariada,
            ),
        }),
      )
      .filter(
        (item) =>
          item.saldo > 0,
      );

  const volumes =
    (volumesResult.data ?? [])
      .map(
        (item) => ({
          codigo:
            item.codigo_volume,
          tipoCestaId:
            item.tipo_cesta_id,
        }),
      );

  return (
    <main className="min-h-dvh bg-[#eaf2ec] text-[#142018]">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7] pb-10">

        <header className="relative overflow-hidden bg-[linear-gradient(155deg,#176b3a,#0d5a30)] px-5 pb-8 pt-5 text-white">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full border-[28px] border-white/[0.04]" />

          <div className="relative z-10 flex items-center justify-between">
            <Link
              href={
                rotaClienteValido
                  ? "/mobile/rota"
                  : "/mobile/carga"
              }
              className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/10"
            >
              <ArrowLeft size={19} />
            </Link>

            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
                Operação
              </p>
              <h1 className="mt-1 text-lg font-black">
                Entrega rastreada
              </h1>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/10">
              <PackageCheck size={18} />
            </div>
          </div>

          <div className="relative z-10 mt-7">
            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.17em] text-[#a8d8b7]">
              <Barcode size={14} />
              {carga.codigo}
            </div>

            <h2 className="mt-2 text-[29px] font-black tracking-[-0.05em]">
              Entregar com segurança
              <span className="text-[#f4b13f]">.</span>
            </h2>

            <p className="mt-3 max-w-[350px] text-[11px] leading-5 text-white/65">
              {usuario.configuracao.exigirBipagemEntrega
                ? "Bipe os volumes físicos que serão entregues ao cliente."
                : "A empresa controla volumes individuais, mas não exige bipagem nesta etapa."}
            </p>
          </div>
        </header>

        <section className="px-5 py-6">
          <div className="mb-4 flex items-start gap-3 rounded-[19px] border border-emerald-100 bg-emerald-50 p-4">
            <ShieldCheck
              size={18}
              className="mt-0.5 shrink-0 text-emerald-700"
            />
            <p className="text-[9px] leading-5 text-emerald-800">
              O volume só pode ser entregue se pertencer à carga deste usuário, à empresa atual e estiver disponível no estoque móvel.
            </p>
          </div>

          <EntregaVolumeForm
            cargaId={carga.id}
            cargaCodigo={carga.codigo}
            clientes={clientes}
            itens={itens}
            volumes={volumes}
            exigirBipagem={
              usuario.configuracao
                .exigirBipagemEntrega
            }
            rotaClienteId={
              rotaClienteValido
            }
            clienteSelecionado={
              clienteSelecionado
            }
          />
        </section>
      </div>
    </main>
  );
}
