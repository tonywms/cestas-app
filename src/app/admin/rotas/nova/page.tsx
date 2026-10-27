export const instant = false;

import {
  ArrowLeft,
  MapPinned,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

import NovaRotaForm from "./NovaRotaForm";

function dataFortaleza() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "America/Fortaleza",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date());
}

export default async function NovaRotaPage() {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const podeGerenciar =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo === "ADMINISTRADOR" ||
    usuario.perfilCodigo === "GESTOR" ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ROTA_GERENCIAR,
    );

  if (!podeGerenciar) {
    redirect("/admin");
  }

  const supabase = await createClient();

  const [
    entregadoresResult,
    clientesResult,
  ] = await Promise.all([
    supabase
      .from("empresa_usuarios")
      .select(`
        usuario_id,
        usuarios!inner (
          id,
          nome,
          email
        ),
        perfis!inner (
          codigo
        )
      `)
      .eq("empresa_id", usuario.empresa.id)
      .eq("ativo", true)
      .eq(
        "perfis.codigo",
        "ENTREGADOR",
      ),

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
      .eq("empresa_id", usuario.empresa.id)
      .eq("ativo", true)
      .order("nome"),
  ]);

  if (entregadoresResult.error) {
    console.error(
      "Erro ao carregar entregadores:",
      entregadoresResult.error,
    );
  }

  if (clientesResult.error) {
    console.error(
      "Erro ao carregar clientes:",
      clientesResult.error,
    );
  }

  const entregadores = (
    entregadoresResult.data ?? []
  )
    .map((item) => {
      const raw = item.usuarios;

      const colaborador = Array.isArray(
        raw,
      )
        ? raw[0]
        : raw;

      if (!colaborador) {
        return null;
      }

      return {
        id: colaborador.id,
        nome: colaborador.nome,
        email: colaborador.email,
      };
    })
    .filter(
      (
        item,
      ): item is {
        id: string;
        nome: string;
        email: string | null;
      } => item !== null,
    );

  const clientes =
    clientesResult.data ?? [];

  return (
    <main className="min-h-screen bg-[#f3f7f4] px-4 py-6 text-[#142018] md:px-6 md:py-8">
      <div className="mx-auto max-w-[950px]">
        <header className="flex items-center justify-between gap-4 rounded-[26px] bg-white px-5 py-4 shadow-[0_12px_40px_rgba(17,63,33,0.05)]">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/rotas"
              className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700">
                Logística
              </p>

              <h1 className="mt-0.5 text-base font-black">
                Nova rota
              </h1>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-4 py-2.5 text-[9px] font-black text-emerald-700 md:flex">
            <ShieldCheck size={15} />
            {usuario.empresa.nomeFantasia}
          </div>
        </header>

        <section className="relative mt-5 overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#176f3c,#0d5a30)] p-7 text-white shadow-[0_20px_55px_rgba(17,86,46,0.14)] md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-white/[0.035]" />

          <MapPinned size={27} />

          <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
            Planejamento
          </p>

          <h2 className="mt-2 text-[30px] font-black tracking-[-0.05em]">
            Montar rota do entregador.
          </h2>

          <p className="mt-3 max-w-2xl text-xs leading-6 text-white/65">
            Escolha o colaborador e marque os clientes na ordem em que serão atendidos.
          </p>
        </section>

        <div className="mt-5">
          <NovaRotaForm
            entregadores={entregadores}
            clientes={clientes}
            dataInicial={dataFortaleza()}
          />
        </div>
      </div>
    </main>
  );
}
