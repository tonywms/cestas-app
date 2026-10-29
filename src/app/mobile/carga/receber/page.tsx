export const instant = false;

import {
  ArrowLeft,
  Barcode,
  PackageCheck,
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

import ReceberCargaForm from "./ReceberCargaForm";

function formatarDataHora(
  valor: string,
) {
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
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Fortaleza",
    },
  ).format(data);
}

export default async function ReceberCargaPage() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const autorizado =
    usuario.isPlatformAdmin ||
    (
      temPermissao(
        usuario.permissoes,
        PERMISSOES.CARGA_RECEBER,
      ) &&
      temPermissao(
        usuario.permissoes,
        PERMISSOES.CARGA_BIPAR_VOLUME,
      )
    );

  if (!autorizado) {
    redirect(
      "/mobile/sem-acesso",
    );
  }

  const usaVolume =
    usuario.configuracao
      .modoControleCarga ===
    "VOLUME";

  const exigeBipagem =
    usaVolume &&
    usuario.configuracao
      .exigirBipagemCarga;

  const supabase =
    await createClient();

  const {
    data: carga,
    error: cargaError,
  } =
    await supabase
      .from("cargas")
      .select(`
        id,
        codigo,
        data_carga,
        status,
        recebida_at,
        recebida_por
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "entregador_id",
        usuario.id,
      )
      .in(
        "status",
        [
          "ABERTA",
          "EM_ROTA",
        ],
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(1)
      .maybeSingle();

  if (cargaError) {
    console.error(
      "Erro ao consultar carga para recebimento:",
      cargaError,
    );
  }

  let esperados = 0;
  let confirmados = 0;

  const bipagens:
    {
      codigo: string;
      bipadoAt: string;
    }[] = [];

  if (carga) {
    const [
      volumesResult,
      bipagensResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "cesta_volumes",
          )
          .select(`
            id,
            codigo_volume,
            status
          `)
          .eq(
            "empresa_id",
            usuario.empresa.id,
          )
          .eq(
            "carga_id",
            carga.id,
          )
          .in(
            "status",
            [
              "EM_CARGA",
              "ENTREGUE",
              "RETORNADO",
              "AVARIADO",
            ],
          ),

        supabase
          .from(
            "carga_volume_bipagens",
          )
          .select(`
            volume_id,
            bipado_at
          `)
          .eq(
            "empresa_id",
            usuario.empresa.id,
          )
          .eq(
            "carga_id",
            carga.id,
          )
          .order(
            "bipado_at",
            {
              ascending: false,
            },
          ),
      ]);

    const volumes =
      volumesResult.data ??
      [];

    const volumePorId =
      new Map(
        volumes.map(
          (volume) => [
            volume.id,
            volume.codigo_volume,
          ],
        ),
      );

    esperados =
      volumes.length;

    confirmados =
      bipagensResult.data
        ?.length ?? 0;

    for (
      const item of
      bipagensResult.data ??
      []
    ) {
      const codigo =
        volumePorId.get(
          item.volume_id,
        );

      if (!codigo) {
        continue;
      }

      bipagens.push({
        codigo,
        bipadoAt:
          formatarDataHora(
            item.bipado_at,
          ),
      });
    }
  }

  const recebida =
    Boolean(
      carga?.recebida_at,
    );

  return (
    <main className="min-h-dvh bg-[#eaf2ec] text-[#142018]">

      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f7faf7] pb-12">

        <header className="relative overflow-hidden bg-[linear-gradient(155deg,#176b3a,#0d5a30)] px-5 pb-8 pt-5 text-white">

          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full border-[28px] border-white/[0.04]" />

          <div className="relative z-10 flex items-center justify-between">

            <Link
              href="/mobile/carga"
              className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/10"
            >
              <ArrowLeft
                size={19}
              />
            </Link>

            <div className="text-center">

              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">
                Estoque móvel
              </p>

              <h1 className="mt-1 text-lg font-black">
                Receber Carga
              </h1>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/10">
              <Barcode
                size={18}
              />
            </div>

          </div>

          <div className="relative z-10 mt-6">

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#a8d8b7]">
              Conferência individual
            </p>

            <h2 className="mt-2 text-[27px] font-black tracking-[-0.05em]">
              Bipe e confirme
              <span className="text-[#f4b13f]">
                .
              </span>
            </h2>

            <p className="mt-2 text-[12px] leading-5 text-white/65">
              Cada cesta reservada para sua carga deve ser fisicamente confirmada.
            </p>

            {carga && (
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-[9px] font-black">
                <PackageCheck
                  size={14}
                />

                {carga.codigo}
              </div>
            )}

          </div>

        </header>

        <section className="px-5 py-6">

          {!usaVolume ? (
            <Mensagem
              titulo="Empresa em QUANTIDADE"
              texto="O recebimento por bipagem fica disponível somente quando a empresa opera por VOLUME."
            />
          ) : !exigeBipagem ? (
            <Mensagem
              titulo="Bipagem não exigida"
              texto="A empresa opera por VOLUME, mas a confirmação por bipagem no recebimento está desativada."
            />
          ) : !carga ? (
            <Mensagem
              titulo="Nenhuma carga ativa"
              texto="Quando uma nova carga for atribuída ao seu usuário, ela aparecerá aqui para conferência."
            />
          ) : esperados <= 0 ? (
            <Mensagem
              titulo="Carga sem volumes reservados"
              texto="Esta carga não possui volumes individuais vinculados. Verifique a criação da carga no administrativo."
              alerta
            />
          ) : (
            <ReceberCargaForm
              key={
                carga.id
              }
              cargaId={
                carga.id
              }
              cargaCodigo={
                carga.codigo
              }
              esperadosInicial={
                esperados
              }
              confirmadosInicial={
                confirmados
              }
              recebida={
                recebida
              }
              bipagens={
                bipagens
              }
            />
          )}

        </section>

      </div>

    </main>
  );
}

function Mensagem({
  titulo,
  texto,
  alerta = false,
}: {
  titulo: string;
  texto: string;
  alerta?: boolean;
}) {
  return (
    <section className={`rounded-[28px] border bg-white p-6 shadow-[0_18px_45px_rgba(17,63,33,0.07)] ${
      alerta
        ? "border-amber-200"
        : "border-black/[0.04]"
    }`}>

      <div
        className={`flex h-14 w-14 items-center justify-center rounded-[18px] ${
          alerta
            ? "bg-amber-50 text-amber-600"
            : "bg-emerald-50 text-emerald-700"
        }`}
      >
        {alerta ? (
          <Barcode
            size={25}
          />
        ) : (
          <ShieldCheck
            size={25}
          />
        )}
      </div>

      <h2 className="mt-5 text-[21px] font-black tracking-[-0.04em]">
        {titulo}
      </h2>

      <p className="mt-3 text-[11px] leading-6 text-slate-500">
        {texto}
      </p>

      <Link
        href="/mobile/carga"
        className="mt-5 flex h-[50px] w-full items-center justify-center rounded-[16px] border border-emerald-100 bg-white text-[10px] font-black text-[#176f3c]"
      >
        Voltar para Minha Carga
      </Link>

    </section>
  );
}
