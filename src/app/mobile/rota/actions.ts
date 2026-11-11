"use server";

import {
  revalidatePath,
} from "next/cache";

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

function destinoErro(
  mensagem:
    string,
) {
  return `/mobile/rota?erro=${encodeURIComponent(
    mensagem,
  )}`;
}


function mensagemFinalizacaoAmigavel(
  original:
    string | null | undefined,
) {
  const mensagem =
    String(
      original ??
        "",
    ).toLocaleLowerCase(
      "pt-BR",
    );

  if (
    mensagem.includes(
      "pendente",
    )
  ) {
    return "Ainda existem ações pendentes nesta rota. Resolva os itens indicados antes de finalizar.";
  }

  if (
    mensagem.includes(
      "rota",
    ) &&
    (
      mensagem.includes(
        "não encontrada",
      ) ||
      mensagem.includes(
        "nao encontrada",
      )
    )
  ) {
    return "A rota não está mais ativa. Atualize a tela para conferir a situação atual.";
  }

  return "Não foi possível finalizar a rota agora. Nenhuma alteração foi confirmada. Atualize a tela e confira as pendências.";
}

export async function iniciarMinhaRota() {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const permitido =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ROTA_MOBILE_GERENCIAR_PROPRIA,
    );

  if (!permitido) {
    redirect(
      "/mobile/sem-acesso",
    );
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "mobile_iniciar_rota_sem_carga_v106",
      {
        p_empresa_id:
          usuario.empresa.id,
      },
    );

  if (error) {
    redirect(
      destinoErro(
        error.message ||
          "Não foi possível iniciar sua rota.",
      ),
    );
  }

  const resultado =
    (
      data ??
      {}
    ) as {
      codigo?:
        string;
  };

  [
    "/mobile",
    "/mobile/rota",
    "/mobile/estoque",
    "/admin/rotas",
  ].forEach(
    (
      path,
    ) =>
      revalidatePath(
        path,
      ),
  );

  redirect(
    `/mobile/rota?ok=${encodeURIComponent(
      resultado.codigo
        ? `Rota ${resultado.codigo} iniciada.`
        : "Sua rota foi iniciada.",
    )}`,
  );
}

