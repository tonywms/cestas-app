import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  PERMISSOES,
  type PermissaoCodigo,
} from "@/lib/auth/permissions";

export type PerfilCodigo =
  | "ADMINISTRADOR"
  | "GESTOR"
  | "ESTOQUE"
  | "ENTREGADOR";

export type ModoControleCarga =
  | "QUANTIDADE"
  | "VOLUME";

export type CurrentUserProfile = {
  id: string;
  nome: string;
  email: string | null;
  ativo: boolean;

  perfilId: number;
  perfilCodigo: PerfilCodigo;
  perfilNome: string;

  empresa: {
    id: string;
    codigo: string;
    nomeFantasia: string;
    razaoSocial: string | null;
    cnpj: string | null;
    status: string;
    ativo: boolean;
  };

  configuracao: {
    modoControleCarga: ModoControleCarga;
    exigirBipagemCarga: boolean;
    exigirBipagemEntrega: boolean;
    permitirPagamentoMobile: boolean;
    permitirOcorrenciaMobile: boolean;
  };

  permissoes: PermissaoCodigo[];

  isPlatformAdmin: boolean;
};

export async function getCurrentUserProfile():
  Promise<CurrentUserProfile | null> {
  await connection();

  const supabase = await createClient();

  /*
   * 1. Usuario autenticado
   */
  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  const userId =
    typeof claimsData?.claims?.sub === "string"
      ? claimsData.claims.sub
      : null;

  if (claimsError || !userId) {
    return null;
  }

  /*
   * 2. Cadastro base do usuario
   */
  const {
    data: usuario,
    error: usuarioError,
  } = await supabase
    .from("usuarios")
    .select(`
      id,
      nome,
      email,
      ativo
    `)
    .eq("id", userId)
    .maybeSingle();

  if (
    usuarioError ||
    !usuario ||
    !usuario.ativo
  ) {
    return null;
  }

  /*
   * 3. Empresa ativa do usuario
   *
   * Nesta primeira versao o usuario opera
   * em uma empresa por vez.
   *
   * Futuramente podemos adicionar seletor
   * de empresa para usuarios multiempresa.
   */
  const {
    data: vinculo,
    error: vinculoError,
  } = await supabase
    .from("empresa_usuarios")
    .select(`
      empresa_id,
      perfil_id,
      ativo
    `)
    .eq("usuario_id", userId)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (
    vinculoError ||
    !vinculo
  ) {
    console.error(
      "Usuario sem empresa ativa:",
      vinculoError,
    );

    return null;
  }

  /*
   * 4. Busca dados principais em paralelo
   */
  const [
    empresaResult,
    perfilResult,
    configuracaoResult,
    platformAdminResult,
  ] = await Promise.all([
    supabase
      .from("empresas")
      .select(`
        id,
        codigo,
        nome_fantasia,
        razao_social,
        cnpj,
        status,
        ativo
      `)
      .eq("id", vinculo.empresa_id)
      .eq("ativo", true)
      .maybeSingle(),

    supabase
      .from("perfis")
      .select(`
        id,
        codigo,
        nome,
        ativo
      `)
      .eq("id", vinculo.perfil_id)
      .eq("ativo", true)
      .maybeSingle(),

    supabase
      .from("empresa_configuracoes")
      .select(`
        empresa_id,
        modo_controle_carga,
        exigir_bipagem_carga,
        exigir_bipagem_entrega,
        permitir_pagamento_mobile,
        permitir_ocorrencia_mobile
      `)
      .eq("empresa_id", vinculo.empresa_id)
      .maybeSingle(),

    supabase
      .from("plataforma_administradores")
      .select(`
        usuario_id,
        ativo
      `)
      .eq("usuario_id", userId)
      .eq("ativo", true)
      .maybeSingle(),
  ]);

  const empresa = empresaResult.data;
  const perfil = perfilResult.data;

  if (
    empresaResult.error ||
    !empresa ||
    !empresa.ativo ||
    empresa.status !== "ATIVA"
  ) {
    console.error(
      "Empresa invalida ou inativa:",
      empresaResult.error,
    );

    return null;
  }

  if (
    perfilResult.error ||
    !perfil
  ) {
    console.error(
      "Perfil nao encontrado:",
      perfilResult.error,
    );

    return null;
  }

  /*
   * Se nao existir configuracao ainda,
   * usa padrao seguro.
   */
  const configuracao = configuracaoResult.data ?? {
    modo_controle_carga: "QUANTIDADE",
    exigir_bipagem_carga: false,
    exigir_bipagem_entrega: false,
    permitir_pagamento_mobile: true,
    permitir_ocorrencia_mobile: true,
  };

  /*
   * 5. Busca catalogo e permissoes
   */
  const [
    permissoesResult,
    perfilPermissoesResult,
    usuarioPermissoesResult,
  ] = await Promise.all([
    supabase
      .from("permissoes")
      .select(`
        id,
        codigo,
        ativo
      `)
      .eq("ativo", true),

    supabase
      .from("perfil_permissoes")
      .select(`
        permissao_id,
        permitido
      `)
      .eq(
        "empresa_id",
        vinculo.empresa_id,
      )
      .eq(
        "perfil_id",
        vinculo.perfil_id,
      ),

    supabase
      .from("usuario_permissoes")
      .select(`
        permissao_id,
        permitido
      `)
      .eq(
        "empresa_id",
        vinculo.empresa_id,
      )
      .eq(
        "usuario_id",
        userId,
      ),
  ]);

  if (permissoesResult.error) {
    console.error(
      "Erro catalogo permissoes:",
      permissoesResult.error,
    );

    return null;
  }

  /*
   * permissao_id -> codigo
   */
  const permissoesPorId = new Map<
    string,
    PermissaoCodigo
  >();

  for (
    const permissao of
      permissoesResult.data ?? []
  ) {
    permissoesPorId.set(
      permissao.id,
      permissao.codigo as PermissaoCodigo,
    );
  }

  /*
   * 6. Permissoes do perfil
   */
  const permissoesEfetivas =
    new Set<PermissaoCodigo>();

  for (
    const item of
      perfilPermissoesResult.data ?? []
  ) {
    const codigo =
      permissoesPorId.get(
        item.permissao_id,
      );

    if (!codigo) {
      continue;
    }

    if (item.permitido) {
      permissoesEfetivas.add(codigo);
    }
  }

  /*
   * 7. Override individual
   *
   * permitido = true  -> concede
   * permitido = false -> revoga
   */
  for (
    const item of
      usuarioPermissoesResult.data ?? []
  ) {
    const codigo =
      permissoesPorId.get(
        item.permissao_id,
      );

    if (!codigo) {
      continue;
    }

    if (item.permitido) {
      permissoesEfetivas.add(codigo);
    } else {
      permissoesEfetivas.delete(codigo);
    }
  }

  /*
   * 8. CONFIGURACAO DA EMPRESA PREVALECE
   *
   * Empresa -> Perfil -> Usuario
   */

  const modoControleCarga =
    configuracao.modo_controle_carga as
      ModoControleCarga;

  /*
   * Empresa sem controle por volume:
   * scanner de volume fica indisponivel.
   */
  if (
    modoControleCarga !== "VOLUME"
  ) {
    permissoesEfetivas.delete(
      PERMISSOES.CARGA_BIPAR_VOLUME,
    );

    permissoesEfetivas.delete(
      PERMISSOES.ENTREGA_BIPAR_VOLUME,
    );
  }

  /*
   * Financeiro mobile desativado
   * pela empresa.
   */
  if (
    !configuracao.permitir_pagamento_mobile
  ) {
    permissoesEfetivas.delete(
      PERMISSOES.PAGAMENTO_REGISTRAR,
    );
  }

  /*
   * Ocorrencias mobile desativadas.
   */
  if (
    !configuracao.permitir_ocorrencia_mobile
  ) {
    permissoesEfetivas.delete(
      PERMISSOES.OCORRENCIA_REGISTRAR,
    );
  }

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    ativo: usuario.ativo,

    perfilId: perfil.id,
    perfilCodigo:
      perfil.codigo as PerfilCodigo,
    perfilNome: perfil.nome,

    empresa: {
      id: empresa.id,
      codigo: empresa.codigo,
      nomeFantasia:
        empresa.nome_fantasia,
      razaoSocial:
        empresa.razao_social,
      cnpj: empresa.cnpj,
      status: empresa.status,
      ativo: empresa.ativo,
    },

    configuracao: {
      modoControleCarga,
      exigirBipagemCarga:
        configuracao.exigir_bipagem_carga,
      exigirBipagemEntrega:
        configuracao.exigir_bipagem_entrega,
      permitirPagamentoMobile:
        configuracao.permitir_pagamento_mobile,
      permitirOcorrenciaMobile:
        configuracao.permitir_ocorrencia_mobile,
    },

    permissoes:
      Array.from(permissoesEfetivas),

    isPlatformAdmin:
      !!platformAdminResult.data?.ativo,
  };
}