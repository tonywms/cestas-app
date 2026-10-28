export const instant = false;

import {
  ArrowLeft,
  Edit3,
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

import EditarClienteMobileForm from "./EditarClienteMobileForm";

export default async function EditarClienteMobilePage({
  params,
}: {
  params:
    Promise<{
      clienteId:
        string;
    }>;
}) {
  const usuario =
    await getCurrentUserProfile();

  if (
    !usuario ||
    !usuario.ativo
  ) {
    redirect("/");
  }

  const permitido =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CLIENTE_MOBILE_EDITAR,
    );

  if (!permitido) {
    redirect(
      "/mobile/sem-acesso",
    );
  }

  const {
    clienteId:
      clienteIdTexto,
  } =
    await params;

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
      "/mobile/clientes",
    );
  }

  const supabase =
    await createClient();

  const {
    data: cliente,
  } =
    await supabase
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
        cep
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "id",
        clienteId,
      )
      .eq(
        "ativo",
        true,
      )
      .maybeSingle();

  if (!cliente) {
    redirect(
      "/mobile/clientes",
    );
  }

  return (
    <main className="app-premium min-h-dvh text-[#142018]">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7]/95 pb-10 shadow-[0_0_60px_rgba(17,63,33,0.12)]">
        <header className="hero-premium grain relative overflow-hidden px-5 pb-8 pt-5 text-white">
          <div className="relative z-10 flex items-center justify-between">
            <Link
              href="/mobile/clientes"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/10"
            >
              <ArrowLeft
                size={19}
              />
            </Link>

            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
                Cliente
              </p>

              <h1 className="mt-1 text-lg font-black">
                Editar cadastro
              </h1>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/10">
              <Edit3
                size={19}
              />
            </div>
          </div>

          <div className="relative z-10 mt-7">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#a8d8b7]">
              {
                cliente.codigo
              }
            </p>

            <h2 className="mt-2 text-[27px] font-black tracking-[-0.05em]">
              {
                cliente.nome
              }
            </h2>

            <p className="mt-3 text-[11px] leading-5 text-white/65">
              Corrija telefone ou endereço em campo. A alteração ficará disponível para a gestão imediatamente.
            </p>
          </div>
        </header>

        <section className="px-5 py-5">
          <EditarClienteMobileForm
            cliente={{
              id:
                Number(
                  cliente.id,
                ),
              codigo:
                String(
                  cliente.codigo,
                ),
              nome:
                String(
                  cliente.nome,
                ),
              cpf_cnpj:
                cliente.cpf_cnpj,
              telefone:
                cliente.telefone,
              logradouro:
                cliente.logradouro,
              numero:
                cliente.numero,
              complemento:
                cliente.complemento,
              bairro:
                cliente.bairro,
              cidade:
                cliente.cidade,
              uf:
                cliente.uf,
              cep:
                cliente.cep,
            }}
          />
        </section>
      </div>
    </main>
  );
}
