"use server";

// V61_AVARIA_RASTREAVEL - validacao server-side e motivo no payload do RPC.
// V61_3_MODAL_API_FLOW - usado pela API para preservar modais no cliente.

import {
  revalidatePath,
} from "next/cache";

import {
  PERMISSOES,
} from "@/lib/auth/permissions";

import {
  requirePermission,
} from "@/lib/auth/require-permission";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  getCargaAtiva,
} from "@/services/cargas/get-carga-ativa";

export type FecharCargaState = {
  success: boolean;
  // Resposta positiva vinculada a carga que foi efetivamente finalizada.
  cargaId?: number;
  message: string;
  totalEmPosse: number;
  totalRetornado: number;
  totalAvariado: number;
  nextHref?: string | null;
  nextLabel?: string | null;
  reason?:
    | "ROTA_ATIVA"
    | "JORNADA_NAO_FINALIZADA"
    | "BIPAGEM_PENDENTE"
    | "VENDA_PENDENTE"
    | "DIVERGENCIA_VOLUME"
    | "DADOS_INVALIDOS"
    | null;
};

function estadoErro(
  message: string,
  extras?: Partial<FecharCargaState>,
): FecharCargaState {
  return {
    success: false,
    message,
    totalEmPosse: 0,
    totalRetornado: 0,
    totalAvariado: 0,
    ...extras,
  };
}

function mensagemErroAmigavel(
  original:
    string | null | undefined,
) {
  const texto =
    String(
      original ??
        "",
    ).toLocaleLowerCase(
      "pt-BR",
    );

  if (
    texto.includes("rota vinculada") &&
    texto.includes("finaliz")
  ) {
    return "Finalize uma rota vinculada a esta carga antes de fechar ou informar retorno.";
  }

  if (
    texto.includes(
      "rota",
    ) &&
    texto.includes(
      "ativa",
    )
  ) {
    return "A rota ainda está aberta. Finalize os atendimentos antes de fechar a carga.";
  }

  if (
    texto.includes(
      "retorn",
    ) ||
    texto.includes(
      "avaria",
    )
  ) {
    return "A classificação física não confere com o saldo da carga. Atualize a tela e confira novamente.";
  }

  if (
    texto.includes(
      "saldo",
    )
  ) {
    return "O saldo da carga mudou durante a operação. Atualize a tela antes de confirmar o fechamento.";
  }

  return "Não foi possível finalizar a carga agora. Nenhuma movimentação foi confirmada. Atualize a tela e confira as pendências.";
}

