export const instant = false;

import {
  ArrowLeft,
  Building2,
  KeyRound,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

import PermissoesEntregadorForm, {
  type PermissaoTela,
} from "./PermissoesEntregadorForm";

const PERMISSOES_PROIBIDAS_ENTREGADOR =
  new Set<string>([
    PERMISSOES.EMPRESA_CONFIGURAR,
    PERMISSOES.PERMISSOES_GERENCIAR,
    PERMISSOES.USUARIOS_GERENCIAR,
  ]);

export default async function PermissoesPage() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const podeGerenciar =
    usuario.isPlatformAdmin ||
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
    data: perfilEntregador,
    error: perfilError,
  } = await supabase
    .from("perfis")
    .select(`
      id,
      codigo,
      nome
    `)
    .eq("codigo", "ENTREGADOR")
    .eq("ativo", true)
    .maybeSingle();

  if (
    perfilError ||
    !perfilEntregador
  ) {
    throw new Error(
      "Perfil ENTREGADOR não encontrado.",
    );
  }

  const {
    data: catalogo,
    error: catalogoError,
  } = await supabase
    .from("permissoes")
    .select(`
      id,
      codigo,
      nome,
      modulo,
      descricao,
      sensivel,
      ativo
    `)
    .eq("ativo", true)
    .order("modulo")
    .order("nome");

  if (
    catalogoError ||
    !catalogo
  ) {
    throw new Error(
      "Não foi possível carregar as permissões.",
    );
  }

  const {
    data: configuradas,
    error: configuradasError,
  } = await supabase
    .from("perfil_permissoes")
    .select(`
      permissao_id,
      permitido
    `)
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "perfil_id",
      perfilEntregador.id,
    );

  if (configuradasError) {
    throw new Error(
      "Não foi possível carregar as permissões do perfil.",
    );
  }

  const estadoPorPermissao =
    new Map<string, boolean>();

  for (
    const item of
      configuradas ?? []
  ) {
    estadoPorPermissao.set(
      item.permissao_id,
      item.permitido,
    );
  }

  const permissoesTela:
    PermissaoTela[] =
    catalogo.map(
      (permissao) => {
        let bloqueado = false;
        let motivoBloqueio:
          string | null = null;

        if (
          PERMISSOES_PROIBIDAS_ENTREGADOR.has(
            permissao.codigo,
          )
        ) {
          bloqueado = true;
          motivoBloqueio =
            "Reservado aos perfis administrativos.";
        }

        if (
          usuario.configuracao
            .modoControleCarga !==
            "VOLUME" &&
          (
            permissao.codigo ===
              PERMISSOES.CARGA_BIPAR_VOLUME ||
            permissao.codigo ===
              PERMISSOES.ENTREGA_BIPAR_VOLUME
          )
        ) {
          bloqueado = true;
          motivoBloqueio =
            "Indisponível porque a empresa opera por QUANTIDADE.";
        }

        if (
          !usuario.configuracao
            .permitirPagamentoMobile &&
          permissao.codigo ===
            PERMISSOES.PAGAMENTO_REGISTRAR
        ) {
          bloqueado = true;
          motivoBloqueio =
            "Recebimentos mobile estão desativados nas configurações da empresa.";
        }

        if (
          !usuario.configuracao
            .permitirOcorrenciaMobile &&
          permissao.codigo ===
            PERMISSOES.OCORRENCIA_REGISTRAR
        ) {
          bloqueado = true;
          motivoBloqueio =
            "Ocorrências mobile estão desativadas nas configurações da empresa.";
        }

        const configurado =
          estadoPorPermissao.get(
            permissao.id,
          ) ?? false;

        return {
          id: permissao.id,
          codigo: permissao.codigo,
          nome: permissao.nome,
          modulo: permissao.modulo,
          descricao:
            permissao.descricao,
          sensivel:
            permissao.sensivel,

          permitido:
            configurado &&
            !bloqueado,

          bloqueado,
          motivoBloqueio,
        };
      },
    );

  const quantidadeLiberada =
    permissoesTela.filter(
      (item) => item.permitido,
    ).length;

  return (
    <main className="min-h-screen bg-[#f3f7f4] px-4 py-6 text-[#142019] md:px-6 md:py-8">
      <div className="mx-auto max-w-[1080px]">

        <div className="flex items-center justify-between gap-4 rounded-[26px] border border-black/[0.04] bg-white px-5 py-4 shadow-[0_12px_40px_rgba(17,63,33,0.05)]">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#edf7f0] text-[#14743d] transition hover:bg-[#dff1e5]"
            >
              <ArrowLeft size={19} />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#1b7b46]">
                Cestas APP
              </p>

              <h1 className="mt-0.5 text-base font-black tracking-[-0.025em]">
                Gestão de permissões
              </h1>
            </div>
          </div>

          <div className="hidden items-center gap-3 rounded-full bg-[#f2f8f4] px-4 py-2.5 md:flex">
            <Building2
              size={17}
              className="text-[#14743d]"
            />

            <div>
              <p className="max-w-[250px] truncate text-[11px] font-black">
                {
                  usuario.empresa
                    .nomeFantasia
                }
              </p>

              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {usuario.perfilNome}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#176f3c_0%,#0d5a30_100%)] p-6 text-white shadow-[0_22px_55px_rgba(17,86,46,0.17)] md:p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
                <KeyRound size={14} />

                Controle de acesso
              </div>

              <h2 className="mt-4 max-w-2xl text-[28px] font-black leading-[1.05] tracking-[-0.05em] md:text-[34px]">
                O entregador só faz
                o que você permitir.
              </h2>

              <p className="mt-3 max-w-2xl text-[12px] leading-6 text-white/65">
                Configure o perfil padrão
                dos colaboradores mobile da{" "}
                <strong>
                  {
                    usuario.empresa
                      .nomeFantasia
                  }
                </strong>
                .
              </p>
            </div>

            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-white/10 md:flex">
              <ShieldCheck size={27} />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <HeroTag
              titulo="Perfil"
              valor="ENTREGADOR"
            />

            <HeroTag
              titulo="Liberadas"
              valor={String(
                quantidadeLiberada,
              )}
            />

            <HeroTag
              titulo="Carga"
              valor={
                usuario.configuracao
                  .modoControleCarga
              }
            />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-4 rounded-[26px] border border-black/[0.04] bg-white p-5 shadow-[0_12px_35px_rgba(17,63,33,0.04)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-[17px] bg-[#eaf7ee] text-[#14743d]">
            <UserRound size={22} />
          </div>

          <div className="flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#18834a]">
              Perfil selecionado
            </p>

            <h3 className="mt-1 text-base font-black">
              Entregador
            </h3>

            <p className="mt-1 text-[10px] text-slate-400">
              Estas permissões serão o padrão para os
              entregadores vinculados a esta empresa.
            </p>
          </div>

          <div className="rounded-full bg-[#f0f8f3] px-4 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-[#187640]">
            {
              quantidadeLiberada
            }{" "}
            ativas
          </div>
        </div>

        <div className="mt-5">
          <PermissoesEntregadorForm
            empresaNome={
              usuario.empresa
                .nomeFantasia
            }
            modoControleCarga={
              usuario.configuracao
                .modoControleCarga
            }
            permissoes={
              permissoesTela
            }
          />
        </div>
      </div>
    </main>
  );
}

function HeroTag({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 backdrop-blur">
      <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/45">
        {titulo}
      </span>

      <span className="ml-2 text-[10px] font-black uppercase">
        {valor}
      </span>
    </div>
  );
}