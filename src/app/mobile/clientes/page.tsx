export const instant = false;

import {
  ArrowLeft,
  Edit3,
  MapPin,
  Phone,
  Search,
  ShoppingBag,
  UserPlus,
  UsersRound,
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

import {
  iniciarVendaCampo,
} from "./actions";

type Props = {
  searchParams:
    Promise<{
      q?: string;
      modo?: string;
      clienteId?: string;
    }>;
};

function normalizar(
  valor:
    string | null | undefined,
) {
  return String(
    valor ??
      "",
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim();
}

function endereco(
  cliente: {
    logradouro:
      string | null;
    numero:
      string | null;
    bairro:
      string | null;
    cidade:
      string | null;
  },
) {
  const linha =
    [
      cliente.logradouro,
      cliente.numero,
    ]
      .filter(Boolean)
      .join(", ");

  const local =
    [
      cliente.bairro,
      cliente.cidade,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    [linha, local]
      .filter(Boolean)
      .join(" — ") ||
    "Endereço não informado"
  );
}

export default async function ClientesMobilePage({
  searchParams,
}: Props) {
  const usuario =
    await getCurrentUserProfile();

  if (
    !usuario ||
    !usuario.ativo
  ) {
    redirect("/");
  }

  const podeCadastrar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CLIENTE_MOBILE_CADASTRAR,
    );

  const podeEditar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.CLIENTE_MOBILE_EDITAR,
    );

  const podeVender =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ENTREGA_REALIZAR,
    );

  if (
    !podeCadastrar &&
    !podeEditar &&
    !podeVender
  ) {
    redirect(
      "/mobile/sem-acesso",
    );
  }

  const params =
    await searchParams;

  const busca =
    String(
      params.q ??
        "",
    ).trim();

  const modoVenda =
    params.modo ===
    "venda";

  const destaqueId =
    Number(
      params.clienteId ??
      0,
    );

  const supabase =
    await createClient();

  const {
    data,
    error,
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
        cep,
        created_at
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
      )
      .limit(
        250,
      );

  if (error) {
    console.error(
      "Erro clientes mobile:",
      error,
    );
  }

  const termo =
    normalizar(
      busca,
    );

  const clientes =
    (
      data ??
      []
    ).filter(
      (
        cliente,
      ) => {
        if (!termo) {
          return true;
        }

        return [
          cliente.nome,
          cliente.codigo,
          cliente.telefone,
          cliente.cpf_cnpj,
          cliente.bairro,
          cliente.logradouro,
        ].some(
          (
            valor,
          ) =>
            normalizar(
              valor,
            ).includes(
              termo,
            ),
        );
      },
    );

  return (
    <main className="app-premium min-h-dvh text-[#142018]">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7]/95 pb-28 shadow-[0_0_60px_rgba(17,63,33,0.12)]">
        <header className="hero-premium grain relative overflow-hidden px-5 pb-8 pt-5 text-white">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full border-[30px] border-white/[0.04]" />

          <div className="relative z-10 flex items-center justify-between">
            <Link
              href="/mobile"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-white/10"
            >
              <ArrowLeft
                size={19}
              />
            </Link>

            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
                Operação em campo
              </p>

              <h1 className="mt-1 text-lg font-black">
                Clientes
              </h1>
            </div>

            {podeCadastrar ? (
              <Link
                href="/mobile/clientes/novo"
                className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-white text-[#176f3c]"
                aria-label="Novo cliente"
              >
                <UserPlus
                  size={19}
                />
              </Link>
            ) : (
              <div className="h-11 w-11" />
            )}
          </div>

          <div className="relative z-10 mt-7">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.17em] text-[#a8d8b7]">
              {modoVenda ? (
                <ShoppingBag
                  size={14}
                />
              ) : (
                <UsersRound
                  size={14}
                />
              )}

              {modoVenda
                ? "Venda em campo"
                : "Carteira da empresa"}
            </div>

            <h2 className="mt-2 text-[29px] font-black tracking-[-0.05em]">
              {modoVenda
                ? "Escolha o cliente."
                : "Cliente na palma da mão."}
            </h2>

            <p className="mt-3 max-w-[340px] text-[11px] leading-5 text-white/65">
              {modoVenda
                ? "Venda para um cliente já cadastrado ou cadastre um novo sem depender de rota planejada."
                : "Localize, cadastre, corrija dados e inicie uma venda diretamente da rua."}
            </p>
          </div>
        </header>

        <section className="px-5 py-5">
          <form className="rounded-[22px] bg-white p-3 shadow-sm">
            {modoVenda ? (
              <input
                type="hidden"
                name="modo"
                value="venda"
              />
            ) : null}

            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700"
              />

              <input
                name="q"
                defaultValue={
                  busca
                }
                placeholder="Nome, código, telefone, bairro..."
                className="h-[54px] w-full rounded-[17px] border border-slate-200 bg-[#fbfdfb] pl-11 pr-4 text-[12px] font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
              />
            </div>
          </form>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#b07a12]">
                Resultado
              </p>

              <p className="mt-1 text-[18px] font-black">
                {clientes.length} cliente(s)
              </p>
            </div>

            {podeCadastrar ? (
              <Link
                href="/mobile/clientes/novo"
                className="flex items-center gap-2 rounded-[14px] bg-[#176f3c] px-4 py-3 text-[10px] font-black text-white"
              >
                <UserPlus
                  size={15}
                />
                Novo cliente
              </Link>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            {clientes.length ===
            0 ? (
              <div className="rounded-[26px] bg-white p-7 text-center shadow-sm">
                <UsersRound
                  size={30}
                  className="mx-auto text-slate-300"
                />

                <h3 className="mt-4 text-[16px] font-black">
                  Nenhum cliente encontrado
                </h3>

                <p className="mt-2 text-[11px] leading-5 text-slate-400">
                  Ajuste a busca ou cadastre o cliente durante o atendimento.
                </p>
              </div>
            ) : (
              clientes.map(
                (
                  cliente,
                ) => {
                  const destaque =
                    Number(
                      cliente.id,
                    ) ===
                    destaqueId;

                  return (
                    <article
                      key={
                        cliente.id
                      }
                      className={`rounded-[24px] border bg-white p-5 shadow-sm ${
                        destaque
                          ? "border-emerald-300 ring-4 ring-emerald-50"
                          : "border-black/[0.04]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-700">
                            {
                              cliente.codigo
                            }
                          </p>

                          <h3 className="mt-1 truncate text-[17px] font-black">
                            {
                              cliente.nome
                            }
                          </h3>
                        </div>

                        {destaque ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[8px] font-black text-emerald-700">
                            NOVO
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 space-y-2 rounded-[17px] bg-[#f6f9f6] p-3">
                        <div className="flex items-start gap-2 text-[10px] leading-5 text-slate-500">
                          <MapPin
                            size={14}
                            className="mt-0.5 shrink-0 text-emerald-700"
                          />

                          <span>
                            {
                              endereco(
                                cliente,
                              )
                            }
                          </span>
                        </div>

                        {cliente.telefone ? (
                          <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                            <Phone
                              size={14}
                              className="text-emerald-700"
                            />

                            {
                              cliente.telefone
                            }
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {podeEditar ? (
                          <Link
                            href={`/mobile/clientes/${cliente.id}/editar`}
                            className="flex h-[46px] items-center justify-center gap-2 rounded-[14px] border border-emerald-100 bg-white text-[10px] font-black text-emerald-800"
                          >
                            <Edit3
                              size={15}
                            />
                            Editar
                          </Link>
                        ) : (
                          <div />
                        )}

                        {podeVender ? (
                          <form
                            action={
                              iniciarVendaCampo
                            }
                          >
                            <input
                              type="hidden"
                              name="cliente_id"
                              value={
                                cliente.id
                              }
                            />

                            <button
                              type="submit"
                              className="flex h-[46px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#176f3c] text-[10px] font-black text-white"
                            >
                              <ShoppingBag
                                size={15}
                              />
                              Vender agora
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </article>
                  );
                },
              )
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
