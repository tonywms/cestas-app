export const instant = false;

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  MapPin,
  Navigation,
  PackageCheck,
  Route,
  ShieldCheck,
  Truck,
  UserRound,
} from "lucide-react";

import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

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

type PageProps = {
  params: Promise<{
    rotaId: string;
  }>;
};

function formatarData(
  valor: string | null,
) {
  if (!valor) {
    return "—";
  }

  const [
    ano,
    mes,
    dia,
  ] = valor.split("-");

  if (
    !ano ||
    !mes ||
    !dia
  ) {
    return valor;
  }

  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(
  valor: string | null,
) {
  if (!valor) {
    return "—";
  }

  const data =
    new Date(valor);

  if (
    Number.isNaN(
      data.getTime(),
    )
  ) {
    return valor;
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle:
        "short",

      timeStyle:
        "short",

      timeZone:
        "America/Fortaleza",
    },
  ).format(data);
}

function rotuloStatus(
  status: string,
) {
  const mapa:
    Record<string, string> = {
      PLANEJADA:
        "Planejada",

      EM_ROTA:
        "Em rota",

      FINALIZADA:
        "Finalizada",

      CANCELADA:
        "Cancelada",

      PENDENTE:
        "Aguardando",

      ENTREGUE:
        "Entregue",

      AUSENTE:
        "Ausente",

      RECUSADO:
        "Recusado",

      RECUSA:
        "Recusado",

      ENDERECO_INCORRETO:
        "Endereço incorreto",
    };

  return (
    mapa[status] ??
    status
      .replaceAll(
        "_",
        " ",
      )
      .toLowerCase()
      .replace(
        /^\w/,
        (
          letra,
        ) =>
          letra.toUpperCase(),
      )
  );
}

function rotuloOcorrencia(
  tipo: string,
) {
  const mapa:
    Record<string, string> = {
      CLIENTE_AUSENTE:
        "Cliente ausente",

      RECUSA:
        "Cliente recusou",

      ENDERECO_INCORRETO:
        "Endereço incorreto",

      OUTRO:
        "Outra ocorrência",
    };

  return (
    mapa[tipo] ??
    rotuloStatus(tipo)
  );
}

function statusRotaClasses(
  status: string,
) {
  if (
    status ===
    "FINALIZADA"
  ) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (
    status ===
    "EM_ROTA"
  ) {
    return "bg-sky-100 text-sky-700";
  }

  if (
    status ===
    "CANCELADA"
  ) {
    return "bg-red-100 text-red-700";
  }

  return "bg-amber-100 text-amber-700";
}

function enderecoTexto({
  logradouro,
  numero,
  bairro,
  cidade,
  uf,
}: {
  logradouro:
    string | null;

  numero:
    string | null;

  bairro:
    string | null;

  cidade:
    string | null;

  uf:
    string | null;
}) {
  const linha1 =
    [
      logradouro,
      numero,
    ]
      .filter(Boolean)
      .join(", ");

  const linha2 =
    [
      bairro,
      cidade,
      uf,
    ]
      .filter(Boolean)
      .join(" • ");

  return {
    linha1:
      linha1 ||
      "Endereço não informado",

    linha2,
  };
}

function normalizar(
  valor:
    string | null | undefined,
) {
  return (
    valor ??
    ""
  )
    .trim()
    .toLocaleLowerCase(
      "pt-BR",
    );
}

