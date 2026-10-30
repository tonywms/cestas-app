import {
  Bell,
} from "lucide-react";
import Link from "next/link";

import {
  createClient,
} from "@/lib/supabase/server";

type Props = {
  empresaId: string;
  usuarioId: string;
};

function hojeFortaleza() {
  const partes =
    new Intl.DateTimeFormat(
      "en-US",
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
    ).formatToParts(
      new Date(),
    );

  const mapa =
    new Map(
      partes.map(
        (parte) => [
          parte.type,
          parte.value,
        ],
      ),
    );

  return `${mapa.get("year")}-${mapa.get("month")}-${mapa.get("day")}`;
}

export default async function AdminNotificationBell({
  empresaId,
  usuarioId,
}: Props) {
  const supabase =
    await createClient();

  const hoje =
    hojeFortaleza();

  const inicio30 =
    new Date();

  inicio30.setDate(
    inicio30.getDate() - 30,
  );

  const [
    estoqueResult,
    parcelasResult,
    cargasResult,
    ocorrenciasResult,
    empresaResult,
    membrosResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "estoque_central_saldos",
        )
        .select(
          "tipo_cesta_id, quantidade, estoque_minimo",
        )
        .eq(
          "empresa_id",
          empresaId,
        ),

      supabase
        .from(
          "parcelas",
        )
        .select(
          "id, valor, valor_pago",
        )
        .eq(
          "empresa_id",
          empresaId,
        )
        .eq(
          "status",
          "ABERTA",
        )
        .lt(
          "vencimento",
          hoje,
        ),

      supabase
        .from(
          "cargas",
        )
        .select(
          "id",
        )
        .eq(
          "empresa_id",
          empresaId,
        )
        .neq(
          "status",
          "FINALIZADA",
        ),

      supabase
        .from(
          "ocorrencias",
        )
        .select(
          "id",
        )
        .eq(
          "empresa_id",
          empresaId,
        )
        .eq(
          "requer_reagendamento",
          true,
        )
        .gte(
          "created_at",
          inicio30.toISOString(),
        ),

      supabase
        .from(
          "empresas",
        )
        .select(
          "limite_usuarios",
        )
        .eq(
          "id",
          empresaId,
        )
        .maybeSingle(),

      supabase
        .from(
          "empresa_usuarios",
        )
        .select(
          "usuario_id",
          {
            count:
              "exact",
            head:
              true,
          },
        )
        .eq(
          "empresa_id",
          empresaId,
        )
        .eq(
          "ativo",
          true,
        ),
    ]);

  const chaves:
    string[] = [];

  for (
    const item
    of estoqueResult.data ?? []
  ) {
    const saldo =
      Number(
        item.quantidade ?? 0,
      );

    const minimo =
      Number(
        item.estoque_minimo ?? 0,
      );

    if (
      saldo === 0
    ) {
      chaves.push(
        `ESTOQUE-ZERADO-${item.tipo_cesta_id}`,
      );
    }
    else if (
      minimo > 0 &&
      saldo <= minimo
    ) {
      chaves.push(
        `ESTOQUE-BAIXO-${item.tipo_cesta_id}`,
      );
    }
  }

  for (
    const parcela
    of parcelasResult.data ?? []
  ) {
    const saldo =
      Math.max(
        0,
        Number(
          parcela.valor ?? 0,
        ) -
          Number(
            parcela.valor_pago ?? 0,
          ),
      );

    if (
      saldo > 0
    ) {
      chaves.push(
        `PARCELA-${parcela.id}`,
      );
    }
  }

  for (
    const carga
    of cargasResult.data ?? []
  ) {
    chaves.push(
      `CARGA-${carga.id}`,
    );
  }

  for (
    const ocorrencia
    of ocorrenciasResult.data ?? []
  ) {
    chaves.push(
      `OCORRENCIA-${ocorrencia.id}`,
    );
  }

  const limiteUsuarios =
    Number(
      empresaResult.data
        ?.limite_usuarios ??
        10,
    );

  const usuariosAtivos =
    membrosResult.count ??
    0;

  const disponiveis =
    Math.max(
      0,
      limiteUsuarios -
        usuariosAtivos,
    );

  if (
    disponiveis === 0
  ) {
    chaves.push(
      "USUARIOS-LIMITE",
    );
  }
  else if (
    disponiveis <= 2
  ) {
    chaves.push(
      "USUARIOS-PROXIMO-LIMITE",
    );
  }

  const chavesUnicas =
    Array.from(
      new Set(
        chaves,
      ),
    );

  let vistos =
    new Set<string>();

  if (
    chavesUnicas.length > 0
  ) {
    const estadosResult =
      await supabase
        .from(
          "notification_user_state",
        )
        .select(
          "alert_key, status",
        )
        .eq(
          "empresa_id",
          empresaId,
        )
        .eq(
          "usuario_id",
          usuarioId,
        )
        .in(
          "alert_key",
          chavesUnicas,
        );

    vistos =
      new Set(
        (
          estadosResult.data ??
          []
        )
          .filter(
            (item) =>
              item.status ===
                "VISTO" ||
              item.status ===
                "RESOLVIDO",
          )
          .map(
            (item) =>
              String(
                item.alert_key,
              ),
          ),
      );
  }

  const novos =
    chavesUnicas.filter(
      (chave) =>
        !vistos.has(
          chave,
        ),
    ).length;

  return (
    <Link
      href="/admin/notificacoes"
      aria-label={
        novos > 0
          ? `${novos} nova(s) notificação(ões)`
          : "Notificações"
      }
      title={
        novos > 0
          ? `${novos} nova(s) notificação(ões)`
          : "Notificações"
      }
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d8e7dc] bg-white/85 text-[#176f3c] shadow-[0_8px_22px_rgba(23,111,60,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-[0_12px_28px_rgba(23,111,60,0.14)]"
    >
      <Bell
        size={18}
      />

      {novos > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[20px] min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[8px] font-black leading-none text-white shadow-sm">
          {novos > 99
            ? "99+"
            : novos}
        </span>
      )}
    </Link>
  );
}
