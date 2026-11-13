import type { NextConfig } from "next";

// Falhar no BUILD em vez de publicar uma tela de login sem configuracao.
if (process.env.VERCEL === "1") {
  for (const variavel of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ] as const) {
    if (!process.env[variavel]?.trim()) {
      throw new Error(
        "[CESTAS_AUTH_CONFIG] Variavel ausente no deployment: " + variavel +
        ". Configure o ambiente e a branch na Vercel antes de publicar."
      );
    }
  }
}

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
