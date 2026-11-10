import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
) {
  const supabase =
    await createClient();

  // CESTAS_V105_5_1_SESSAO: logout explicito encerra apenas esta sessao/dispositivo.
  await supabase.auth.signOut({ scope: "local" });

  return NextResponse.redirect(
    new URL("/", request.url),
    {
      status: 302,
    },
  );
}