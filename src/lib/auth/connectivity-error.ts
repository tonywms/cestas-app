/* V102_1_OFFLINE_SEM_LOGOUT - Classificacao conservadora de indisponibilidade da autenticacao. */
export function isConnectivityFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { name?: unknown; message?: unknown; code?: unknown; status?: unknown; cause?: unknown };
  if (value.name === "AuthRetryableFetchError") return true;
  const status = typeof value.status === "number" ? value.status : undefined;
  if (status === 0 || status === 408 || status === 429 || (status !== undefined && status >= 500)) return true;
  const msg = [value.name, value.message, value.code, typeof value.cause === "object" && value.cause !== null ? (value.cause as { message?: unknown }).message : undefined]
    .filter((part): part is string => typeof part === "string")
    .join(" ");
  return /failed to fetch|fetch failed|network(?: request| error)?|ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|timeout|connection terminated|socket hang up|TypeError: Load failed/i.test(msg);
}
export function assertRemoteRead(error: unknown): void {
  if (error) {
    // Falha de rede ou banco nao equivale a usuario sem autenticacao/autorizacao.
    // O erro sobe para o boundary, SEM entregar dados ou liberar operacoes.
    throw new Error("CESTAS_SERVICO_TEMPORARIAMENTE_INDISPONIVEL");
  }
}