export default async function DetalheRotaPage({
  params,
}: PageProps) {
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

  const {
    rotaId:
      rotaIdTexto,
  } = await params;

  const rotaId =
    Number(
      rotaIdTexto,
    );

  if (
    !Number.isInteger(
      rotaId,
    ) ||
    rotaId <= 0
  ) {
    redirect(
      "/admin/rotas",
    );
  }

  const supabase =
    await createClient();

  const {
    data: rota,
    error:
      rotaError,
  } = await supabase
    .from("rotas")
    .select(`
      id,
      codigo,
      entregador_id,
      data_rota,
      status,
      observacao,
      iniciada_at,
      finalizada_at,
      created_at,
      updated_at
    `)
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "id",
      rotaId,
    )
    .maybeSingle();

  if (
    rotaError ||
    !rota
  ) {
    redirect(
      "/admin/rotas",
    );
  }

  const [
    entregadorResult,
    itensResult,
    ocorrenciasResult,
    entregasResult,
  ] =
    await Promise.all([
      supabase
        .from("usuarios")
        .select(`
          id,
          nome,
          email,
          telefone
        `)
        .eq(
          "id",
          rota.entregador_id,
        )
        .maybeSingle(),

      supabase
        .from(
          "rota_clientes",
        )
        .select(`
          id,
          cliente_id,
          sequencia,
          status,
          observacao,
          atendido_at,
          created_at,
          updated_at,
          endereco_logradouro,
          endereco_numero,
          endereco_complemento,
          endereco_bairro,
          endereco_cidade,
          endereco_uf,
          endereco_cep
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "rota_id",
          rota.id,
        )
        .order(
          "sequencia",
          {
            ascending:
              true,
          },
        ),

      supabase
        .from(
          "ocorrencias",
        )
        .select(`
          id,
          rota_cliente_id,
          cliente_id,
          tipo,
          descricao,
          requer_reagendamento,
          created_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "rota_id",
          rota.id,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        ),

      supabase
        .from("entregas")
        .select(`
          id,
          carga_id,
          rota_cliente_id,
          cliente_id,
          status,
          entregue_at,
          observacao,
          created_at
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        ),
    ]);

  if (
    itensResult.error
  ) {
    console.error(
      "Erro ao consultar paradas da rota:",
      itensResult.error,
    );
  }

  if (
    ocorrenciasResult.error
  ) {
    console.error(
      "Erro ao consultar ocorrências da rota:",
      ocorrenciasResult.error,
    );
  }

  if (
    entregasResult.error
  ) {
    console.error(
      "Erro ao consultar entregas da rota:",
      entregasResult.error,
    );
  }

  const itens =
    itensResult.data ??
    [];

  const rotaClienteIds =
    itens.map(
      (
        item,
      ) =>
        item.id,
    );

  const clienteIds =
    Array.from(
      new Set(
        itens.map(
          (
            item,
          ) =>
            item.cliente_id,
        ),
      ),
    );

  const entregas =
    (
      entregasResult.data ??
      []
    ).filter(
      (
        item,
      ) =>
        item.rota_cliente_id !==
          null &&
        rotaClienteIds.includes(
          item.rota_cliente_id,
        ),
    );

  const entregaIds =
    entregas.map(
      (
        item,
      ) =>
        item.id,
    );

  const [
    clientesResult,
    entregaItensResult,
  ] =
    await Promise.all([
      clienteIds.length >
      0
        ? supabase
            .from(
              "clientes",
            )
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
            .in(
              "id",
              clienteIds,
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      entregaIds.length >
      0
        ? supabase
            .from(
              "entrega_itens",
            )
            .select(`
              id,
              entrega_id,
              tipo_cesta_id,
              quantidade
            `)
            .eq(
              "empresa_id",
              usuario.empresa.id,
            )
            .in(
              "entrega_id",
              entregaIds,
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

  const entregaItens =
    entregaItensResult.data ??
    [];

  const tipoCestaIds =
    Array.from(
      new Set(
        entregaItens.map(
          (
            item,
          ) =>
            item.tipo_cesta_id,
        ),
      ),
    );

  const {
    data:
      tiposCesta,
  } =
    tipoCestaIds.length >
    0
      ? await supabase
          .from(
            "tipos_cesta",
          )
          .select(`
            id,
            codigo,
            nome
          `)
          .eq(
            "empresa_id",
            usuario.empresa.id,
          )
          .in(
            "id",
            tipoCestaIds,
          )
      : {
          data: [],
        };

  const entregador =
    entregadorResult.data;

  const clientesMap =
    new Map(
      (
        clientesResult.data ??
        []
      ).map(
        (
          cliente,
        ) => [
          cliente.id,
          cliente,
        ],
      ),
    );

  const ocorrenciasMap =
    new Map(
      (
        ocorrenciasResult.data ??
        []
      ).map(
        (
          ocorrencia,
        ) => [
          ocorrencia.rota_cliente_id,
          ocorrencia,
        ],
      ),
    );

  const entregasMap =
    new Map(
      entregas.map(
        (
          entrega,
        ) => [
          entrega.rota_cliente_id,
          entrega,
        ],
      ),
    );

  const tiposCestaMap =
    new Map(
      (
        tiposCesta ??
        []
      ).map(
        (
          tipo,
        ) => [
          tipo.id,
          tipo,
        ],
      ),
    );

  const itensPorEntrega =
    new Map<
      number,
      typeof entregaItens
    >();

  for (
    const item of
      entregaItens
  ) {
    const atual =
      itensPorEntrega.get(
        item.entrega_id,
      ) ??
      [];

    atual.push(
      item,
    );

    itensPorEntrega.set(
      item.entrega_id,
      atual,
    );
  }

  const total =
    itens.length;

  const processados =
    itens.filter(
      (
        item,
      ) =>
        item.status !==
        "PENDENTE",
    ).length;

  const entregues =
    itens.filter(
      (
        item,
      ) =>
        item.status ===
        "ENTREGUE",
    ).length;

  const ocorrencias =
    itens.filter(
      (
        item,
      ) =>
        item.status !==
          "PENDENTE" &&
        item.status !==
          "ENTREGUE",
    ).length;

  const pendentes =
    itens.filter(
      (
        item,
      ) =>
        item.status ===
        "PENDENTE",
    ).length;

  const percentualProcessado =
    total >
    0
      ? Math.round(
          (
            processados /
            total
          ) *
            100,
        )
      : 0;

  const percentualEntrega =
    total >
    0
      ? Math.round(
          (
            entregues /
            total
          ) *
            100,
        )
      : 0;

  const finalizadaComOcorrencia =
    rota.status ===
      "FINALIZADA" &&
    ocorrencias >
      0;

  return (
    <main className="app-premium min-h-screen px-4 py-6 text-[#142018] md:px-6 md:py-8">

      <div className="mx-auto max-w-[1120px]">

        {/* =========================================
            HEADER
        ========================================== */}

        <header className="glass flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">

          <div className="flex items-center gap-4">

            <Link
              href="/admin/rotas"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-emerald-50 text-[#176f3c]"
            >
              <ArrowLeft
                size={19}
              />
            </Link>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#b07a12]">
                Logística
              </p>

              <h1 className="mt-0.5 text-[19px] font-black tracking-[-0.04em]">
                Detalhe da rota
              </h1>
            </div>

          </div>

          <span
            className={`rounded-full px-4 py-2 text-[8px] font-black uppercase ${statusRotaClasses(
              rota.status,
            )}`}
          >
            {rotuloStatus(
              rota.status,
            )}
          </span>

        </header>

        {/* =========================================
            HERO
        ========================================== */}

        <section className="hero-premium grain relative mt-5 overflow-hidden rounded-[34px] p-7 text-white md:p-8">

          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-white/[0.035]" />

          <div className="relative z-10">

            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">

              <div>

                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">
                  <Navigation
                    size={14}
                    className="text-[#f4b13f]"
                  />

                  {rota.codigo}
                </div>

                <h2 className="mt-3 text-[32px] font-black tracking-[-0.055em]">
                  {total} cliente
                  {total ===
                  1
                    ? ""
                    : "s"} na rota
                  <span className="text-[#f4b13f]">
                    .
                  </span>
                </h2>

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-white/60">

                  <span className="flex items-center gap-1.5">
                    <UserRound
                      size={13}
                    />

                    {entregador?.nome ??
                      "Entregador"}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <CalendarDays
                      size={13}
                    />

                    {formatarData(
                      rota.data_rota,
                    )}
                  </span>

                  {rota.iniciada_at && (
                    <span className="flex items-center gap-1.5">
                      <Clock3
                        size={13}
                      />

                      Iniciada{" "}
                      {formatarDataHora(
                        rota.iniciada_at,
                      )}
                    </span>
                  )}

                </div>

              </div>

              <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[19px] border border-white/10 bg-white/10">
                <Route
                  size={27}
                />
              </div>

            </div>

            {/* PROCESSAMENTO */}

            <div className="mt-7 rounded-[24px] border border-white/15 bg-white/[0.09] p-4 backdrop-blur-xl">

              <div className="flex items-end justify-between gap-4">

                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.17em] text-white/50">
                    Progresso operacional
                  </p>

                  <p className="mt-1 text-[13px] font-black">
                    {processados} de{" "}
                    {total} cliente(s) processado(s)
                  </p>
                </div>

                <p className="text-[29px] font-black tracking-[-0.05em]">
                  {percentualProcessado}%
                </p>

              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/20">

                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#f4b13f,#ffe3a1)]"
                  style={{
                    width: `${percentualProcessado}%`,
                  }}
                />

              </div>

            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5 md:grid-cols-4">

              <HeroKpi
                label="Total"
                valor={total}
              />

              <HeroKpi
                label="Entregues"
                valor={entregues}
              />

              <HeroKpi
                label="Ocorrências"
                valor={ocorrencias}
                alerta={
                  ocorrencias >
                  0
                }
              />

              <HeroKpi
                label="Pendentes"
                valor={pendentes}
              />

            </div>

          </div>

        </section>

        {/* =========================================
            RESULTADO DA ROTA
        ========================================== */}

        <section className="mt-5 grid gap-4 md:grid-cols-2">

          <div className="card-premium rounded-[26px] p-5">

            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
              Taxa de entrega efetiva
            </p>

            <div className="mt-2 flex items-end justify-between">

              <p className={`text-[31px] font-black tracking-[-0.05em] ${
                percentualEntrega ===
                100
                  ? "text-[#176f3c]"
                  : "text-[#b07a12]"
              }`}>
                {percentualEntrega}%
              </p>

              <PackageCheck
                size={25}
                className="text-[#176f3c]"
              />

            </div>

            <p className="mt-2 text-[9px] text-slate-400">
              {entregues} entrega(s) concluída(s) de {total} cliente(s).
            </p>

          </div>

          <div className={`rounded-[26px] border p-5 ${
            finalizadaComOcorrencia
              ? "border-amber-200 bg-[linear-gradient(145deg,#fff8e8,#ffffff)]"
              : "border-emerald-200 bg-[linear-gradient(145deg,#effbf4,#ffffff)]"
          }`}>

            <div className="flex items-start gap-3">

              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${
                finalizadaComOcorrencia
                  ? "bg-amber-500 text-white"
                  : "bg-[#176f3c] text-white"
              }`}>
                {finalizadaComOcorrencia ? (
                  <AlertTriangle
                    size={20}
                  />
                ) : (
                  <ShieldCheck
                    size={20}
                  />
                )}
              </div>

              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Resultado
                </p>

                <h3 className="mt-1 text-[16px] font-black">
                  {rota.status ===
                  "FINALIZADA"
                    ? (
                        finalizadaComOcorrencia
                          ? "Finalizada com ocorrência"
                          : "Rota concluída"
                      )
                    : "Rota em andamento"}
                </h3>

                <p className="mt-1 text-[9px] leading-4 text-slate-500">
                  {finalizadaComOcorrencia
                    ? `${ocorrencias} cliente(s) não receberam entrega nesta rota.`
                    : pendentes > 0
                      ? `${pendentes} cliente(s) ainda aguardam atendimento.`
                      : "Todos os clientes foram processados."}
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* =========================================
            ITINERÁRIO
        ========================================== */}

        <section className="mt-6">

          <div className="mb-4 flex items-end justify-between">

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
                Itinerário
              </p>

              <h3 className="mt-1 text-[22px] font-black tracking-[-0.04em]">
                Clientes da rota
              </h3>
            </div>

            <span className="rounded-full border border-emerald-100 bg-white px-3 py-2 text-[8px] font-black uppercase text-[#176f3c]">
              {total} parada
              {total ===
              1
                ? ""
                : "s"}
            </span>

          </div>

          <div className="space-y-4">

            {itens.map(
              (
                item,
              ) => {
                const cliente =
                  clientesMap.get(
                    item.cliente_id,
                  );

                if (!cliente) {
                  return null;
                }

                const ocorrencia =
                  ocorrenciasMap.get(
                    item.id,
                  );

                const entrega =
                  entregasMap.get(
                    item.id,
                  );

                const itensEntrega =
                  entrega
                    ? itensPorEntrega.get(
                        entrega.id,
                      ) ??
                      []
                    : [];

                const enderecoRota =
                  enderecoTexto({
                    logradouro:
                      item.endereco_logradouro ??
                      cliente.logradouro,

                    numero:
                      item.endereco_numero ??
                      cliente.numero,

                    bairro:
                      item.endereco_bairro ??
                      cliente.bairro,

                    cidade:
                      item.endereco_cidade ??
                      cliente.cidade,

                    uf:
                      item.endereco_uf ??
                      cliente.uf,
                  });

                const enderecoAtual =
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
                  });

                const enderecoAlterado =
                  normalizar(
                    item.endereco_logradouro,
                  ) !==
                    normalizar(
                      cliente.logradouro,
                    ) ||
                  normalizar(
                    item.endereco_numero,
                  ) !==
                    normalizar(
                      cliente.numero,
                    ) ||
                  normalizar(
                    item.endereco_bairro,
                  ) !==
                    normalizar(
                      cliente.bairro,
                    ) ||
                  normalizar(
                    item.endereco_cidade,
                  ) !==
                    normalizar(
                      cliente.cidade,
                    ) ||
                  normalizar(
                    item.endereco_uf,
                  ) !==
                    normalizar(
                      cliente.uf,
                    );

                const entregue =
                  item.status ===
                  "ENTREGUE";

                const temOcorrencia =
                  item.status !==
                    "PENDENTE" &&
                  !entregue;

                return (
                  <article
                    key={item.id}
                    className={`relative overflow-hidden rounded-[28px] border p-5 shadow-[0_18px_45px_-30px_rgba(17,63,33,0.18)] ${
                      entregue
                        ? "border-emerald-200 bg-[linear-gradient(145deg,#f0fbf4,#ffffff)]"
                        : temOcorrencia
                          ? "border-amber-200 bg-[linear-gradient(145deg,#fff9ed,#ffffff)]"
                          : "border-slate-100 bg-white"
                    }`}
                  >

                    <div className={`absolute inset-x-0 top-0 h-[3px] ${
                      entregue
                        ? "bg-emerald-500"
                        : temOcorrencia
                          ? "bg-amber-500"
                          : "bg-[linear-gradient(90deg,#f4b13f,#176f3c)]"
                    }`} />

                    {/* CABEÇALHO */}

                    <div className="flex items-start gap-4">

                      <div className={`flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[18px] ${
                        entregue
                          ? "bg-[#176f3c] text-white"
                          : temOcorrencia
                            ? "bg-amber-500 text-white"
                            : "border border-amber-200 bg-[#fff8e8] text-[#b07a12]"
                      }`}>
                        {entregue ? (
                          <CheckCircle2
                            size={23}
                          />
                        ) : temOcorrencia ? (
                          <CircleAlert
                            size={23}
                          />
                        ) : (
                          <span className="text-[19px] font-black">
                            {item.sequencia}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-start justify-between gap-3">

                          <div className="min-w-0">

                            <h4 className="truncate text-[18px] font-black tracking-[-0.035em]">
                              {cliente.nome}
                            </h4>

                            <p className="mt-1 text-[8px] font-black uppercase tracking-[0.13em] text-slate-400">
                              {cliente.codigo}
                            </p>

                          </div>

                          <span className={`rounded-full px-3 py-1.5 text-[8px] font-black uppercase ${
                            entregue
                              ? "bg-emerald-100 text-emerald-700"
                              : temOcorrencia
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-500"
                          }`}>
                            {rotuloStatus(
                              item.status,
                            )}
                          </span>

                        </div>

                      </div>

                    </div>

                    {/* ENDEREÇO CONGELADO */}

                    <div className="mt-4 rounded-[18px] bg-[#f5f8f5] p-4">

                      <div className="flex items-start gap-3">

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-white text-[#176f3c] shadow-sm">
                          <MapPin
                            size={16}
                          />
                        </div>

                        <div>
                          <p className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-400">
                            Endereço congelado da rota
                          </p>

                          <p className="mt-1 text-[11px] font-black">
                            {enderecoRota.linha1}
                          </p>

                          {enderecoRota.linha2 && (
                            <p className="mt-1 text-[9px] text-slate-400">
                              {enderecoRota.linha2}
                            </p>
                          )}

                        </div>

                      </div>

                    </div>

                    {/* CADASTRO ALTERADO */}

                    {enderecoAlterado && (
                      <div className="mt-3 rounded-[18px] border border-sky-200 bg-sky-50 p-4">

                        <div className="flex items-start gap-3">

                          <ShieldCheck
                            size={17}
                            className="mt-0.5 shrink-0 text-sky-700"
                          />

                          <div>
                            <p className="text-[9px] font-black text-sky-800">
                              Cadastro alterado após o planejamento
                            </p>

                            <p className="mt-1 text-[9px] leading-4 text-sky-700/70">
                              Cadastro atual:{" "}
                              <strong>
                                {enderecoAtual.linha1}
                              </strong>
                              {enderecoAtual.linha2
                                ? ` • ${enderecoAtual.linha2}`
                                : ""}
                            </p>

                            <p className="mt-2 text-[8px] font-semibold text-sky-700">
                              Esta rota permanece vinculada ao endereço planejado acima.
                            </p>
                          </div>

                        </div>

                      </div>
                    )}

                    {/* KPIs DA PARADA */}

                    <div className="mt-3 grid grid-cols-2 gap-2">

                      <MiniInfo
                        label="Parada"
                        valor={`#${item.sequencia}`}
                      />

                      <MiniInfo
                        label="Processado em"
                        valor={
                          item.atendido_at
                            ? formatarDataHora(
                                item.atendido_at,
                              )
                            : "Aguardando"
                        }
                      />

                    </div>

                    {/* ENTREGA */}

                    {entrega && (
                      <div className="mt-4 rounded-[20px] border border-emerald-200 bg-emerald-50/70 p-4">

                        <div className="flex items-start gap-3">

                          <PackageCheck
                            size={18}
                            className="mt-0.5 shrink-0 text-emerald-700"
                          />

                          <div className="min-w-0 flex-1">

                            <p className="text-[9px] font-black uppercase tracking-[0.13em] text-emerald-700">
                              Entrega concluída
                            </p>

                            <p className="mt-1 text-[9px] text-emerald-800/65">
                              {formatarDataHora(
                                entrega.entregue_at ??
                                  entrega.created_at,
                              )}
                            </p>

                            {itensEntrega.length >
                              0 && (
                              <div className="mt-3 flex flex-wrap gap-2">

                                {itensEntrega.map(
                                  (
                                    entregaItem,
                                  ) => {
                                    const tipo =
                                      tiposCestaMap.get(
                                        entregaItem.tipo_cesta_id,
                                      );

                                    return (
                                      <span
                                        key={entregaItem.id}
                                        className="rounded-full bg-white px-3 py-2 text-[8px] font-black text-emerald-800 shadow-sm"
                                      >
                                        {entregaItem.quantidade}x{" "}
                                        {tipo?.nome ??
                                          "Cesta"}
                                      </span>
                                    );
                                  },
                                )}

                              </div>
                            )}

                          </div>

                        </div>

                      </div>
                    )}

                    {/* OCORRÊNCIA */}

                    {ocorrencia && (
                      <div className="mt-4 overflow-hidden rounded-[20px] border border-amber-200 bg-[#fff9e9]">

                        <div className="p-4">

                          <div className="flex items-start gap-3">

                            <AlertTriangle
                              size={18}
                              className="mt-0.5 shrink-0 text-amber-700"
                            />

                            <div>
                              <p className="text-[8px] font-black uppercase tracking-[0.13em] text-amber-700">
                                Motivo da não entrega
                              </p>

                              <p className="mt-1 text-[11px] font-black text-amber-900">
                                {rotuloOcorrencia(
                                  ocorrencia.tipo,
                                )}
                              </p>

                              {ocorrencia.descricao && (
                                <p className="mt-1 text-[9px] leading-4 text-amber-800/65">
                                  {ocorrencia.descricao}
                                </p>
                              )}

                            </div>

                          </div>

                        </div>

                        {ocorrencia.requer_reagendamento && (
                          <div className="border-t border-amber-200 bg-white/45 px-4 py-3 text-[8px] font-black text-amber-800">
                            Cliente marcado para reagendamento.
                          </div>
                        )}

                      </div>
                    )}

                    {item.observacao && (
                      <p className="mt-3 text-[9px] leading-4 text-slate-400">
                        Observação da parada:{" "}
                        {item.observacao}
                      </p>
                    )}

                  </article>
                );
              },
            )}

          </div>

        </section>

        {/* =========================================
            DADOS DA ROTA
        ========================================== */}

        <section className="card-premium mt-6 rounded-[28px] p-6">

          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b07a12]">
            Auditoria operacional
          </p>

          <h3 className="mt-1 text-[19px] font-black tracking-[-0.04em]">
            Linha de execução
          </h3>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <Info
              label="Criada em"
              valor={formatarDataHora(
                rota.created_at,
              )}
              icon={
                <CalendarDays
                  size={16}
                />
              }
            />

            <Info
              label="Iniciada em"
              valor={formatarDataHora(
                rota.iniciada_at,
              )}
              icon={
                <Truck
                  size={16}
                />
              }
            />

            <Info
              label="Finalizada em"
              valor={formatarDataHora(
                rota.finalizada_at,
              )}
              icon={
                <CheckCircle2
                  size={16}
                />
              }
            />

            <Info
              label="Responsável"
              valor={
                entregador?.nome ??
                "Não informado"
              }
              icon={
                <UserRound
                  size={16}
                />
              }
            />

          </div>

          {rota.observacao && (
            <div className="mt-4 rounded-[18px] bg-[#f6f9f6] p-4">
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Observação
              </p>

              <p className="mt-1 text-[10px] leading-5 text-slate-600">
                {rota.observacao}
              </p>
            </div>
          )}

        </section>

      </div>

    </main>
  );
}

function HeroKpi({
  label,
  valor,
  alerta = false,
}: {
  label: string;
  valor: number;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.08] px-4 py-3 backdrop-blur">

      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>

      <p className={`mt-1 text-[20px] font-black ${
        alerta
          ? "text-[#ffd57a]"
          : "text-white"
      }`}>
        {valor}
      </p>

    </div>
  );
}

function MiniInfo({
  label,
  valor,
}: {
  label: string;
  valor: string;
}) {
  return (
    <div className="rounded-[15px] border border-slate-100 bg-white/90 px-3 py-3">

      <p className="text-[7px] font-black uppercase tracking-[0.13em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-[10px] font-black">
        {valor}
      </p>

    </div>
  );
}

function Info({
  label,
  valor,
  icon,
}: {
  label: string;
  valor: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-slate-100 bg-[#fbfdfb] p-4">

      <div className="flex items-center gap-2 text-[#176f3c]">
        {icon}

        <p className="text-[7px] font-black uppercase tracking-[0.13em] text-slate-400">
          {label}
        </p>
      </div>

      <p className="mt-2 text-[10px] font-black">
        {valor}
      </p>

    </div>
  );
}
