"use client";

import { useEffect } from "react";

export default function NotificationRetentionCleanup() {
  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/notificacoes/retencao", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    }).catch(() => {
      // Limpeza de retenção é silenciosa e não bloqueia a Central.
    });

    return () => controller.abort();
  }, []);

  return null;
}
