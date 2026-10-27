export const instant = false;

import {
  ArrowLeft,
  CircleAlert,
  Route,
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

import OcorrenciaForm from "./OcorrenciaForm";

type PageProps = {
  searchParams:
    Promise<{
      rotaClienteId?: string;
    }>;
};

export default async function NovaOcorrenciaPage({
  searchParams,
}: PageProps) {
  const usuario =
    await requirePermission(
      PERMISSOES.OCORRENCIA_REGISTRAR,
    );

  if (
    !usuario.configuracao
      .permitirOcorrenciaMobile
  ) {
    redirect(
      "/mobile/sem-acesso",
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

  if (
    !rotaClienteId ||
    !Number.isInteger(
      rotaClienteId,
    ) ||
    rotaClienteId <= 0
  ) {
    redirect(
      "/mobile/rota",
    );
  }

  const supabase =
    await createClient();

  const {
    data: parada,
    error: paradaError,
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
      rotaClienteId,
    )
    .maybeSingle();

  if (
    paradaError ||
    !parada ||
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

  const [
    rotaResult,
    clienteResult,
  ] = await Promise.all([
    supabase
      .from("rotas")
      .select(`
        id,
        codigo,
        status,
        entregador_id
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
      .maybeSingle(),

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
        "id",
        parada.cliente_id,
      )
      .eq(
        "ativo",
        true,
      )
      .maybeSingle(),
  ]);

  if (
    rotaResult.error ||
    !rotaResult.data ||
    clienteResult.error ||
    !clienteResult.data
  ) {
    redirect(
      "/mobile/rota",
    );
  }

  const rota =
    rotaResult.data;

  const cliente =
    clienteResult.data;

  return (
    <main className="app-premium min-h-dvh text-[#142018]">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] overflow-hidden bg-[#f7faf7]/90 shadow-[0_0_70px_rgba(17,63,33,0.14)]">
        <header className="hero-premium grain relative overflow-hidden px-5 pb-8 pt-5 text-white">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full border-[30px] border-white/[0.04]" />

          <div className="animate-orb pointer-events-none absolute right-10 top-20 h-32 w-32 rounded-full bg-[#f4b13f]/[0.16] blur-3xl" />

          <div className="relative z-10 flex items-center justify-between">
            <Link
              href="/mobile/rota"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/10 backdrop-blur-xl transition active:scale-95"
            >
              <ArrowLeft
                size={19}
              />
            </Link>

            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a8d8b7]">
                Operação
              </p>

              <h1 className="mt-1 text-lg font-black tracking-[-0.03em]">
                Ocorrência
              </h1>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/10">
              <CircleAlert
                size={19}
              />
            </div>
          </div>

          <div className="relative z-10 mt-7">
            <div className="flex items-center gap-2">
              <Route
                size={14}
                className="text-[#f4b13f]"
              />

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#a8d8b7]">
                {rota.codigo}
              </p>
            </div>

            <h2 className="mt-3 text-[30px] font-black leading-none tracking-[-0.05em]">
              Registrar imprevisto
              <span className="text-gold">
                .
              </span>
            </h2>

            <p className="mt-3 max-w-[340px] text-[12px] leading-5 text-white/65">
              Parada #{parada.sequencia}. Informe o que impediu a entrega ao cliente.
            </p>
          </div>
        </header>

        <div className="space-y-4 px-5 pb-10 pt-6">
          <OcorrenciaForm
            rotaClienteId={
              parada.id
            }
            cliente={
              cliente
            }
          />
        </div>
      </div>
    </main>
  );
}
