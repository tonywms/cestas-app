"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import {
  PERMISSOES,
  temPermissao,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

type PermissoesActionState = {
  success: boolean;
  message: string;
};

const PERMISSOES_PROIBIDAS_ENTREGADOR = new Set<string>([
  PERMISSOES.EMPRESA_CONFIGURAR,
  PERMISSOES.PERMISSOES_GERENCIAR,
  PERMISSOES.USUARIOS_GERENCIAR,
]);

export async function salvarPermissoesEntregador(
  _previousState: PermissoesActionState,
  formData: FormData,
): Promise<PermissoesActionState> {
  const usuario = await getCurrentUserProfile();

  if (!usuario) {
    return {
      success: false,
      message: "Sessão inválida. Entre novamente no sistema.",
    };
  }

  const podeGerenciar =
    usuario.isPlatformAdmin ||
    temPermissao(
      usuario.permissoes,
      PERMISSOES.PERMISSOES_GERENCIAR,
    );

  if (!podeGerenciar) {
    return {
      success: false,
      message: "Você não possui permissão para gerenciar acessos.",
    };
  }

  const supabase = await createClient();

  const {
    data: perfil,
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

  if (perfilError || !perfil) {
    console.error(
      "Perfil ENTREGADOR não encontrado:",
      perfilError,
    );

    return {
      success: false,
      message: "Perfil ENTREGADOR não encontrado.",
    };
  }

  const {
    data: catalogo,
    error: catalogoError,
  } = await supabase
    .from("permissoes")
    .select(`
      id,
      codigo,
      ativo
    `)
    .eq("ativo", true);

  if (catalogoError || !catalogo) {
    console.error(
      "Erro ao consultar catálogo de permissões:",
      catalogoError,
    );

    return {
      success: false,
      message: "Não foi possível carregar as permissões.",
    };
  }

  const solicitadas = new Set(
    formData
      .getAll("permissoes")
      .map((item) => String(item)),
  );

  const registros = catalogo.map((permissao) => {
    const codigo = permissao.codigo;

    let permitido = solicitadas.has(codigo);

    /*
     * ENTREGADOR nunca poderá receber
     * poderes administrativos.
     */
    if (
      PERMISSOES_PROIBIDAS_ENTREGADOR.has(codigo)
    ) {
      permitido = false;
    }

    /*
     * Empresa em QUANTIDADE não utiliza
     * identificação individual de volume.
     */
    if (
      usuario.configuracao.modoControleCarga !== "VOLUME" &&
      (
        codigo === PERMISSOES.CARGA_BIPAR_VOLUME ||
        codigo === PERMISSOES.ENTREGA_BIPAR_VOLUME
      )
    ) {
      permitido = false;
    }

    /*
     * Financeiro mobile desativado
     * na configuração da empresa.
     */
    if (
      !usuario.configuracao.permitirPagamentoMobile &&
      codigo === PERMISSOES.PAGAMENTO_REGISTRAR
    ) {
      permitido = false;
    }

    /*
     * Ocorrências mobile desativadas.
     */
    if (
      !usuario.configuracao.permitirOcorrenciaMobile &&
      codigo === PERMISSOES.OCORRENCIA_REGISTRAR
    ) {
      permitido = false;
    }

    return {
      empresa_id: usuario.empresa.id,
      perfil_id: perfil.id,
      permissao_id: permissao.id,
      permitido,
      updated_at: new Date().toISOString(),
    };
  });

  const { error: salvarError } = await supabase
    .from("perfil_permissoes")
    .upsert(registros, {
      onConflict: "empresa_id,perfil_id,permissao_id",
    });

  if (salvarError) {
    console.error(
      "Erro ao salvar permissões do entregador:",
      salvarError,
    );

    return {
      success: false,
      message:
        "Não foi possível salvar as permissões do entregador.",
    };
  }

  const quantidadeAtiva = registros.filter(
    (item) => item.permitido,
  ).length;

  revalidatePath("/admin");
  revalidatePath("/admin/permissoes");
  revalidatePath("/admin/acesso");
  revalidatePath("/admin/configuracoes");
  revalidatePath("/mobile");
  revalidatePath("/mobile/carga");
  revalidatePath("/app");

  return {
    success: true,
    message: `${quantidadeAtiva} permissões do perfil ENTREGADOR foram ativadas.`,
  };
}