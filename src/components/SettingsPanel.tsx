"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import {
  IconAlert,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconRefresh,
  IconSparkles,
  IconTrash,
} from "@/components/icons";
import { SpectrumButton } from "@/components/spectrum/button";
import { SpectrumCard } from "@/components/spectrum/card";
import { SpectrumInput } from "@/components/spectrum/input";
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_PROVIDER_ID,
  aiOverrideFromProvider,
  getProvider,
  loadAppSettings,
  makeProviderId,
  resetAppSettings,
  saveAppSettings,
  type AiProvider,
  type AppSettings,
} from "@/lib/app-settings";
import { cn } from "@/lib/utils";

function rasterizeLogo(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const sourceWidth = image.naturalWidth || image.width || 512;
        const sourceHeight = image.naturalHeight || image.height || 512;
        const scale = Math.min(1, 512 / Math.max(sourceWidth, sourceHeight));
        const width = Math.max(1, Math.round(sourceWidth * scale));
        const height = Math.max(1, Math.round(sourceHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("No se pudo preparar el logo.");
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        reject(new Error("No se pudo convertir el logo a PNG."));
      }
    };
    image.onerror = () =>
      reject(new Error("El archivo de logo no se pudo interpretar."));
    image.src = dataUrl;
  });
}

type TestState =
  | { type: "idle" }
  | { type: "testing" }
  | { type: "success"; message: string; detail?: string }
  | { type: "error"; message: string };

