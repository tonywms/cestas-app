"use server";

import {
  revalidatePath,
} from "next/cache";

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

export type EntregaVolumeState = {
  success: boolean;
  message: string;
  saldoAnterior: number | null;
  saldoAtual: number | null;
  quantidade: number;
};

export async function registrarEntregaVolume(
  _previousState:
    EntregaVolumeState,
  formData:
    FormData,
): Promise<EntregaVolumeState> {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    return {
      success: false,
      message:
        "Sessão inválida.",
      saldoAnterior: null,
      saldoAtual: null,
      quantidade: 0,
    };
  }

  if (
    usuario.configuracao
      .modoControleCarga !==
    "VOLUME"
  ) {
    return {
      success: false,
      message:
        "Esta empresa não opera por volume.",
      saldoAnterior: null,
      saldoAtual: null,
      quantidade: 0,
    };
  }

  const podeEntregar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ENTREGA_REALIZAR,
    );

  if (!podeEntregar) {
    return {
      success: false,
      message:
        "Você não possui permissão para realizar entregas.",
      saldoAnterior: null,
      saldoAtual: null,
      quantidade: 0,
    };
  }

  if (
    usuario.configuracao
      .exigirBipagemEntrega &&
    !usuario.isPlatformAdmin &&
    !temPermissao(
      usuario.permissoes,
      PERMISSOES.ENTREGA_BIPAR_VOLUME,
    )
  ) {
    return {
      success: false,
      message:
        "Você não possui permissão para bipar volumes na entrega.",
      saldoAnterior: null,
      saldoAtual: null,
      quantidade: 0,
    };
  }

  const cargaId =
    Number(
      formData.get(
        "carga_id",
      ),
    );

  const clienteId =
    Number(
      formData.get(
        "cliente_id",
      ),
    );

  const tipoCestaId =
    Number(
      formData.get(
        "tipo_cesta_id",
      ),
    );

  const quantidade =
    Number(
      formData.get(
        "quantidade",
      ),
    );

  const observacao =
    String(
      formData.get(
        "observacao",
      ) ?? "",
    ).trim();

  const rotaClienteRaw =
    String(
      formData.get(
        "rota_cliente_id",
      ) ?? "",
    ).trim();

  const rotaClienteId =
    rotaClienteRaw
      ? Number(
          rotaClienteRaw,
        )
      : null;

  let codigos:
    string[] = [];

  try {
    const raw =
      String(
        formData.get(
          "codigos_volume_json",
        ) ?? "[]",
      );

    const parsed =
      JSON.parse(raw);

    if (
      Array.isArray(
        parsed,
      )
    ) {
      codigos =
        parsed
          .map(
            (item) =>
              String(item)
                .trim()
                .toUpperCase(),
          )
          .filter(Boolean);
    }
  } catch {
    codigos = [];
  }

  if (
    !Number.isInteger(
      cargaId,
    ) ||
    cargaId <= 0 ||
    !Number.isInteger(
      clienteId,
    ) ||
    clienteId <= 0 ||
    !Number.isInteger(
      tipoCestaId,
    ) ||
    tipoCestaId <= 0
  ) {
    return {
      success: false,
      message:
        "Dados da entrega inválidos.",
      saldoAnterior: null,
      saldoAtual: null,
      quantidade: 0,
    };
  }

  const quantidadeFinal =
    usuario.configuracao
      .exigirBipagemEntrega
      ? codigos.length
      : quantidade;

  if (
    !Number.isInteger(
      quantidadeFinal,
    ) ||
    quantidadeFinal <= 0
  ) {
    return {
      success: false,
      message:
        usuario.configuracao
          .exigirBipagemEntrega
          ? "Bipe ao menos um volume."
          : "Informe uma quantidade válida.",
      saldoAnterior: null,
      saldoAtual: null,
      quantidade: 0,
    };
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "registrar_entrega_volume",
    {
      p_empresa_id:
        usuario.empresa.id,
      p_carga_id:
        cargaId,
      p_cliente_id:
        clienteId,
      p_tipo_cesta_id:
        tipoCestaId,
      p_quantidade:
        usuario.configuracao
          .exigirBipagemEntrega
          ? null
          : quantidadeFinal,
      p_codigos_volume:
        usuario.configuracao
          .exigirBipagemEntrega
          ? codigos
          : null,
      p_observacao:
        observacao || null,
      p_rota_cliente_id:
        rotaClienteId,
    },
  );

  if (error) {
    return {
      success: false,
      message:
        error.message ||
        "Não foi possível registrar a entrega rastreada.",
      saldoAnterior: null,
      saldoAtual: null,
      quantidade: 0,
    };
  }

  const resultado =
    data as {
      quantidade?: number;
      saldo_anterior?: number;
      saldo_atual?: number;
    };

  revalidatePath(
    "/mobile",
  );
  revalidatePath(
    "/mobile/carga",
  );
  revalidatePath(
    "/mobile/rota",
  );
  revalidatePath(
    "/mobile/entregas/volume",
  );
  revalidatePath(
    "/admin/rotas",
  );
  revalidatePath(
    "/admin/volumes",
  );

  return {
    success: true,
    message:
      `Entrega de ${Number(resultado.quantidade ?? quantidadeFinal)} cesta(s) registrada com rastreabilidade por volume.`,
    saldoAnterior:
      Number(
        resultado.saldo_anterior ??
        0,
      ),
    saldoAtual:
      Number(
        resultado.saldo_atual ??
        0,
      ),
    quantidade:
      Number(
        resultado.quantidade ??
        quantidadeFinal,
      ),
  };
}
