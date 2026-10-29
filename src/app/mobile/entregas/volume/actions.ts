"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user";
import { PERMISSOES, temPermissao } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import {
  mensagemBloqueioEntrega,
  validarCreditoCliente,
} from "@/lib/credito/validar-credito-cliente";

export type EntregaVolumeState = {
  success: boolean;
  message: string;
  quantidade: number;
  saldoAnterior: number | null;
  saldoAtual: number | null;
  rotaClienteId: number | null;
  entregaId: number | null;
};

const estado = (
  success: boolean,
  message: string,
  extras?: Partial<EntregaVolumeState>,
): EntregaVolumeState => ({
  success,
  message,
  quantidade: 0,
  saldoAnterior: null,
  saldoAtual: null,
  rotaClienteId: null,
  entregaId: null,
  ...extras,
});

export async function registrarEntregaVolume(
  _previousState: EntregaVolumeState,
  formData: FormData,
): Promise<EntregaVolumeState> {
  const usuario = await getCurrentUserProfile();

  if (!usuario) return estado(false, "Sessão inválida. Entre novamente.");

  if (usuario.configuracao.modoControleCarga !== "VOLUME") {
    return estado(false, "Esta empresa não está operando por VOLUME.");
  }

  const podeEntregar =
    usuario.isPlatformAdmin ||
    temPermissao(usuario.permissoes, PERMISSOES.ENTREGA_REALIZAR);

  if (!podeEntregar) {
    return estado(false, "Você não possui permissão para realizar entregas.");
  }

  const exigeBipagem = usuario.configuracao.exigirBipagemEntrega;

  if (
    exigeBipagem &&
    !usuario.isPlatformAdmin &&
    !temPermissao(usuario.permissoes, PERMISSOES.ENTREGA_BIPAR_VOLUME)
  ) {
    return estado(false, "Você não possui permissão para bipar volumes na entrega.");
  }

  const cargaId = Number(formData.get("carga_id"));
  const clienteId = Number(formData.get("cliente_id"));
  const tipoCestaId = Number(formData.get("tipo_cesta_id"));
  const rotaRaw = String(formData.get("rota_cliente_id") ?? "").trim();
  const rotaClienteId = rotaRaw ? Number(rotaRaw) : null;
  const observacao = String(formData.get("observacao") ?? "").trim();
  const quantidade = Number(formData.get("quantidade") ?? 0);

  const codigosVolume = formData
    .getAll("codigos_volume")
    .map((item) => String(item).trim().toUpperCase())
    .filter(Boolean);

  if (!Number.isInteger(cargaId) || cargaId <= 0) return estado(false, "Carga inválida.");
  if (!Number.isInteger(clienteId) || clienteId <= 0) return estado(false, "Cliente inválido.");
  if (!Number.isInteger(tipoCestaId) || tipoCestaId <= 0) return estado(false, "Selecione o tipo de cesta.");

  if (rotaClienteId !== null && (!Number.isInteger(rotaClienteId) || rotaClienteId <= 0)) {
    return estado(false, "Parada da rota inválida.");
  }

  if (exigeBipagem && codigosVolume.length === 0) {
    return estado(false, "Bipe ao menos um volume para concluir a entrega.");
  }

  if (exigeBipagem && new Set(codigosVolume).size !== codigosVolume.length) {
    return estado(false, "Existem volumes duplicados na conferência.");
  }

  if (!exigeBipagem && (!Number.isInteger(quantidade) || quantidade <= 0)) {
    return estado(false, "Informe uma quantidade válida.");
  }

  const validacaoCredito =
    await validarCreditoCliente({
      empresaId:
        usuario.empresa.id,
      clienteId,
    });

  if (!validacaoCredito.ok) {
    return estado(
      false,
      validacaoCredito.erro ??
        "Não foi possível validar o crédito do cliente.",
      {
        rotaClienteId,
      },
    );
  }

  if (
    validacaoCredito
      .avaliacao
      .bloqueado
  ) {
    return estado(
      false,
      mensagemBloqueioEntrega(
        validacaoCredito,
      ),
      {
        rotaClienteId,
      },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registrar_entrega_volume", {
    p_empresa_id: usuario.empresa.id,
    p_carga_id: cargaId,
    p_cliente_id: clienteId,
    p_tipo_cesta_id: tipoCestaId,
    p_quantidade: exigeBipagem ? null : quantidade,
    p_codigos_volume: exigeBipagem ? codigosVolume : null,
    p_observacao: observacao || null,
    p_rota_cliente_id: rotaClienteId,
  });

  if (error) {
    console.error("Erro registrar entrega por volume:", error.message, error.code, error.details, error.hint);
    return estado(false, error.message || "Não foi possível registrar a entrega.", { rotaClienteId });
  }

  const resultado = (data ?? {}) as {
    entrega_id?: number;
    quantidade?: number;
    saldo_anterior?: number;
    saldo_atual?: number;
    rota_cliente_id?: number | null;
  };

  const quantidadeEntregue = Number(
    resultado.quantidade ?? (exigeBipagem ? codigosVolume.length : quantidade),
  );

  [
    "/mobile",
    "/mobile/carga",
    "/mobile/rota",
    "/mobile/entregas/nova",
    "/mobile/entregas/volume",
    "/admin/cargas",
    "/admin/rotas",
    "/admin/volumes",
    "/admin/credito",
    `/admin/clientes/${clienteId}`,
  ].forEach((path) => revalidatePath(path));

  return estado(
    true,
    `Entrega de ${quantidadeEntregue} cesta(s) concluída com rastreabilidade por volume.`,
    {
      quantidade: quantidadeEntregue,
      saldoAnterior: resultado.saldo_anterior ?? null,
      saldoAtual: resultado.saldo_atual ?? null,
      rotaClienteId: resultado.rota_cliente_id ?? rotaClienteId,
      entregaId: Number(resultado.entrega_id ?? 0) || null,
    },
  );
}