export async function encerrarMinhaRota(
  formData:
    FormData,
) {
  const usuario =
    await getCurrentUserProfile();

  if (!usuario) {
    redirect("/");
  }

  const permitido =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.ROTA_MOBILE_GERENCIAR_PROPRIA,
    );

  if (!permitido) {
    redirect(
      "/mobile/sem-acesso",
    );
  }

  const rotaId =
    Number(
      formData.get(
        "rota_id",
      ),
    );

  if (
    !Number.isInteger(
      rotaId,
    ) ||
    rotaId <=
      0
  ) {
    redirect(
      destinoErro(
        "Rota inválida.",
      ),
    );
  }

  const supabase =
    await createClient();

  /*
   * Rota montada pelo próprio entregador representa
   * venda em campo. A entrega física não encerra o
   * atendimento enquanto a venda/pagamento não for
   * registrada. Esta validação protege o fluxo da UI
   * antes de chamar a RPC de finalização da rota.
   */
  const {
    data: rota,
    error: rotaError,
  } =
    await supabase
      .from("rotas")
      .select(`
        id,
        origem
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "id",
        rotaId,
      )
      .eq(
        "entregador_id",
        usuario.id,
      )
      .in(
        "status",
        [
          "PLANEJADA",
          "EM_ROTA",
        ],
      )
      .maybeSingle();

  if (
    rotaError ||
    !rota
  ) {
    redirect(
      destinoErro(
        "Rota ativa não encontrada para este entregador.",
      ),
    );
  }

  const {
    data: paradasRota,
    error: paradasRotaError,
  } =
    await supabase
      .from(
        "rota_clientes",
      )
      .select(`
        id,
        status,
        observacao
      `)
      .eq(
        "empresa_id",
        usuario.empresa.id,
      )
      .eq(
        "rota_id",
        rotaId,
      );

  if (paradasRotaError) {
    console.error(
      "Erro ao validar checklist da rota:",
      paradasRotaError,
    );

    redirect(
      destinoErro(
        "Não foi possível conferir as pendências da rota. Atualize a tela e tente novamente.",
      ),
    );
  }

  const paradasPendentes =
    (
      paradasRota ??
      []
    ).filter(
      (item) =>
        item.status ===
          "PENDENTE" ||
        item.status ===
          "EM_ATENDIMENTO",
    );

  if (
    paradasPendentes.length >
    0
  ) {
    redirect(
      destinoErro(
        `Ainda existem ${paradasPendentes.length} atendimento(s) ou cobrança(s) pendente(s). Use o checklist da rota para concluir antes de finalizar.`,
      ),
    );
  }

  const idsParadasRota =
    (
      paradasRota ??
      []
    ).map(
      (item) =>
        Number(
          item.id,
        ),
    );

  if (
    idsParadasRota.length >
    0
  ) {
    const {
      data: fluxosAguardando,
      error: fluxosAguardandoError,
    } =
      await supabase
        .from(
          "venda_fluxos_campo",
        )
        .select(`
          id,
          rota_cliente_id
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "entregador_id",
          usuario.id,
        )
        .eq(
          "status",
          "AGUARDANDO_ENTREGA",
        )
        .in(
          "rota_cliente_id",
          idsParadasRota,
        );

    if (
      fluxosAguardandoError
    ) {
      console.error(
        "Erro ao validar vendas preparadas da rota:",
        fluxosAguardandoError,
      );

      redirect(
        destinoErro(
          "Não foi possível conferir as vendas preparadas desta rota. Atualize a tela e tente novamente.",
        ),
      );
    }

    if (
      (
        fluxosAguardando ??
        []
      ).length >
      0
    ) {
      redirect(
        destinoErro(
          `Existe(m) ${(fluxosAguardando ?? []).length} venda(s) preparada(s) aguardando bipagem/entrega. Finalize antes de encerrar a rota.`,
        ),
      );
    }
  }

  if (
    String(rota.origem) ===
    "MOBILE"
  ) {
    const podeRegistrarPagamento =
      usuario.configuracao
        .permitirPagamentoMobile &&
      (
        usuario.isPlatformAdmin ||
        temPermissao(
          usuario.permissoes,
          PERMISSOES.PAGAMENTO_REGISTRAR,
        )
      );

    if (
      !podeRegistrarPagamento
    ) {
      redirect(
        destinoErro(
          "Esta rota foi criada em campo e exige venda/pagamento. Habilite o pagamento mobile para concluir a operação.",
        ),
      );
    }

    const {
      data: paradasEntregues,
      error: paradasError,
    } =
      await supabase
        .from(
          "rota_clientes",
        )
        .select(`
          id
        `)
        .eq(
          "empresa_id",
          usuario.empresa.id,
        )
        .eq(
          "rota_id",
          rotaId,
        )
        .eq(
          "status",
          "ENTREGUE",
        );

    if (paradasError) {
      console.error(
        "Erro ao validar paradas entregues da rota mobile:",
        paradasError,
      );

      redirect(
        destinoErro(
          "Não foi possível validar as vendas pendentes da rota.",
        ),
      );
    }

    const paradaIds =
      (
        paradasEntregues ??
        []
      ).map(
        (item) =>
          Number(
            item.id,
          ),
      );

    if (
      paradaIds.length >
      0
    ) {
      const {
        data: entregas,
        error: entregasError,
      } =
        await supabase
          .from("entregas")
          .select(`
            id,
            rota_cliente_id
          `)
          .eq(
            "empresa_id",
            usuario.empresa.id,
          )
          .eq(
            "entregador_id",
            usuario.id,
          )
          .eq(
            "status",
            "CONCLUIDA",
          )
          .in(
            "rota_cliente_id",
            paradaIds,
          );

      if (entregasError) {
        console.error(
          "Erro ao validar entregas da rota mobile:",
          entregasError,
        );

        redirect(
          destinoErro(
            "Não foi possível validar as vendas pendentes da rota.",
          ),
        );
      }

      const entregaIds =
        (
          entregas ??
          []
        ).map(
          (item) =>
            Number(
              item.id,
            ),
        );

      let vendasEntregaIds =
        new Set<number>();

      if (
        entregaIds.length >
        0
      ) {
        const {
          data: vendas,
          error: vendasError,
        } =
          await supabase
            .from("vendas")
            .select(`
              entrega_id
            `)
            .eq(
              "empresa_id",
              usuario.empresa.id,
            )
            .in(
              "entrega_id",
              entregaIds,
            );

        if (vendasError) {
          console.error(
            "Erro ao validar vendas da rota mobile:",
            vendasError,
          );

          redirect(
            destinoErro(
              "Não foi possível validar as vendas pendentes da rota.",
            ),
          );
        }

        vendasEntregaIds =
          new Set(
            (
              vendas ??
              []
            ).map(
              (item) =>
                Number(
                  item.entrega_id,
                ),
            ),
          );
      }

      const entregasComVendaPendente =
        (
          entregas ??
          []
        ).filter(
          (item) =>
            !vendasEntregaIds.has(
              Number(
                item.id,
              ),
            ),
        );

      if (
        entregasComVendaPendente.length >
        0
      ) {
        redirect(
          destinoErro(
            `Existem ${entregasComVendaPendente.length} entrega(s) com venda/pagamento pendente. Conclua antes de encerrar a rota.`,
          ),
        );
      }
    }
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "mobile_finalizar_rota_propria",
      {
        p_empresa_id:
          usuario.empresa.id,

        p_rota_id:
          rotaId,
      },
    );

  if (error) {
    console.error(
      "Erro ao finalizar rota:",
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

    redirect(
      destinoErro(
        mensagemFinalizacaoAmigavel(
          error.message,
        ),
      ),
    );
  }

  const resultado =
    (
      data ??
      {}
    ) as {
      codigo?:
        string;
  };

  [
    "/mobile",
    "/mobile/rota",
    "/mobile/estoque",
    "/admin/rotas",
  ].forEach(
    (
      path,
    ) =>
      revalidatePath(
        path,
      ),
  );

  const rotaCodigo =
    resultado.codigo ??
    "";

  // V106.1: finalizar o itinerario nunca inicia devolucao nem fechamento de carga.
  redirect(
    `/mobile/rota?ok=${encodeURIComponent(
      rotaCodigo
        ? `Rota ${rotaCodigo} finalizada. Seu estoque móvel não foi devolvido ao CD.`
        : "Rota finalizada. Seu estoque móvel permanece disponível.",
    )}`,
  );
}