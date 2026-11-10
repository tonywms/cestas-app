"use client";

import { useRef, useState, type FormEvent } from "react";
import { useConectividadeMobile } from "@/lib/mobile/use-conectividade";
import {
  salvarEntregaOffline, type DadosEntregaOffline, type EntregaPendenteOffline,
} from "@/lib/mobile/offline-entregas";

type TipoSaldo = { id: number; saldo: number };
type Cliente = { id: number; nome: string };
export function useRegistrarEntregaOffline({
  empresaId, usuarioId, cargaId, cargaCodigo, modo, clientes, saldos,
  exigirBipagem = false, vendaObrigatoria = false,
}: {
  empresaId: string; usuarioId: string;
  cargaId: number; cargaCodigo: string; modo: "QUANTIDADE" | "VOLUME";
  clientes: Cliente[]; saldos: TipoSaldo[];
  exigirBipagem?: boolean; vendaObrigatoria?: boolean;
}) {
  const { conectado } = useConectividadeMobile();
  const ocupado = useRef(false);
  const [salvandoOffline, setSalvandoOffline] = useState(false);
  const [jaSalvouOffline, setJaSalvouOffline] = useState(false);
  const [avisoOffline, setAvisoOffline] = useState("");
  const [erroOffline, setErroOffline] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    // A rota online mantém as Server Actions originais e suas validacoes.
    // Somente falta de conexao troca o envio pela fila persistente.
    if (conectado && !jaSalvouOffline) return;
    event.preventDefault();
    if (ocupado.current) return;
    if (jaSalvouOffline) {
      setErroOffline(false);
      setAvisoOffline("Esta entrega já foi salva no aparelho. Acompanhe a fila antes de iniciar outra operação.");
      return;
    }
    ocupado.current = true;
    setSalvandoOffline(true);
    const form = event.currentTarget;
    try {
      const data = new FormData(form);
      const numero = (field: string) => Number(String(data.get(field) ?? ""));
      const clienteId = numero("cliente_id");
      const tipoCestaId = numero("tipo_cesta_id");
      const rawRota = String(data.get("rota_cliente_id") ?? "").trim();
      const rotaClienteId = rawRota ? Number(rawRota) : null;
      const codigosVolume = data.getAll("codigos_volume")
        .map(v => String(v).trim().toUpperCase()).filter(Boolean);
      const quantidade = modo === "VOLUME" && exigirBipagem
        ? codigosVolume.length : numero("quantidade");
      const codigoUnico = new Set(codigosVolume);
      const saldo = saldos.find(item => item.id === tipoCestaId)?.saldo;
      if (!Number.isSafeInteger(clienteId) || clienteId < 1 ||
          !Number.isSafeInteger(tipoCestaId) || tipoCestaId < 1 ||
          !Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > 200 ||
          (rotaClienteId !== null && (!Number.isSafeInteger(rotaClienteId) || rotaClienteId < 1))) {
        throw new Error("Selecione um cliente, uma cesta e uma quantidade válidos.");
      }
      if (typeof saldo !== "number" || saldo < quantidade) {
        throw new Error("Quantidade maior que o saldo consultado da carga.");
      }
      if (exigirBipagem && modo === "VOLUME" &&
          (codigoUnico.size !== quantidade || quantidade === 0)) {
        throw new Error("Bipe cada volume uma única vez antes de salvar.");
      }
      if (!exigirBipagem && codigosVolume.length > 0) {
        throw new Error("Esta modalidade não permite códigos de volume.");
      }
      const observacao = String(data.get("observacao") ?? "").trim();
      if (observacao.length > 500) throw new Error("Observação ultrapassa 500 caracteres.");
      const nomeCliente = clientes.find(item => item.id === clienteId)?.nome;
      if (!nomeCliente) throw new Error("Cliente não está na lista previamente carregada.");
      const payload: DadosEntregaOffline = {
        modo, cargaId, clienteId, tipoCestaId, quantidade, codigosVolume,
        rotaClienteId, observacao,
      };
      const registro: EntregaPendenteOffline = {
        id: crypto.randomUUID(), empresaId, usuarioId, criadoEm: new Date().toISOString(),
        status: "pendente", erro: null, clienteNome: nomeCliente, cargaCodigo, dados: payload,
      };
      await salvarEntregaOffline(registro, saldo);
      setJaSalvouOffline(true);
      setErroOffline(false);
      setAvisoOffline(
        "Entrega salva neste aparelho. O saldo no banco ainda NÃO foi baixado. " +
        "Ao voltar o 5G/Wi-Fi, o aplicativo validará crédito, estoque e volumes e sincronizará." +
        (vendaObrigatoria ? " Atenção: a venda/pagamento deverá ser concluída após a confirmação." : ""),
      );
    } catch (error) {
      setErroOffline(true);
      setAvisoOffline(error instanceof Error ? error.message : "Erro ao gravar no aparelho. Tente novamente.");
    } finally {
      ocupado.current = false;
      setSalvandoOffline(false);
    }
  }
  return { onSubmit, conectado, salvandoOffline, jaSalvouOffline, avisoOffline, erroOffline };
}
