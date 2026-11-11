// CESTAS V120.1.2 - Diagnostico tecnico da Geolocation API.
// Nenhum dado eh enviado ou armazenado por esta biblioteca.
export type EstadoPermissaoGPS = PermissionState | "indisponivel";
export type DiagnosticoGPS = {
  seguro: boolean;
  apiDisponivel: boolean;
  permissao: EstadoPermissaoGPS;
  politica: "permitida" | "bloqueada" | "nao_identificada";
  origem: string;
};
export type ErroLeituraGPS = Error & { codigo?: number; detalhes?: DiagnosticoGPS };

type DocumentoComPolitica = Document & {
  permissionsPolicy?: { allowsFeature: (feature: string) => boolean };
  featurePolicy?: { allowsFeature: (feature: string) => boolean };
};

export async function diagnosticarGPS(): Promise<DiagnosticoGPS> {
  if (typeof window === "undefined") {
    return { seguro: false, apiDisponivel: false, permissao: "indisponivel", politica: "nao_identificada", origem: "fora do navegador" };
  }
  const documento = document as DocumentoComPolitica;
  const policy = documento.permissionsPolicy ?? documento.featurePolicy;
  let politica: DiagnosticoGPS["politica"] = "nao_identificada";
  try {
    if (policy?.allowsFeature) politica = policy.allowsFeature("geolocation") ? "permitida" : "bloqueada";
  } catch { /* API de politica varia entre navegadores */ }
  let permissao: EstadoPermissaoGPS = "indisponivel";
  try {
    if (navigator.permissions?.query) {
      const consulta = await navigator.permissions.query({ name: "geolocation" });
      permissao = consulta.state;
    }
  } catch { /* navegador pode não disponibilizar Permissions API */ }
  return {
    seguro: window.isSecureContext,
    apiDisponivel: typeof navigator.geolocation?.getCurrentPosition === "function",
    permissao,
    politica,
    origem: window.location.origin,
  };
}

function solicitarPosicao(altaPrecisao: boolean, timeout: number): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: altaPrecisao,
      timeout,
      maximumAge: 0,
    });
  });
}

export async function lerGPS(): Promise<GeolocationPosition> {
  const d = await diagnosticarGPS();
  if (!d.seguro || !d.apiDisponivel || d.politica === "bloqueada") {
    const e = new Error("Contexto inseguro, GPS indisponível ou política do documento bloqueando a localização.") as ErroLeituraGPS;
    e.codigo = 0;
    e.detalhes = d;
    throw e;
  }
  try {
    // No PC, precisão padrão costuma conseguir um ponto por rede/Wi-Fi.
    return await solicitarPosicao(false, 16000);
  } catch (erro) {
    const geo = erro as GeolocationPositionError;
    if (geo?.code === 2 || geo?.code === 3) {
      try { return await solicitarPosicao(true, 20000); }
      catch (segundo) {
        const erroGeo = segundo as GeolocationPositionError;
        const e = new Error(erroGeo?.message || "Falha de localização") as ErroLeituraGPS;
        e.codigo = typeof erroGeo?.code === "number" ? erroGeo.code : undefined;
        e.detalhes = await diagnosticarGPS();
        throw e;
      }
    }
    const e = new Error(geo?.message || "Falha de localização") as ErroLeituraGPS;
    e.codigo = typeof geo?.code === "number" ? geo.code : undefined;
    e.detalhes = await diagnosticarGPS();
    throw e;
  }
}

export function mensagemFalhaGPS(erro: unknown, diagnostico: DiagnosticoGPS | null): string {
  const codigo = (erro as ErroLeituraGPS | null)?.codigo ?? (erro as GeolocationPositionError | null)?.code;
  if (!diagnostico?.seguro) return "Este endereço não é seguro para GPS. Use localhost ou um endereço HTTPS.";
  if (!diagnostico?.apiDisponivel) return "O navegador não disponibiliza a API de localização.";
  if (diagnostico.politica === "bloqueada") return "Uma política do navegador ou da página bloqueou a localização (Permissions-Policy).";
  if (codigo === 1) {
    return diagnostico.permissao === "granted"
      ? "O site está em Permitir, mas o navegador ou o serviço de localização do dispositivo recusou a posição (código 1). O aplicativo não pode ignorar esse bloqueio. Veja o diagnóstico abaixo."
      : "O navegador negou a localização (código 1). Confira a permissão específica para este endereço e o acesso à localização do Windows.";
  }
  if (codigo === 2) return "O provedor de localização não conseguiu determinar a posição, mesmo após tentar modos diferentes (código 2).";
  if (codigo === 3) return "O provedor de localização excedeu o tempo disponível nas duas tentativas (código 3).";
  return "Não foi possível obter a localização. Consulte o diagnóstico para identificar o bloqueio.";
}
