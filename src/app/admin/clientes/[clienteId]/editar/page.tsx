export const instant = false;

import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import Link from "next/link";
import { redirect } from "next/navigation";

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

import EditarClienteForm from "./EditarClienteForm";

type PageProps = {
  params: Promise<{
    clienteId: string;
  }>;
};

export default async function EditarClientePage({
  params,
}: PageProps) {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const podeGerenciar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CLIENTES_GERENCIAR,
    );

  if (!podeGerenciar) {
    redirect(
      "/admin/clientes",
    );
  }

  const {
    clienteId:
      clienteIdTexto,
  } = await params;

  const clienteId =
    Number(
      clienteIdTexto,
    );

  if (
    !Number.isInteger(
      clienteId,
    ) ||
    clienteId <= 0
  ) {
    redirect(
      "/admin/clientes",
    );
  }

  const supabase =
    await createClient();

  const {
    data: cliente,
    error,
  } = await supabase
    .from("clientes")
    .select(`
      id,
      codigo,
      nome,
      cpf_cnpj,
      telefone,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      cep,
      ativo
    `)
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "id",
      clienteId,
    )
    .maybeSingle();

  if (
    error ||
    !cliente
  ) {
    redirect(
      "/admin/clientes",
    );
  }

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-6 md:py-8">

      <div className="mx-auto max-w-[980px]">

        <header className="glass flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">

          <div className="flex items-center gap-4">

            <Link
              href={`/admin/clientes/${cliente.id}`}
              className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-[#176f3c]"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#b07a12]">
                Clientes
              </p>

              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Editar cliente
              </h1>
            </div>

          </div>

          <span className="hidden rounded-full bg-emerald-50 px-4 py-2.5 text-[9px] font-black text-[#176f3c] md:block">
            {cliente.codigo}
          </span>

        </header>

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">

          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />

          <div className="relative z-10">

            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <MapPin size={15} />
              Cadastro e localização
            </div>

            <h2 className="mt-4 text-[31px] font-black tracking-[-0.055em]">
              {cliente.nome}
              <span className="text-[#f4b13f]">.</span>
            </h2>

            <p className="mt-3 max-w-2xl text-[11px] leading-6 text-white/65">
              Atualize os dados sem perder rastreabilidade. O sistema mantém as versões anteriores do endereço e protege as rotas já planejadas.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-[9px] font-black">
              <ShieldCheck size={14} />
              Histórico automático habilitado
            </div>

          </div>

        </section>

        <div className="mt-5">
          <EditarClienteForm
            cliente={cliente}
          />
        </div>

      </div>

    </main>
  );
}
