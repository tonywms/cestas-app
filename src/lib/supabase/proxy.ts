import { createServerClient } from "@supabase/ssr";
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

  const supabase =
    createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(
            cookiesToSet,
            headers,
          ) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value,
                );
              },
            );

            response =
              NextResponse.next({
                request,
              });

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                response.cookies.set(
                  name,
                  value,
                  options,
                );
              },
            );

            Object.entries(
              headers,
            ).forEach(
              ([
                key,
                value,
              ]) => {
                response.headers.set(
                  key,
                  value,
                );
              },
            );
          },
        },
      },
    );

  await supabase.auth
    .getClaims();

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
  if (
    request.nextUrl.pathname
      .startsWith(
        "/admin/plataforma",
      )
  ) {
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
