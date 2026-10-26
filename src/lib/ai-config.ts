export const DEFAULT_AI_MODEL = "nvidia/nemotron-3.5-super-vl-120b-a12b";
export const DEFAULT_AI_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const DEFAULT_AI_PROVIDER = "SkyDeck ICS";

export type AiOverride = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  thinking?: boolean;
  providerName?: string;
};

export type ResolvedAiConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  enableThinking: boolean;
  providerName: string;
  usingUserKey: boolean;
};

export class AiConfigError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "AiConfigError";
    this.status = status;
  }
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function normalizeAiOverride(raw: unknown): AiOverride {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const value = raw as Record<string, unknown>;
  return {
    apiKey: clean(value.apiKey, 1000) || undefined,
    baseUrl: clean(value.baseUrl, 600) || undefined,
    model: clean(value.model, 200) || undefined,
    thinking:
      typeof value.thinking === "boolean" ? value.thinking : undefined,
    providerName: clean(value.providerName, 80) || undefined,
  };
}

function normalizeBaseUrl(source: string): string {
  let parsed: URL;
  try {
    parsed = new URL(source);
  } catch {
    throw new AiConfigError("El endpoint de IA no es una URL válida.", 400);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new AiConfigError("El endpoint de IA debe usar http o https.", 400);
  }
  if (parsed.username || parsed.password) {
    throw new AiConfigError(
      "El endpoint de IA no debe incluir usuario o contraseña en la URL.",
      400,
    );
  }

  // Acepta tanto la URL base como una URL que termine en /chat/completions.
  const pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.pathname = pathname.endsWith("/chat/completions")
    ? pathname.slice(0, -"/chat/completions".length)
    : pathname;
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/+$/, "");
}

export function resolveAiConfig(raw: unknown): ResolvedAiConfig {
  const override = normalizeAiOverride(raw);
  const serverBaseUrl = normalizeBaseUrl(
    process.env.AI_BASE_URL || process.env.NVIDIA_BASE_URL || DEFAULT_AI_BASE_URL,
  );
  const hasCustomEndpoint = Boolean(override.baseUrl);
  const baseUrl = hasCustomEndpoint
    ? normalizeBaseUrl(override.baseUrl!)
    : serverBaseUrl;
  const apiKey = override.apiKey || process.env.AI_API_KEY || process.env.NVIDIA_API_KEY || "";
  if (!apiKey) {
    throw new AiConfigError(
      "No hay una clave de IA configurada. Añádela en Configuración o en AI_API_KEY del servidor.",
      503,
    );
  }

  // La clave del servidor solo puede viajar al endpoint del servidor. Si el
  // usuario elige un endpoint distinto, debe aportar su propia clave para
  // evitar que un tercero reciba la credencial global.
  if (!override.apiKey && hasCustomEndpoint && baseUrl !== serverBaseUrl) {
    throw new AiConfigError(
      "Para usar un endpoint personalizado, configura tu propia API key. La clave del servidor solo se usa con el endpoint del servidor.",
      400,
    );
  }

  const model = override.model || process.env.AI_MODEL || process.env.NVIDIA_MODEL || DEFAULT_AI_MODEL;
  const enableThinking =
    typeof override.thinking === "boolean"
      ? override.thinking
      : (process.env.AI_ENABLE_THINKING ?? process.env.NVIDIA_ENABLE_THINKING) === "true";
  const providerName = override.providerName || DEFAULT_AI_PROVIDER;

  return {
    apiKey,
    baseUrl,
    model,
    enableThinking,
    providerName,
    usingUserKey: Boolean(override.apiKey),
  };
}

export function isNimEndpoint(baseUrl: string): boolean {
  return /nvidia/i.test(baseUrl);
}

export function toAiOverride(config: {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  enableThinking?: boolean;
  thinking?: boolean;
  providerName?: string;
}): AiOverride {
  return {
    apiKey: config.apiKey?.trim() || undefined,
    baseUrl: config.baseUrl?.trim() || undefined,
    model: config.model?.trim() || undefined,
    thinking:
      typeof config.thinking === "boolean"
        ? config.thinking
        : config.enableThinking,
    providerName: config.providerName?.trim() || undefined,
  };
}
