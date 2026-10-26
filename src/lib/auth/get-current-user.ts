import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type PerfilCodigo =
  | "ADMINISTRADOR"
  | "GESTOR"
  | "ESTOQUE"
  | "ENTREGADOR";

export async function getCurrentUserProfile() {
  /*
   * Estas informações dependem da sessão real do usuário.
   * Impede o Next.js de tentar pré-renderizar esta execução
   * durante o build.
   */
  await connection();

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId =
    typeof claimsData?.claims?.sub === "string"
      ? claimsData.claims.sub
      : null;

  if (claimsError || !userId) {
    return null;
  }

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select(`
      id,
      nome,
      email,
      ativo,
      perfil_id
    `)
    .eq("id", userId)
    .single();

  if (usuarioError || !usuario) {
    return null;
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("perfis")
    .select(`
      codigo,
      nome
    `)
    .eq("id", usuario.perfil_id)
    .single();

  if (perfilError || !perfil) {
    return null;
  }

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    ativo: usuario.ativo,
    perfilId: usuario.perfil_id,
    perfilCodigo: perfil.codigo as PerfilCodigo,
    perfilNome: perfil.nome,
  };
}