export async function fecharCarga(
  _previousState:
    FecharCargaState,
  formData:
    FormData,
): Promise<FecharCargaState> {
  const usuario =
    await requirePermission(
      PERMISSOES.CARGA_RETORNAR,
    );

  const cargaId =
    Number(
      formData.get(
        "carga_id",
      ),
    );

  const motivoAvaria =
    String(
      formData.get(
        "motivo_avaria",
      ) ??
        "",
    )
      .trim()
      .slice(
        0,
        500,
      );

  let volumesAvariadosInformados:
    string[] = [];

  try {
    const bruto =
      String(
        formData.get(
          "volumes_avariados",
        ) ??
          "[]",
      );

    const parsed =
      JSON.parse(
        bruto,
      ) as unknown;

    if (
      Array.isArray(
        parsed,
      )
    ) {
      volumesAvariadosInformados =
        Array.from(
          new Set(
            parsed
              .filter(
                (
                  valor,
                ): valor is string =>
                  typeof valor ===
                    "string" &&
                  valor.length >
                    0,
              )
              .map(
                (valor) =>
                  valor.trim(),
              ),
          ),
        );
    }
  } catch {
    return estadoErro(
      "A identificação dos volumes avariados é inválida. Atualize a tela e faça a conferência novamente.",
      {
        reason:
          "DADOS_INVALIDOS",
      },
    );
  }

  if (
    !Number.isInteger(
      cargaId,
    ) ||
    cargaId <= 0
  ) {
    return estadoErro(
      "A carga informada não é válida. Volte para Minha Carga e tente novamente.",
      {
        nextHref:
          "/mobile/carga",
        nextLabel:
          "Voltar para Minha Carga",
        reason:
          "DADOS_INVALIDOS",
      },
    );
  }

  const {
    carga,
    erro,
  } = await getCargaAtiva({
    entregadorId:
      usuario.id,

    empresaId:
      usuario.empresa.id,
  });

  if (
    erro ||
    !carga ||
    carga.id !==
      cargaId
  ) {
    return estadoErro(
      "A carga ativa não foi encontrada ou já foi alterada. Atualize Minha Carga antes de continuar.",
      {
        nextHref:
          "/mobile/carga",
        nextLabel:
          "Atualizar Minha Carga",
        reason:
          "DADOS_INVALIDOS",
      },
    );
  }

  const saldoPorItem =
    new Map(
      carga.carga_itens.map(
        (item) => [
          item.id,
          Math.max(
            0,
            item.quantidade_carregada -
              item.quantidade_entregue -
              item.quantidade_retornada -
              item.quantidade_avariada,
          ),
        ],
      ),
    );

  const totalEmPosse =
    Array.from(
      saldoPorItem.values(),
    ).reduce(
      (
        total,
        saldo,
      ) =>
        total +
        saldo,
      0,
    );

  const itens =
    carga.carga_itens.map(
      (item) => {
        const saldo =
          saldoPorItem.get(
            item.id,
          ) ?? 0;

        const avaria =
          Number(
            formData.get(
              `avaria_${item.id}`,
            ) ??
              0,
          );

        return {
          carga_item_id:
            item.id,
          tipo_cesta_id:
            item.tipos_cesta?.id ?? 0,
          saldo,
          quantidade_avariada:
            avaria,
          quantidade_retornada:
            saldo -
            avaria,
          motivo_avaria:
            avaria > 0
              ? motivoAvaria
              : null,
        };
      },
    );

  for (
    const item of itens
  ) {
    if (
      !Number.isInteger(
        item.quantidade_avariada,
      ) ||
      item.quantidade_avariada <
        0 ||
      item.quantidade_avariada >
        item.saldo
    ) {
      return estadoErro(
        "A quantidade de avarias é maior que o saldo disponível. Confira a carga antes de finalizar.",
        {
          totalEmPosse,
          reason:
            "DADOS_INVALIDOS",
        },
      );
    }
  }

  if (itens.some((item) => !Number.isInteger(item.tipo_cesta_id) || item.tipo_cesta_id <= 0)) {
    return estadoErro("Tipo de cesta indisponível em um dos itens da carga. Atualize Minha Carga antes de fechar.", {
      totalEmPosse,
      reason: "DADOS_INVALIDOS",
    });
  }

  const totalAvariado =
    itens.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.quantidade_avariada,
      0,
    );

  if (
    totalAvariado > 0 &&
    motivoAvaria.length < 8
  ) {
    return estadoErro(
      "Informe o motivo da avaria com pelo menos 8 caracteres antes de finalizar a carga.",
      {
        totalEmPosse,
        reason:
          "DADOS_INVALIDOS",
      },
    );
  }

  const totalRetornado =
    itens.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.quantidade_retornada,
      0,
    );

  if (
    totalRetornado +
      totalAvariado !==
    totalEmPosse
  ) {
    return estadoErro(
      "A classificação não corresponde ao saldo em posse. Atualize a tela e confira novamente.",
      {
        totalEmPosse,
        reason:
          "DADOS_INVALIDOS",
      },
    );
  }

  const supabase =
    await createClient();

  const {
    data: rotaAtiva,
    error: rotaAtivaError,
  } = await supabase
    .from("rotas")
    .select("id, codigo, status")
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "entregador_id",
      usuario.id,
    )
    .eq("carga_id", carga.id)
    .in(
      "status",
      [
        "PLANEJADA",
        "EM_ROTA",
      ],
    )
    .order(
      "created_at",
      {
        ascending:
          false,
      },
    )
    .limit(1)
    .maybeSingle();

  if (rotaAtivaError) {
    console.error(
      "Erro ao verificar rota ativa antes do fechamento:",
      rotaAtivaError,
    );

    return estadoErro(
      "Não foi possível confirmar se a rota está encerrada. Atualize a tela antes de finalizar a carga.",
      {
        totalEmPosse,
        nextHref:
          "/mobile/rota",
        nextLabel:
          "Ver Minha Rota",
        reason:
          "ROTA_ATIVA",
      },
    );
  }

  if (rotaAtiva) {
    return estadoErro(
      rotaAtiva.codigo
        ? `A rota ${rotaAtiva.codigo} ainda está ativa. Finalize os atendimentos antes de fechar a carga.`
        : "Existe uma rota ativa. Finalize os atendimentos antes de fechar a carga.",
      {
        totalEmPosse,
        nextHref:
          "/mobile/rota",
        nextLabel:
          "Ir para Minha Rota",
        reason:
          "ROTA_ATIVA",
      },
    );
  }

  // V61_4_SERVER_GATE_POS_JORNADA
  const {
    data: rotaFinalizadaDaCarga,
    error: rotaFinalizadaError,
  } = await supabase
    .from("rotas")
    .select("id, codigo, status, carga_id, finalizada_at")
    .eq("empresa_id", usuario.empresa.id)
    .eq("entregador_id", usuario.id)
    .eq("carga_id", carga.id)
    .eq("status", "FINALIZADA")
    .not("finalizada_at", "is", null)
    .order("finalizada_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (rotaFinalizadaError) {
    console.error(
      "Erro ao verificar jornada finalizada antes do fechamento:",
      rotaFinalizadaError,
    );

    return estadoErro(
      "Não foi possível confirmar a jornada desta carga. Atualize Minha Rota antes de tentar fechar a carga.",
      {
        totalEmPosse,
        nextHref:
          "/mobile/rota",
        nextLabel:
          "Ver Minha Rota",
        reason:
          "JORNADA_NAO_FINALIZADA",
      },
    );
  }

  if (!rotaFinalizadaDaCarga) {
    return estadoErro(
      "Esta carga ainda não possui uma rota vinculada finalizada. Inicie e conclua a jornada antes de informar retorno ou avaria.",
      {
        totalEmPosse,
        nextHref:
          "/mobile/rota",
        nextLabel:
          "Ir para Minha Rota",
        reason:
          "JORNADA_NAO_FINALIZADA",
      },
    );
  }

  const {
    count: fluxosPendentes,
    error: fluxosPendentesError,
  } = await supabase
    .from(
      "venda_fluxos_campo",
    )
    .select(
      "id",
      {
        count:
          "exact",
        head:
          true,
      },
    )
    .eq(
      "empresa_id",
      usuario.empresa.id,
    )
    .eq(
      "entregador_id",
      usuario.id,
    )
    .eq("carga_id", carga.id)
    .eq(
      "status",
      "AGUARDANDO_ENTREGA",
    );

  if (
    fluxosPendentesError
  ) {
    console.error(
      "Erro ao validar vendas pendentes antes do fechamento:",
      fluxosPendentesError,
    );

    return estadoErro(
      "Não foi possível conferir as vendas pendentes. Atualize a rota antes de fechar a carga.",
      {
        totalEmPosse,
        nextHref:
          "/mobile/rota",
        nextLabel:
          "Ver Minha Rota",
        reason:
          "VENDA_PENDENTE",
      },
    );
  }

  if (
    (fluxosPendentes ?? 0) >
    0
  ) {
    return estadoErro(
      `Existe${(fluxosPendentes ?? 0) === 1 ? "" : "m"} ${fluxosPendentes ?? 0} venda(s) aguardando entrega. Conclua antes de fechar a carga.`,
      {
        totalEmPosse,
        nextHref:
          "/mobile/rota",
        nextLabel:
          "Resolver na rota",
        reason:
          "VENDA_PENDENTE",
      },
    );
  }

  const modoVolume =
    usuario.configuracao
      .modoControleCarga ===
    "VOLUME";

  const exigeBipagemCarga =
    modoVolume &&
    usuario.configuracao
      .exigirBipagemCarga;

  const volumesAvariadosValidados = new Map<string, number>();

  if (modoVolume) {
    const [
      volumesEmPosseResult,
      volumesEsperadosResult,
      bipagensResult,
    ] = await Promise.all([
      supabase
        .from(
          "cesta_volumes",
        )
        .select(
          "id, tipo_cesta_id",
          {
            count:
              "exact",
          },
        )
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "carga_id",
          carga.id,
        )
        .eq(
          "status",
          "EM_CARGA",
        ),

      supabase
        .from(
          "cesta_volumes",
        )
        .select(
          "id",
          {
            count:
              "exact",
            head:
              true,
          },
        )
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "carga_id",
          carga.id,
        ),

      exigeBipagemCarga
        ? supabase
            .from(
              "carga_volume_bipagens",
            )
            .select(
              "id",
              {
                count:
                  "exact",
                head:
                  true,
              },
            )
            .eq(
              "empresa_id",
              usuario.empresa.id,
            )
            .eq(
              "carga_id",
              carga.id,
            )
        : Promise.resolve({
            count:
              null,
            error:
              null,
          }),
    ]);

    if (
      volumesEmPosseResult.error ||
      volumesEsperadosResult.error ||
      bipagensResult.error
    ) {
      console.error(
        "Erro ao validar volumes antes do fechamento:",
        {
          emPosse:
            volumesEmPosseResult.error,
          esperados:
            volumesEsperadosResult.error,
          bipagens:
            bipagensResult.error,
        },
      );

      return estadoErro(
        "Não foi possível conferir os volumes físicos da carga. Atualize Minha Carga e tente novamente.",
        {
          totalEmPosse,
          nextHref:
            "/mobile/carga",
          nextLabel:
            "Atualizar Minha Carga",
          reason:
            "DIVERGENCIA_VOLUME",
        },
      );
    }

    const volumesEmPosse =
      volumesEmPosseResult.count ??
      0;

    const volumesEsperados =
      volumesEsperadosResult.count ??
      0;

    const volumesConfirmados =
      exigeBipagemCarga
        ? bipagensResult.count ??
          0
        : volumesEsperados;

    if (
      exigeBipagemCarga &&
      volumesEsperados > 0 &&
      volumesConfirmados <
        volumesEsperados
    ) {
      return estadoErro(
        `A carga ainda não foi totalmente conferida: ${volumesConfirmados} de ${volumesEsperados} volume(s) confirmados.`,
        {
          totalEmPosse,
          nextHref:
            "/mobile/carga/receber",
          nextLabel:
            "Conferir volumes",
          reason:
            "BIPAGEM_PENDENTE",
        },
      );
    }

    if (
      volumesEmPosse !==
      totalEmPosse
    ) {
      return estadoErro(
        `O saldo físico não confere: a carga indica ${totalEmPosse} cesta(s) em posse, mas existem ${volumesEmPosse} volume(s) ativos.`,
        {
          totalEmPosse,
          nextHref:
            "/mobile/carga",
          nextLabel:
            "Conferir Minha Carga",
          reason:
            "DIVERGENCIA_VOLUME",
        },
      );
    }

    if (
      volumesAvariadosInformados.length !==
      totalAvariado
    ) {
      return estadoErro(
        "A quantidade de avarias não confere com os volumes físicos identificados. Bipe novamente os volumes avariados.",
        {
          totalEmPosse,
          reason:
            "DIVERGENCIA_VOLUME",
        },
      );
    }

    if (
      volumesAvariadosInformados.length >
      0
    ) {
      const {
        data:
          volumesAvariadosBanco,
        error:
          volumesAvariadosError,
      } = await supabase
        .from(
          "cesta_volumes",
        )
        .select(
          "id, codigo_volume, tipo_cesta_id, status",
        )
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "carga_id",
          carga.id,
        )
        .eq(
          "status",
          "EM_CARGA",
        )
        .in(
          "id",
          volumesAvariadosInformados,
        );

      if (
        volumesAvariadosError ||
        (
          volumesAvariadosBanco ??
          []
        ).length !==
          volumesAvariadosInformados.length
      ) {
        console.error(
          "Erro ao validar volumes avariados V82:",
          volumesAvariadosError,
        );

        return estadoErro(
          "Um ou mais volumes marcados como avariados já não pertencem ao saldo físico desta carga. Atualize a tela e confira novamente.",
          {
            totalEmPosse,
            reason:
              "DIVERGENCIA_VOLUME",
          },
        );
      }

      for (const volume of volumesAvariadosBanco ?? []) {
        volumesAvariadosValidados.set(volume.id, volume.tipo_cesta_id);
      }

      for (
        const item of itens
      ) {
        const quantidadeFisica =
          (
            volumesAvariadosBanco ??
            []
          ).filter(
            (volume) =>
              volume.tipo_cesta_id ===
              item.tipo_cesta_id,
          ).length;

        if (
          quantidadeFisica !==
          item.quantidade_avariada
        ) {
          return estadoErro(
            "A identificação física das avarias não corresponde ao tipo de cesta informado. Atualize e confira os volumes novamente.",
            {
              totalEmPosse,
              reason:
                "DIVERGENCIA_VOLUME",
            },
          );
        }
      }
    }
  } else if (
    volumesAvariadosInformados.length >
    0
  ) {
    return estadoErro(
      "A identificação por volume só pode ser usada quando a empresa opera no modo VOLUME.",
      {
        totalEmPosse,
        reason:
          "DADOS_INVALIDOS",
      },
    );
  }

  const payload =
    itens.map(
      (item) => ({
        carga_item_id:
          item.carga_item_id,
        quantidade_retornada:
          item.quantidade_retornada,
        quantidade_avariada:
          item.quantidade_avariada,
        motivo_avaria:
          item.quantidade_avariada > 0
            ? item.motivo_avaria
            : null,
        volumes_avariados:
          modoVolume
            ? volumesAvariadosInformados.filter(
                (volumeId) => volumesAvariadosValidados.get(volumeId) === item.tipo_cesta_id,
              )
            : [],
      }),
    );

  const {
    data,
    error,
  } = await supabase.rpc(
    "finalizar_carga_estoque",
    {
      p_empresa_id:
        usuario.empresa.id,

      p_carga_id:
        carga.id,

      p_itens:
        payload,
    },
  );

  if (error) {
    console.error(
      "Erro fechar carga:",
      {
        message:
          error.message,
        code:
          error.code,
        details:
          error.details,
        hint:
          error.hint,
      },
    );

    return estadoErro(
      mensagemErroAmigavel(
        error.message,
      ),
      {
        totalEmPosse,
      },
    );
  }

  const resultado =
    Array.isArray(data)
      ? data[0]
      : data;

  [
    "/mobile",
    "/mobile/carga",
    "/mobile/rota",
    "/admin/estoque",
    "/admin/cargas",
  ].forEach(
    (path) =>
      revalidatePath(
        path,
      ),
  );

  return {
    success: true,
    cargaId: carga.id,
    message:
      "Carga finalizada. O retorno voltou ao estoque central e as avarias ficaram registradas no histórico.",
    totalEmPosse,
    totalRetornado:
      Number(
        resultado
          ?.total_retornado ??
          totalRetornado,
      ),
    totalAvariado:
      Number(
        resultado
          ?.total_avariado ??
          totalAvariado,
      ),
  };
}