export default function SettingsPanel() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [test, setTest] = useState<TestState>({ type: "idle" });
  const [logoError, setLogoError] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] =
    useState<string>(DEFAULT_PROVIDER_ID);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadedSettings = loadAppSettings();
    setSettings(loadedSettings);
    setSelectedProviderId(loadedSettings.activeProviderId);
    setLoaded(true);
  }, []);

  const selectedProvider = getProvider(settings, selectedProviderId);
  const activeProvider = getProvider(settings);
  const isSelectedDefault =
    selectedProvider.id === settings.activeProviderId;

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((previous) => ({ ...previous, [key]: value }));
    setTest({ type: "idle" });
  }

  function updateProvider(id: string, patch: Partial<AiProvider>) {
    setSettings((previous) => ({
      ...previous,
      providers: previous.providers.map((provider) =>
        provider.id === id ? { ...provider, ...patch } : provider,
      ),
    }));
    setTest({ type: "idle" });
  }

  function selectProvider(id: string) {
    setSelectedProviderId(id);
    setShowKey(false);
    setTest({ type: "idle" });
  }

  function addProvider() {
    const id = makeProviderId();
    const provider: AiProvider = {
      id,
      name: `Proveedor ${settings.providers.length + 1}`,
      baseUrl: "",
      model: "",
      apiKey: "",
      enableThinking: false,
    };
    setSettings((previous) => ({
      ...previous,
      providers: [...previous.providers, provider],
    }));
    setSelectedProviderId(id);
    setShowKey(false);
    setTest({ type: "idle" });
  }

  function removeProvider(id: string) {
    if (settings.providers.length <= 1) return;
    const remaining = settings.providers.filter(
      (provider) => provider.id !== id,
    );
    const nextActive =
      settings.activeProviderId === id
        ? remaining[0].id
        : settings.activeProviderId;
    setSettings((previous) => ({
      ...previous,
      providers: remaining,
      activeProviderId: nextActive,
    }));
    setSelectedProviderId(remaining[0].id);
    setShowKey(false);
    setTest({ type: "idle" });
  }

  function setActiveProvider(id: string) {
    setSettings((previous) => ({ ...previous, activeProviderId: id }));
  }

  function showFlash(message: string) {
    setFlash(message);
    window.setTimeout(() => setFlash(null), 4000);
  }

  function handleSave() {
    saveAppSettings(settings);
    const loadedSettings = loadAppSettings();
    setSettings(loadedSettings);
    setSelectedProviderId((current) =>
      loadedSettings.providers.some((provider) => provider.id === current)
        ? current
        : loadedSettings.activeProviderId,
    );
    showFlash("Configuración guardada en este navegador.");
  }

  async function handleTest() {
    setTest({ type: "testing" });
    try {
      const response = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai: aiOverrideFromProvider(selectedProvider),
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            model?: string;
            providerName?: string;
            latencyMs?: number;
          }
        | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error ?? "El proveedor de IA no respondió correctamente.",
        );
      }
      setTest({
        type: "success",
        message: `Conexión correcta · ${payload.latencyMs ?? 0} ms`,
        detail: `${payload.providerName ?? selectedProvider.name} · ${payload.model ?? selectedProvider.model}`,
      });
    } catch (error) {
      setTest({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo probar la conexión de IA.",
      });
    }
  }

  async function handleLogoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const allowed = [
      "image/png",
      "image/jpeg",
      "image/svg+xml",
      "image/webp",
    ];
    if (!allowed.includes(file.type)) {
      setLogoError("El logo debe ser PNG, JPG, SVG o WebP.");
      return;
    }
    if (file.size > 1_000_000) {
      setLogoError("El logo supera 1 MB. Usa una versión más ligera.");
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("No se pudo leer el logo."));
        reader.readAsDataURL(file);
      });

      // React-PDF solo incrusta PNG/JPG. SVG y WebP se rasterizan a PNG.
      const normalized =
        file.type === "image/png" || file.type === "image/jpeg"
          ? dataUrl
          : await rasterizeLogo(dataUrl);

      setLogoError(null);
      update("organizationLogo", normalized);
      showFlash("Logo cargado. Pulsa Guardar identidad para conservarlo.");
    } catch (error) {
      setLogoError(
        error instanceof Error ? error.message : "No se pudo procesar el logo.",
      );
    }
  }

  function removeLogo() {
    update("organizationLogo", "");
    setLogoError(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  function handleClearKey() {
    updateProvider(selectedProvider.id, { apiKey: "" });
    setTest({ type: "idle" });
    showFlash(
      "Clave eliminada de este proveedor. Se usará la clave del servidor si existe.",
    );
  }

  function handleReset() {
    if (
      !window.confirm(
        "¿Restaurar todos los parámetros de la app? Se borrará también la clave guardada en este navegador.",
      )
    ) {
      return;
    }
    resetAppSettings();
    setSettings({
      ...DEFAULT_APP_SETTINGS,
      providers: DEFAULT_APP_SETTINGS.providers.map((provider) => ({
        ...provider,
      })),
    });
    setSelectedProviderId(DEFAULT_PROVIDER_ID);
    setShowKey(false);
    setTest({ type: "idle" });
    showFlash("Configuración restaurada a los valores predeterminados.");
  }

  return (
    <div className="space-y-5">
      {flash ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <IconCheck width={16} height={16} />
          {flash}
        </div>
      ) : null}

      <SpectrumCard padding="md">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Identidad de la organización
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Personaliza el nombre, el logo y la línea de contacto que
              aparecen en el login, el menú y los PDFs de las fichas.
            </p>
          </div>
          <span className="badge badge-blue">Branding</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            <SpectrumInput
              label="Nombre de la aplicación"
              value={settings.appName}
              onChange={(event) => update("appName", event.target.value)}
              placeholder="Fichas técnicas"
            />
            <SpectrumInput
              label="Nombre de la empresa"
              value={settings.organizationName}
              onChange={(event) =>
                update("organizationName", event.target.value)
              }
              placeholder="CEYCO"
            />
            <SpectrumInput
              label="Giro / tagline"
              value={settings.organizationTagline}
              onChange={(event) =>
                update("organizationTagline", event.target.value)
              }
              placeholder="Vidrio de ingeniería"
            />
            <SpectrumInput
              label="Línea de contacto / soporte"
              value={settings.supportLine}
              onChange={(event) =>
                update("supportLine", event.target.value)
              }
              placeholder="Documentos informativos · Saint-Gobain"
              hint="Se muestra en el menú y en el PDF."
            />
          </div>

          <div>
            <label className="label">Logo de la organización</label>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white p-1">
                  {settings.organizationLogo ? (
                    <img
                      src={settings.organizationLogo}
                      alt="Logo de la organización"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400">Sin logo</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-slate-700">
                    PNG, JPG, SVG o WebP · máximo 1 MB
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                    Se usa en el encabezado, el login y el PDF. Se guarda en
                    este navegador.
                  </p>
                </div>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={handleLogoFile}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <SpectrumButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                >
                  Subir logo
                </SpectrumButton>
                {settings.organizationLogo ? (
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700"
                  >
                    <IconTrash width={12} height={12} />
                    Quitar
                  </button>
                ) : null}
                <SpectrumButton
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={!loaded}
                  className="ml-auto"
                >
                  Guardar identidad
                </SpectrumButton>
              </div>
              {logoError ? (
                <p className="mt-2 text-[11px] text-red-600">{logoError}</p>
              ) : null}
            </div>
          </div>
        </div>
      </SpectrumCard>

      <div className="grid items-start gap-5 lg:grid-cols-[1.45fr_1fr]">
        <SpectrumCard padding="md">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                  <IconSparkles width={17} height={17} />
                </span>
                <h2 className="text-sm font-semibold text-slate-900">
                  Proveedores de IA
                </h2>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Guarda varios proveedores compatibles con OpenAI y elige cuál
                usar. Cada uno conserva su propia API key, endpoint y modelo.
              </p>
            </div>
            <span className="badge badge-blue shrink-0">
              {settings.providers.length}{" "}
              {settings.providers.length === 1 ? "proveedor" : "proveedores"}
            </span>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {settings.providers.map((provider) => {
              const selected = provider.id === selectedProvider.id;
              const isDefault = provider.id === settings.activeProviderId;
              return (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => selectProvider(provider.id)}
                  className={cn(
                    "inline-flex max-w-full items-center gap-1.5 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition",
                    selected
                      ? "border-brand-400 bg-brand-50 text-brand-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50/50",
                  )}
                >
                  <span className="max-w-[160px] truncate">
                    {provider.name}
                  </span>
                  {isDefault ? (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                        selected
                          ? "bg-brand-600 text-white"
                          : "bg-emerald-100 text-emerald-700",
                      )}
                    >
                      Predeterminado
                    </span>
                  ) : null}
                </button>
              );
            })}
            <button
              type="button"
              onClick={addProvider}
              className="inline-flex items-center gap-1 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-700"
            >
              <span className="text-base leading-none">+</span>
              Añadir proveedor
            </button>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
            <p className="text-xs text-slate-600">
              Editando:{" "}
              <strong className="text-slate-900">{selectedProvider.name}</strong>
              {" · "}
              Predeterminado actual:{" "}
              <strong className="text-slate-900">{activeProvider.name}</strong>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveProvider(selectedProvider.id)}
                disabled={isSelectedDefault}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-bold transition",
                  isSelectedDefault
                    ? "cursor-default bg-emerald-50 text-emerald-700"
                    : "bg-white text-brand-700 shadow-xs ring-1 ring-brand-200 hover:bg-brand-50",
                )}
              >
                {isSelectedDefault ? "Es el predeterminado" : "Usar como predeterminado"}
              </button>
              {settings.providers.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeProvider(selectedProvider.id)}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 hover:text-red-700"
                >
                  <IconTrash width={12} height={12} />
                  Eliminar
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <SpectrumInput
              label="Nombre visible del proveedor"
              value={selectedProvider.name}
              onChange={(event) =>
                updateProvider(selectedProvider.id, {
                  name: event.target.value,
                })
              }
              placeholder="SkyDeck ICS"
              hint="Se usa en el chat y en el panel de sugerencias."
            />

            <SpectrumInput
              label="Endpoint compatible con OpenAI"
              value={selectedProvider.baseUrl}
              onChange={(event) =>
                updateProvider(selectedProvider.id, {
                  baseUrl: event.target.value,
                })
              }
              placeholder="https://integrate.api.nvidia.com/v1"
              hint="Vacío = endpoint del servidor. También acepta la URL completa /chat/completions."
            />

            <SpectrumInput
              label="Modelo"
              value={selectedProvider.model}
              onChange={(event) =>
                updateProvider(selectedProvider.id, {
                  model: event.target.value,
                })
              }
              placeholder="nvidia/nemotron-3.5-super-vl-120b-a12b"
              hint="Vacío = modelo del servidor. Si usas un endpoint propio, indica el modelo exacto."
            />

            <div>
              <label className="label" htmlFor={`ai-key-${selectedProvider.id}`}>
                API key de este proveedor
              </label>
              <div className="relative">
                <input
                  id={`ai-key-${selectedProvider.id}`}
                  type={showKey ? "text" : "password"}
                  value={selectedProvider.apiKey}
                  onChange={(event) =>
                    updateProvider(selectedProvider.id, {
                      apiKey: event.target.value,
                    })
                  }
                  placeholder="Dejar vacío para usar la clave del servidor"
                  autoComplete="off"
                  spellCheck={false}
                  className="input pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((visible) => !visible)}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  title={showKey ? "Ocultar clave" : "Mostrar clave"}
                >
                  {showKey ? (
                    <IconEyeOff width={15} height={15} />
                  ) : (
                    <IconEye width={15} height={15} />
                  )}
                </button>
              </div>
              <p className="hint">
                Cada proveedor guarda su propia clave en{" "}
                <strong>localStorage</strong> de este navegador. No se guarda en
                la base de datos ni se comparte con otros usuarios. Para un
                endpoint personalizado necesitas una clave propia; la clave del
                servidor solo se usa con el endpoint del servidor.
              </p>
              {selectedProvider.apiKey ? (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700"
                >
                  <IconTrash width={12} height={12} />
                  Eliminar clave de este proveedor
                </button>
              ) : null}
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
              <input
                type="checkbox"
                checked={selectedProvider.enableThinking}
                onChange={(event) =>
                  updateProvider(selectedProvider.id, {
                    enableThinking: event.target.checked,
                  })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-600"
              />
              <span>
                <span className="block text-xs font-semibold text-slate-800">
                  Activar razonamiento del modelo
                </span>
                <span className="block text-[11px] leading-relaxed text-slate-500">
                  Puede mejorar el análisis, pero aumenta el tiempo de respuesta.
                  Úsalo solo si tu proveedor lo soporta (por ejemplo, NIM).
                </span>
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <SpectrumButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void handleTest()}
                disabled={test.type === "testing"}
                loading={test.type === "testing"}
                leftIcon={<IconRefresh width={14} height={14} />}
              >
                Probar este proveedor
              </SpectrumButton>
              <SpectrumButton
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={!loaded}
              >
                Guardar configuración
              </SpectrumButton>
              <Link
                href="/asistente"
                className="ml-auto text-[11px] font-semibold text-brand-600 hover:underline"
              >
                Abrir asistente
              </Link>
            </div>

            <p className="text-[10px] leading-relaxed text-slate-400">
              El proveedor predeterminado se usa para las sugerencias de PDF y
              como opción inicial del chat. En el chat puedes cambiar de
              proveedor sin modificar este valor predeterminado.
            </p>

            {test.type === "success" ? (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                <IconCheck width={14} height={14} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">{test.message}</p>
                  {test.detail ? (
                    <p className="mt-0.5 text-[11px] text-emerald-700">
                      {test.detail}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
            {test.type === "error" ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <IconAlert width={14} height={14} className="mt-0.5 shrink-0" />
                <span>{test.message}</span>
              </div>
            ) : null}
          </div>
        </SpectrumCard>

        <div className="space-y-5">
          <SpectrumCard padding="md">
            <h2 className="text-sm font-semibold text-slate-900">
              Valores predeterminados
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Se aplican al crear una ficha nueva. No modifican las fichas
              existentes.
            </p>

            <div className="mt-4 space-y-4">
              <SpectrumInput
                label="Calculado por"
                value={settings.defaultCalculatedBy}
                onChange={(event) =>
                  update("defaultCalculatedBy", event.target.value)
                }
                placeholder="Soporte Técnico CEYCO"
              />
              <SpectrumInput
                label="Catálogo"
                value={settings.defaultCatalog}
                onChange={(event) =>
                  update("defaultCatalog", event.target.value)
                }
                placeholder="México"
              />
              <SpectrumInput
                label="Normas"
                value={settings.defaultStandard}
                onChange={(event) =>
                  update("defaultStandard", event.target.value)
                }
                placeholder="NFRC"
              />

              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
                <input
                  type="checkbox"
                  checked={settings.autoSuggestPdf}
                  onChange={(event) =>
                    update("autoSuggestPdf", event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-600"
                />
                <span>
                  <span className="block text-xs font-semibold text-slate-800">
                    Sugerir nombre y campos al importar un PDF
                  </span>
                  <span className="block text-[11px] leading-relaxed text-slate-500">
                    {activeProvider.name} analizará el PDF automáticamente
                    después de la importación. Siempre puedes usar el botón
                    manual.
                  </span>
                </span>
              </label>
            </div>
          </SpectrumCard>

          <SpectrumCard padding="md">
            <h2 className="text-sm font-semibold text-slate-900">
              Seguridad y alcance
            </h2>
            <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-slate-600">
              <li>• La API key se guarda solo en este navegador.</li>
              <li>• No se escribe en la base de datos ni en los logs.</li>
              <li>• Si no hay clave propia, se usa la del servidor.</li>
              <li>• La configuración es por navegador/perfil de usuario.</li>
              <li>
                • Un endpoint personalizado debe ser compatible con OpenAI
                (<code className="rounded bg-slate-100 px-1">/chat/completions</code>).
              </li>
            </ul>
            <div className="mt-4 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-red-600"
              >
                <IconRefresh width={13} height={13} />
                Restaurar valores predeterminados
              </button>
            </div>
          </SpectrumCard>
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] leading-relaxed text-slate-500",
          !loaded && "opacity-60",
        )}
      >
        La configuración se aplica a las consultas de IA de este navegador.
        Otros usuarios o equipos mantienen su propia configuración.
      </div>
    </div>
  );
}
