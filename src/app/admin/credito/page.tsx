export const instant = false;

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
  avaliarCredito,
  dataLimiteAtraso,
  POLITICA_CREDITO_PADRAO,
  type PoliticaCredito,
} from "@/lib/credito/avaliar-credito";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  ApplyButton,
  Field,
  Hero,
  Kpi,
  KpiGrid,
  ModuleHeader,
  QuickLink,
  SmartFilters,
  dateTodayFortaleza,
  inputClass,
} from "@/components/admin/PremiumModuleUi";

import CreditoAdminClient from "./CreditoAdminClient";

type PageProps = {
  searchParams:
    Promise<{
      q?: string;
      situacao?: string;
      cliente?: string;
    }>;
};

export default async function CreditoPage({
  searchParams,
}: PageProps) {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const filtros =
    await searchParams;

  const supabase =
    await createClient();

  const [
    configResult,
    clientesResult,
    parcelasResult,
    liberacoesResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "empresa_configuracoes",
        )
        .select(`
          credito_alerta_qtd_atrasos,
          credito_bloqueio_qtd_atrasos,
          credito_dias_tolerancia,
          credito_permitir_excecao,
          credito_validade_excecao_dias
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .maybeSingle(),

      supabase
        .from("clientes")
        .select(`
          id,
          codigo,
          nome,
          ativo
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
        .from("parcelas")
        .select(`
          cliente_id,
          vencimento,
          valor,
          valor_pago,
          status
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .in(
          "status",
          [
            "ABERTA",
            "PARCIAL",
          ],
        ),

      supabase
        .from(
          "credito_liberacoes",
        )
        .select(`
          id,
          cliente_id,
          motivo,
          valido_ate,
          status,
          created_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "status",
          "ATIVA",
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        ),
    ]);

  const config =
    configResult.data;

  const politica:
    PoliticaCredito = {
      alertaQtdAtrasos:
        config
          ?.credito_alerta_qtd_atrasos ??
        POLITICA_CREDITO_PADRAO
          .alertaQtdAtrasos,

      bloqueioQtdAtrasos:
        config
          ?.credito_bloqueio_qtd_atrasos ??
        POLITICA_CREDITO_PADRAO
          .bloqueioQtdAtrasos,

      diasTolerancia:
        config
          ?.credito_dias_tolerancia ??
        POLITICA_CREDITO_PADRAO
          .diasTolerancia,

      permitirExcecao:
        config
          ?.credito_permitir_excecao ??
        POLITICA_CREDITO_PADRAO
          .permitirExcecao,

      validadeExcecaoDias:
        config
          ?.credito_validade_excecao_dias ??
        POLITICA_CREDITO_PADRAO
          .validadeExcecaoDias,
    };

  const hoje =
    dateTodayFortaleza();

  const limiteAtraso =
    dataLimiteAtraso(
      hoje,
      politica.diasTolerancia,
    );

  const agora =
    new Date();

  const liberacaoPorCliente =
    new Map<
      number,
      {
        id: number;
        motivo: string;
        validoAte: string;
      }
    >();

  for (
    const item of
      liberacoesResult.data ??
      []
  ) {
    const clienteId =
      Number(
        item.cliente_id,
      );

    if (
      liberacaoPorCliente.has(
        clienteId,
      )
    ) {
      continue;
    }

    const validoAte =
      String(
        item.valido_ate ??
          "",
      );

    if (
      !validoAte ||
      new Date(
        validoAte,
      ).getTime() <=
        agora.getTime()
    ) {
      continue;
    }

    liberacaoPorCliente.set(
      clienteId,
      {
        id:
          Number(
            item.id,
          ),
        motivo:
          String(
            item.motivo,
          ),
        validoAte,
      },
    );
  }

  const financeiro =
    new Map<
      number,
      {
        saldo: number;
        abertas: number;
        vencidas: number;
      }
    >();

  for (
    const parcela of
      parcelasResult.data ??
      []
  ) {
    const clienteId =
      Number(
        parcela.cliente_id,
      );

    const saldo =
      Math.max(
        0,
        Number(
          parcela.valor ??
            0,
        ) -
          Number(
            parcela.valor_pago ??
              0,
          ),
      );

    const atual =
      financeiro.get(
        clienteId,
      ) ?? {
        saldo:
          0,
        abertas:
          0,
        vencidas:
          0,
      };

    if (
      saldo >
      0
    ) {
      atual.saldo +=
        saldo;

      atual.abertas +=
        1;

      if (
        String(
          parcela.vencimento,
        ) <
        limiteAtraso
      ) {
        atual.vencidas +=
          1;
      }
    }

    financeiro.set(
      clienteId,
      atual,
    );
  }

  const busca =
    (
      filtros.q ??
      ""
    )
      .trim()
      .toLocaleLowerCase(
        "pt-BR",
      );

  const clientes =
    (
      clientesResult.data ??
      []
    )
      .map(
        (
          cliente,
        ) => {
          const clienteId =
            Number(
              cliente.id,
            );

          const fin =
            financeiro.get(
              clienteId,
            ) ?? {
              saldo:
                0,
              abertas:
                0,
              vencidas:
                0,
            };

          const liberacao =
            liberacaoPorCliente.get(
              clienteId,
            ) ??
            null;

          const avaliacao =
            avaliarCredito({
              qtdAtrasos:
                fin.vencidas,
              politica,
              liberacaoAtiva:
                liberacao,
              agora,
            });

          return {
            id:
              clienteId,
            codigo:
              String(
                cliente.codigo,
              ),
            nome:
              String(
                cliente.nome,
              ),
            saldo:
              fin.saldo,
            parcelasAbertas:
              fin.abertas,
            parcelasVencidas:
              fin.vencidas,
            statusBase:
              avaliacao.statusBase,
            statusEfetivo:
              avaliacao.statusEfetivo,
            liberacao,
          };
        },
      )
      .filter(
        (
          cliente,
        ) => {
          if (
            busca &&
            !cliente.nome
              .toLocaleLowerCase(
                "pt-BR",
              )
              .includes(
                busca,
              ) &&
            !cliente.codigo
              .toLocaleLowerCase(
                "pt-BR",
              )
              .includes(
                busca,
              )
          ) {
            return false;
          }

          if (
            filtros.cliente &&
            String(
              cliente.id,
            ) !==
              filtros.cliente
          ) {
            return false;
          }

          if (
            filtros.situacao &&
            cliente.statusEfetivo !==
              filtros.situacao
          ) {
            return false;
          }

          return true;
        },
      );

  const podeConfigurarPolitica =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo ===
      "ADMINISTRADOR";

  const perfilGestao =
    usuario.isPlatformAdmin ||
    usuario.perfilCodigo ===
      "ADMINISTRADOR" ||
    usuario.perfilCodigo ===
      "GESTOR";

  const podeLiberarCredito =
    usuario.isPlatformAdmin ||
    (
      perfilGestao &&
      temPermissao(
        usuario.permissoes,
        PERMISSOES.CREDITO_LIBERAR,
      )
    );

  const activeCount =
    Object.values(
      filtros,
    ).filter(
      (
        value,
      ) =>
        typeof value ===
          "string" &&
        value.trim(),
    ).length;

  return (
    <main className="app-premium min-h-screen px-5 py-7 text-[#142018]">
      <div className="mx-auto max-w-[1180px]">
        <ModuleHeader
          eyebrow="Crédito"
          title="Gestão de crédito"
        />

        <Hero
          eyebrow="Política de crédito"
          title="Crédito sob controle"
          description="A mesma política da empresa controla novos contratos e bloqueia entregas automaticamente quando o limite de atraso é atingido."
        >
          <KpiGrid>
            <Kpi
              label="Alerta com"
              value={`${politica.alertaQtdAtrasos} atraso(s)`}
            />

            <Kpi
              label="Bloqueio com"
              value={`${politica.bloqueioQtdAtrasos} atraso(s)`}
              warning
            />

            <Kpi
              label="Tolerância"
              value={`${politica.diasTolerancia} dia(s)`}
            />

            <Kpi
              label="Exceção gerencial"
              value={
                politica.permitirExcecao
                  ? "Ativa"
                  : "Desativada"
              }
              highlight={
                politica.permitirExcecao
              }
            />
          </KpiGrid>
        </Hero>

        <SmartFilters
          resetHref="/admin/credito"
          activeCount={
            activeCount
          }
          description="Filtre a carteira sem alterar a política configurada"
          quick={
            <div className="flex flex-wrap gap-2">
              <QuickLink
                href="/admin/credito"
                active={
                  !filtros.situacao
                }
              >
                Todos
              </QuickLink>

              <QuickLink
                href="/admin/credito?situacao=LIBERADO"
                active={
                  filtros.situacao ===
                  "LIBERADO"
                }
              >
                Liberados
              </QuickLink>

              <QuickLink
                href="/admin/credito?situacao=ALERTA"
                active={
                  filtros.situacao ===
                  "ALERTA"
                }
                tone="gold"
              >
                Alerta
              </QuickLink>

              <QuickLink
                href="/admin/credito?situacao=BLOQUEADO"
                active={
                  filtros.situacao ===
                  "BLOQUEADO"
                }
                tone="gold"
              >
                Bloqueados
              </QuickLink>

              <QuickLink
                href="/admin/credito?situacao=LIBERADO_EXCECAO"
                active={
                  filtros.situacao ===
                  "LIBERADO_EXCECAO"
                }
              >
                Exceções
              </QuickLink>
            </div>
          }
        >
          <form
            method="get"
            className="grid gap-4 md:grid-cols-3"
          >
            <Field label="Buscar">
              <input
                name="q"
                defaultValue={
                  filtros.q ??
                  ""
                }
                placeholder="Nome ou código"
                className={
                  inputClass
                }
              />
            </Field>

            <Field label="Cliente">
              <select
                name="cliente"
                defaultValue={
                  filtros.cliente ??
                  ""
                }
                className={
                  inputClass
                }
              >
                <option value="">
                  Todos
                </option>

                {(
                  clientesResult.data ??
                  []
                ).map(
                  (
                    cliente,
                  ) => (
                    <option
                      key={
                        cliente.id
                      }
                      value={
                        cliente.id
                      }
                    >
                      {
                        cliente.nome
                      }
                    </option>
                  ),
                )}
              </select>
            </Field>

            <div className="flex items-end">
              <ApplyButton />
            </div>
          </form>
        </SmartFilters>

        <CreditoAdminClient
          empresaNome={
            usuario.empresa
              .nomeFantasia
          }
          politica={
            politica
          }
          clientes={
            clientes
          }
          podeConfigurarPolitica={
            podeConfigurarPolitica
          }
          podeLiberarCredito={
            podeLiberarCredito
          }
        />
      </div>
    </main>
  );
}
