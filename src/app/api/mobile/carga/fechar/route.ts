import { NextResponse } from "next/server";

import {
  fecharCarga,
  type FecharCargaState,
} from "@/app/mobile/carga/fechar/actions";

// V61_3_MODAL_API_FLOW - executa o fechamento sem desmontar a tela atual.
const initialState: FecharCargaState = {
  success: false,
  message: "",
  totalEmPosse: 0,
  totalRetornado: 0,
  totalAvariado: 0,
};

export async function POST(
  request: Request,
) {
  try {
    const formData =
      await request.formData();

    const state =
      await fecharCarga(
        initialState,
        formData,
      );

    return NextResponse.json(
      state,
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Erro na API de fechamento da carga:",
      error,
    );

    return NextResponse.json(
      {
        ...initialState,
        message:
          "Não foi possível confirmar o resultado. Verifique Minha Carga antes de repetir a operação.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}
