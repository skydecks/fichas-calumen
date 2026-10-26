"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_AI_BASE_URL,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_PROVIDER,
} from "./ai-config";
import type { BrandingData } from "./types";

export type AiProvider = {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  enableThinking: boolean;
};

export type AppSettings = {
  providers: AiProvider[];
  activeProviderId: string;
  autoSuggestPdf: boolean;
  defaultCalculatedBy: string;
  defaultCatalog: string;
  defaultStandard: string;
  appName: string;
  organizationName: string;
  organizationTagline: string;
  organizationLogo: string;
  supportLine: string;
};

export const DEFAULT_PROVIDER_ID = "provider-default";

export const DEFAULT_AI_PROVIDER_CONFIG: AiProvider = {
  id: DEFAULT_PROVIDER_ID,
  name: DEFAULT_AI_PROVIDER,
  baseUrl: "",
  model: "",
  apiKey: "",
  enableThinking: false,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  providers: [{ ...DEFAULT_AI_PROVIDER_CONFIG }],
  activeProviderId: DEFAULT_PROVIDER_ID,
  autoSuggestPdf: true,
  defaultCalculatedBy: "Soporte Técnico CEYCO",
  defaultCatalog: "México",
  defaultStandard: "NFRC",
  appName: "Fichas técnicas",
  organizationName: "CEYCO",
  organizationTagline: "Vidrio",
  organizationLogo: "",
  supportLine: "Documentos informativos · Saint-Gobain",
};

const STORAGE_KEY = "calumen.app.settings.v1";
const CHANGE_EVENT = "calumen-settings-changed";

function clean(value: unknown, fallback: string, max = 500): string {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}

