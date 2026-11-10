// V102_2_HEARTBEAT_REAL: status de conectividade do backend, sem consultar dados do usuario.
// Endpoint publico de diagnostico: usa somente a chave publicavel Supabase e nao retorna segredos.

const headers = { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" };

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !chave) {
    return Response.json({ online: false }, { status: 503, headers });
  }

  try {
    const destino = new URL("/auth/v1/health", base);
    if (destino.protocol !== "https:" && destino.protocol !== "http:") {
      return Response.json({ online: false }, { status: 503, headers });
    }
    // A chamada e feita no servidor: sem CORS no browser e sem tokens de usuario.
    const resposta = await fetch(destino.toString(), {
      method: "GET",
      headers: { apikey: chave, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(3500),
      redirect: "error",
    });
    return Response.json({ online: resposta.ok }, { status: resposta.ok ? 200 : 503, headers });
  } catch {
    return Response.json({ online: false }, { status: 503, headers });
  }
}
