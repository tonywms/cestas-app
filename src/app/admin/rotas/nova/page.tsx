export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  MapPinned,
  ShieldCheck,
} from "lucide-react";

import {
  Hero,
  Kpi,
  KpiGrid,
  ModuleHeader,
} from "@/components/admin/PremiumModuleUi";

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

import NovaRotaForm from "./NovaRotaForm";

function dataFortaleza() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Fortaleza",
      year:
        "numeric",
      month:
        "2-digit",
      day:
        "2-digit",
    },
  ).format(
    new Date(),
  );
}

export default async function NovaRotaPage() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const podeGerenciar =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo ===
      "ADMINISTRADOR" ||
    usuario.perfilCodigo ===
      "GESTOR" ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ROTA_GERENCIAR,
    );

  if (!podeGerenciar) {
    redirect("/admin");
  }

  const supabase =
    await createClient();

  const [
    entregadoresResult,
    clientesResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "empresa_usuarios",
        )
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
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "ativo",
          true,
        )
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
          "ativo",
          true,
        )
        .order(
          "nome",
        ),
    ]);

  if (
    entregadoresResult.error
  ) {
    console.error(
      "Erro ao carregar entregadores:",
      entregadoresResult.error,
    );
  }

  if (
    clientesResult.error
  ) {
    console.error(
      "Erro ao carregar clientes:",
      clientesResult.error,
    );
  }

  const entregadores =
    (
      entregadoresResult.data ??
      []
    )
      .map(
        (
          item,
        ) => {
          const raw =
            item.usuarios;

          const colaborador =
            Array.isArray(
              raw,
            )
              ? raw[0]
              : raw;

          if (
            !colaborador
          ) {
            return null;
          }

          return {
            id:
              String(
                colaborador.id,
              ),
            nome:
              String(
                colaborador.nome,
              ),
            email:
              colaborador.email
                ? String(
                    colaborador.email,
                  )
                : null,
          };
        },
      )
      .filter(
        (
          item,
        ): item is {
          id: string;
          nome: string;
          email: string | null;
        } =>
          item !==
          null,
      );

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
            cliente.codigo,
          ),
        nome:
          String(
            cliente.nome,
          ),
        telefone:
          cliente.telefone
            ? String(
                cliente.telefone,
              )
            : null,
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
      }),
    );

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[1180px]">
        <ModuleHeader
          eyebrow="Logística"
          title="Nova rota"
          actions={
            <Link
              href="/admin/rotas"
              className="flex items-center gap-2 rounded-[14px] border border-emerald-100 bg-white px-4 py-3 text-[12px] font-extrabold text-emerald-800"
            >
              <ArrowLeft
                size={16}
              />
              Voltar
            </Link>
          }
        />

        <Hero
          eyebrow="Planejamento operacional"
          title="Monte a rota do entregador."
          description="Escolha o responsável, selecione os clientes e defina a ordem exata de atendimento. O endereço de cada parada ficará congelado no momento da criação."
        >
          <KpiGrid>
            <Kpi
              label="Entregadores"
              value={
                entregadores.length
              }
            />

            <Kpi
              label="Clientes disponíveis"
              value={
                clientes.length
              }
              highlight={
                clientes.length >
                0
              }
            />

            <Kpi
              label="Data inicial"
              value={
                new Intl.DateTimeFormat(
                  "pt-BR",
                  {
                    timeZone:
                      "America/Fortaleza",
                  },
                ).format(
                  new Date(
                    `${dataFortaleza()}T12:00:00`,
                  ),
                )
              }
            />

            <Kpi
              label="Rastreabilidade"
              value="Endereço congelado"
            />
          </KpiGrid>
        </Hero>

        <div className="mt-6 flex items-start gap-3 rounded-[22px] border border-emerald-100 bg-white/80 p-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700">
            <ShieldCheck
              size={20}
            />
          </div>

          <div>
            <p className="text-[13px] font-extrabold">
              Planejamento preservado
            </p>

            <p className="mt-1 text-[12px] leading-5 text-slate-500">
              Se o endereço do cliente mudar amanhã, a rota já criada continuará mostrando o endereço utilizado no planejamento original.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <NovaRotaForm
            entregadores={
              entregadores
            }
            clientes={
              clientes
            }
            dataInicial={
              dataFortaleza()
            }
          />
        </div>
      </div>
    </main>
  );
}
