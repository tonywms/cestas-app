"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { registrarHomologacaoConcluida } from "../homologacao/actions";

/* V75_8_GATE_SYNC */

const ETAPAS = [
  "receber-carga",
  "executar-rota",
  "venda-entrega",
  "cobranca-recebimento",
  "retorno-avaria",
  "fechamento-financeiro",
  "acessos-permissoes",
] as const;

type Props = {
  empresaId: string;
  jaPersistida: boolean;
};

export default function HomologacaoGateSync({ empresaId, jaPersistida }: Props) {
  const router = useRouter();
  const executado = useRef(false);

  useEffect(() => {
    if (jaPersistida || executado.current) return;
    executado.current = true;

    try {
      const storageKey = `cestas-app:homologacao-operacional:${empresaId}`;
      const bruto = window.localStorage.getItem(storageKey);
      if (!bruto) return;

      const salvo = JSON.parse(bruto) as {
        marcadas?: unknown;
        finalizada?: unknown;
        atualizadoEm?: unknown;
      };

      if (!salvo.finalizada || !Array.isArray(salvo.marcadas)) return;

      const marcadas = Array.from(
        new Set(
          salvo.marcadas.filter(
            (item): item is string =>
              typeof item === "string" && ETAPAS.includes(item as (typeof ETAPAS)[number]),
          ),
        ),
      );

      if (marcadas.length !== ETAPAS.length) return;

      const concluidaEm =
        typeof salvo.atualizadoEm === "string"
          ? salvo.atualizadoEm
          : new Date().toISOString();

      void registrarHomologacaoConcluida({
        marcadas,
        concluidaEm,
        origem: "MIGRACAO_LOCAL_GATE_V75_8",
      }).then((resultado) => {
        if (resultado.success) router.refresh();
      });
    } catch {
      // O Gate continua funcionando pelas certificações técnicas.
    }
  }, [empresaId, jaPersistida, router]);

  return null;
}
