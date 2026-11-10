import { createServerClient } from "@supabase/ssr";
import { isConnectivityFailure } from "@/lib/auth/connectivity-error";
// V102_1_OFFLINE_SEM_LOGOUT
import {
  NextResponse,
  type NextRequest,
} from "next/server";

export async function updateSession(
  request:
    NextRequest,
) {
  let response =
    NextResponse.next({
      request,
    });

  // Atualizacoes de cookie so sao efetivadas apos confirmar ausencia de falha de rede.
  const cookieWrites: Array<() => void> = [];

  const supabase =
    createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(cookiesToSet, headers) {
            // O Supabase pode tentar apagar cookies ao falhar refresh offline.
            // Uma indisponibilidade de rede nao deve apagar a sessao do navegador.
            cookieWrites.push(() => {
              cookiesToSet.forEach(({ name, value }) => {
                request.cookies.set(name, value);
              });
              response = NextResponse.next({ request });
              cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options);
              });
              Object.entries(headers ?? {}).forEach(([key, value]) => {
                response.headers.set(key, value);
              });
            });
          },
        },
      },
    );

  let claimsError: unknown = null;
  try {
    const result = await supabase.auth.getClaims();
    claimsError = result.error;
  } catch (error) {
    claimsError = error;
  }
  if (isConnectivityFailure(claimsError)) {
    // Preserva a sessao existente; paginas protegidas fazem sua propria verificacao.
    // Nenhum cookie e criado nem removido nesta falha temporaria.
    response.headers.set("Cache-Control", "private, no-store");
  } else {
    for (const applyCookies of cookieWrites) applyCookies();
  }

  /*
   * Cabeçalhos de segurança básicos.
   * Não bloqueamos camera/geolocation porque o mobile pode usar ambos.
   */
  response.headers.set(
    "X-Content-Type-Options",
    "nosniff",
  );

  response.headers.set(
    "X-Frame-Options",
    "DENY",
  );

  response.headers.set(
    "Referrer-Policy",
    "same-origin",
  );

  response.headers.set(
    "Permissions-Policy",
    "microphone=(), payment=(), usb=()",
  );

  /*
   * A área global nunca deve ser armazenada em cache intermediário.
   */
  // CESTAS_V105_5_1_SESSAO: nunca armazenar HTML/RSC autenticado ou Set-Cookie no cache.
  // O Supabase usa cookies que podem ser atualizados pelo proxy.
  const rotaProtegida = /^\/(?:app|admin|mobile)(?:\/|$)/.test(request.nextUrl.pathname);
  const possuiCookieAuth = request.cookies.getAll().some(({ name }) =>
    /^sb-[a-z0-9_-]+-auth-token(?:\.\d+)?$/i.test(name)
  );
  if (rotaProtegida || possuiCookieAuth) {
    const vary = response.headers.get("Vary");
    if (!(vary || "").split(",").some((item) => item.trim().toLowerCase() === "cookie")) {
      response.headers.set("Vary", vary ? vary + ", Cookie" : "Cookie");
    }
    response.headers.set(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate, max-age=0",
    );

    response.headers.set(
      "Pragma",
      "no-cache",
    );

    response.headers.set(
      "Expires",
      "0",
    );
  }

  return response;
}
