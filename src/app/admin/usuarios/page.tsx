export const instant = false;

import {
  ArrowLeft,
  ChevronRight,
  KeyRound,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

type UsuarioEmpresa = {
  usuario_id: string;
  ativo: boolean;

  usuarios:
    | {
        id: string;
        nome: string;
        email: string | null;
        telefone: string | null;
        ativo: boolean;
      }
    | {
        id: string;
        nome: string;
        email: string | null;
        telefone: string | null;
        ativo: boolean;
      }[];

  perfis:
    | {
        id: number;
        codigo: string;
        nome: string;
      }
    | {
        id: number;
        codigo: string;
        nome: string;
      }[];
};

function itemUnico<T>(
  valor: T | T[] | null,
): T | null {
  if (!valor) {
    return null;
  }

  if (Array.isArray(valor)) {
    return valor[0] ?? null;
  }

  return valor;
}

export default async function UsuariosPage() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const podeGerenciar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.USUARIOS_GERENCIAR,
    ) ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.PERMISSOES_GERENCIAR,
    );

  if (!podeGerenciar) {
    redirect("/admin");
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("empresa_usuarios")
    .select(`
      usuario_id,
      ativo,
      usuarios!inner (
        id,
        nome,
        email,
        telefone,
        ativo
      ),
      perfis!inner (
        id,
        codigo,
        nome
      )
    `)
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "ativo",
      true,
    );

  if (error) {
    console.error(
      "Erro ao carregar usuários:",
      error,
    );
  }

  const membros =
    ((data ?? []) as unknown as UsuarioEmpresa[])
      .map((item) => ({
        ...item,
        usuario:
          itemUnico(
            item.usuarios,
          ),
        perfil:
          itemUnico(
            item.perfis,
          ),
      }))
      .filter(
        (item) =>
          item.usuario &&
          item.perfil,
      )
      .sort((a, b) =>
        (a.usuario?.nome ?? "").localeCompare(
          b.usuario?.nome ?? "",
          "pt-BR",
        ),
      );

  const entregadores =
    membros.filter(
      (item) =>
        item.perfil?.codigo ===
        "ENTREGADOR",
    );

  return (
    <main className="min-h-screen bg-[#f3f7f4] px-4 py-6 text-[#142019] md:px-6 md:py-8">
      <div className="mx-auto max-w-[1080px]">

        <div className="flex items-center justify-between gap-4 rounded-[26px] border border-black/[0.04] bg-white px-5 py-4 shadow-[0_12px_40px_rgba(17,63,33,0.05)]">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#edf7f0] text-[#14743d]"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#1b7b46]">
                Cestas APP
              </p>

              <h1 className="mt-0.5 text-base font-black">
                Usuários e colaboradores
              </h1>
            </div>
          </div>
        </div>

        <section className="mt-5 rounded-[32px] bg-[linear-gradient(135deg,#176f3c,#0d5a30)] p-7 text-white shadow-[0_22px_55px_rgba(17,86,46,0.17)]">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
                <UsersRound size={14} />

                Gestão de equipe
              </div>

              <h2 className="mt-4 text-[30px] font-black leading-none tracking-[-0.05em]">
                Colaboradores da empresa.
              </h2>

              <p className="mt-3 text-[12px] text-white/65">
                Gerencie os acessos individuais dos
                entregadores de{" "}
                <strong>
                  {usuario.empresa.nomeFantasia}
                </strong>
                .
              </p>
            </div>

            <div className="hidden h-14 w-14 items-center justify-center rounded-[18px] bg-white/10 md:flex">
              <ShieldCheck size={27} />
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Tag
              titulo="Usuários"
              valor={String(
                membros.length,
              )}
            />

            <Tag
              titulo="Entregadores"
              valor={String(
                entregadores.length,
              )}
            />
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[28px] border border-black/[0.04] bg-white shadow-[0_16px_45px_rgba(17,63,33,0.05)]">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#18834a]">
              Colaboradores mobile
            </p>

            <h2 className="mt-1 text-lg font-black">
              Entregadores
            </h2>
          </div>

          {entregadores.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-emerald-50 text-emerald-700">
                <UserRound
                  size={25}
                />
              </div>

              <h3 className="mt-5 text-base font-black">
                Nenhum entregador cadastrado
              </h3>

              <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-400">
                A estrutura de permissões individuais
                já está pronta. Precisamos cadastrar o
                primeiro colaborador ENTREGADOR para
                configurar exceções individuais.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {entregadores.map(
                (item) => {
                  const colaborador =
                    item.usuario!;

                  return (
                    <Link
                      key={
                        item.usuario_id
                      }
                      href={`/admin/usuarios/${item.usuario_id}/permissoes`}
                      className="flex items-center gap-4 px-5 py-5 transition hover:bg-[#f8fcf9] md:px-6"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[17px] bg-[#eaf7ee] text-[#14743d]">
                        <UserRound
                          size={21}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-black">
                          {
                            colaborador.nome
                          }
                        </p>

                        <p className="mt-1 truncate text-[10px] text-slate-400">
                          {
                            colaborador.email ??
                            "Sem e-mail"
                          }
                        </p>
                      </div>

                      <div className="hidden rounded-full bg-[#eff8f2] px-3 py-1.5 text-[9px] font-black text-[#187640] sm:block">
                        ENTREGADOR
                      </div>

                      <div className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-slate-50 text-slate-400">
                        <ChevronRight
                          size={18}
                        />
                      </div>
                    </Link>
                  );
                },
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Tag({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-full border border-white/10 bg-white/[0.08] px-4 py-2">
      <span className="text-[8px] font-bold uppercase text-white/45">
        {titulo}
      </span>

      <span className="ml-2 text-[10px] font-black">
        {valor}
      </span>
    </div>
  );
}