export function makeProviderId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `provider-${crypto.randomUUID()}`;
  }
  return `provider-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeProvider(raw: unknown, index: number): AiProvider {
  const value =
    typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return {
    id:
      clean(value.id, "", 100).trim() ||
      (index === 0 ? DEFAULT_PROVIDER_ID : makeProviderId()),
    name:
      clean(value.name, "", 80).trim() ||
      (index === 0 ? DEFAULT_AI_PROVIDER : `Proveedor ${index + 1}`),
    baseUrl: clean(value.baseUrl, "", 600).trim(),
    model: clean(value.model, "", 200).trim(),
    apiKey: clean(value.apiKey, "", 1000).trim(),
    enableThinking:
      typeof value.enableThinking === "boolean"
        ? value.enableThinking
        : false,
  };
}

function normalizeProviders(input: unknown): AiProvider[] {
  const rawProviders = Array.isArray(input) ? input : [];
  const providers: AiProvider[] = [];
  const seen = new Set<string>();
  rawProviders.forEach((raw, index) => {
    const provider = normalizeProvider(raw, index);
    let id = provider.id;
    let suffix = 2;
    while (seen.has(id)) {
      id = `${provider.id}-${suffix}`;
      suffix += 1;
    }
    seen.add(id);
    providers.push({ ...provider, id });
  });
  return providers.length > 0
    ? providers
    : [{ ...DEFAULT_AI_PROVIDER_CONFIG }];
}

export function loadAppSettings(): AppSettings {
  const fallback = {
    ...DEFAULT_APP_SETTINGS,
    providers: DEFAULT_APP_SETTINGS.providers.map((provider) => ({ ...provider })),
  };
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<AppSettings> & {
      providerName?: string;
      apiKey?: string;
      baseUrl?: string;
      model?: string;
      enableThinking?: boolean;
    };

    let providers = normalizeProviders(parsed.providers);

    // Migración desde la versión de un solo proveedor.
    if (!Array.isArray(parsed.providers) || parsed.providers.length === 0) {
      const legacyName = clean(parsed.providerName, "", 80).trim();
      const legacyKey = clean(parsed.apiKey, "", 1000).trim();
      const legacyBaseUrl = clean(parsed.baseUrl, "", 600).trim();
      const legacyModel = clean(parsed.model, "", 200).trim();
      if (legacyName || legacyKey || legacyBaseUrl || legacyModel) {
        providers = [
          {
            id: DEFAULT_PROVIDER_ID,
            name: legacyName || DEFAULT_AI_PROVIDER,
            baseUrl: legacyBaseUrl,
            model: legacyModel,
            apiKey: legacyKey,
            enableThinking:
              typeof parsed.enableThinking === "boolean"
                ? parsed.enableThinking
                : false,
          },
        ];
      }
    }

    const activeProviderId = providers.some(
      (provider) => provider.id === parsed.activeProviderId,
    )
      ? String(parsed.activeProviderId)
      : providers[0].id;

    return {
      providers,
      activeProviderId,
      autoSuggestPdf:
        typeof parsed.autoSuggestPdf === "boolean"
          ? parsed.autoSuggestPdf
          : DEFAULT_APP_SETTINGS.autoSuggestPdf,
      defaultCalculatedBy: clean(
        parsed.defaultCalculatedBy,
        DEFAULT_APP_SETTINGS.defaultCalculatedBy,
        200,
      ),
      defaultCatalog: clean(
        parsed.defaultCatalog,
        DEFAULT_APP_SETTINGS.defaultCatalog,
        120,
      ),
      defaultStandard: clean(
        parsed.defaultStandard,
        DEFAULT_APP_SETTINGS.defaultStandard,
        120,
      ),
      appName: clean(parsed.appName, DEFAULT_APP_SETTINGS.appName, 120),
      organizationName: clean(
        parsed.organizationName,
        DEFAULT_APP_SETTINGS.organizationName,
        160,
      ),
      organizationTagline: clean(
        parsed.organizationTagline,
        DEFAULT_APP_SETTINGS.organizationTagline,
        160,
      ),
      organizationLogo: (() => {
        const logo = clean(parsed.organizationLogo, "", 2_000_000);
        return /^data:image\/(?:png|jpe?g);base64,/i.test(logo) ? logo : "";
      })(),
      supportLine: clean(
        parsed.supportLine,
        DEFAULT_APP_SETTINGS.supportLine,
        300,
      ),
    };
  } catch {
    return fallback;
  }
}

function saveProviders(settings: AppSettings): {
  providers: AiProvider[];
  activeProviderId: string;
} {
  const providers = normalizeProviders(settings.providers).map((provider) => ({
    ...provider,
    name: provider.name.trim() || DEFAULT_AI_PROVIDER,
    baseUrl: provider.baseUrl.trim(),
    model: provider.model.trim(),
    apiKey: provider.apiKey.trim(),
  }));
  const activeProviderId = providers.some(
    (provider) => provider.id === settings.activeProviderId,
  )
    ? settings.activeProviderId
    : providers[0].id;
  return { providers, activeProviderId };
}

export function saveAppSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  const providersState = saveProviders(settings);
  const normalized: AppSettings = {
    ...settings,
    ...providersState,
    defaultCalculatedBy: settings.defaultCalculatedBy.trim(),
    defaultCatalog: settings.defaultCatalog.trim(),
    defaultStandard: settings.defaultStandard.trim(),
    appName: settings.appName.trim() || DEFAULT_APP_SETTINGS.appName,
    organizationName:
      settings.organizationName.trim() ||
      DEFAULT_APP_SETTINGS.organizationName,
    organizationTagline:
      settings.organizationTagline.trim() ||
      DEFAULT_APP_SETTINGS.organizationTagline,
    organizationLogo: settings.organizationLogo.slice(0, 2_000_000),
    supportLine: settings.supportLine.trim(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function resetAppSettings(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function getProvider(
  settings: AppSettings,
  providerId?: string,
): AiProvider {
  return (
    settings.providers.find(
      (provider) => provider.id === (providerId ?? settings.activeProviderId),
    ) ??
    settings.providers.find(
      (provider) => provider.id === settings.activeProviderId,
    ) ??
    settings.providers[0] ??
    DEFAULT_AI_PROVIDER_CONFIG
  );
}

export function aiOverrideFromProvider(provider: AiProvider) {
  return {
    apiKey: provider.apiKey || undefined,
    baseUrl: provider.baseUrl || undefined,
    model: provider.model || undefined,
    thinking: provider.enableThinking,
    providerName: provider.name || DEFAULT_AI_PROVIDER,
  };
}

export function aiOverrideFromSettings(
  settings: AppSettings,
  providerId?: string,
) {
  return aiOverrideFromProvider(getProvider(settings, providerId));
}

export function brandingFromSettings(settings: AppSettings): BrandingData {
  return {
    appName: settings.appName || undefined,
    organizationName: settings.organizationName || undefined,
    organizationTagline: settings.organizationTagline || undefined,
    logoDataUrl: settings.organizationLogo || undefined,
    supportLine: settings.supportLine || undefined,
  };
}

export function useAppSettings(): AppSettings {
  const [settings, setSettings] = useState<AppSettings>(() => ({
    ...DEFAULT_APP_SETTINGS,
    providers: DEFAULT_APP_SETTINGS.providers.map((provider) => ({
      ...provider,
    })),
  }));

  useEffect(() => {
    const sync = () => setSettings(loadAppSettings());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return settings;
}

export { DEFAULT_AI_BASE_URL, DEFAULT_AI_MODEL, DEFAULT_AI_PROVIDER };
