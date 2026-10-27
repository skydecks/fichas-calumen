"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { useRouter } from "next/navigation";
import {
  IconAlert,
  IconCheck,
  IconPackage,
  IconSparkles,
  IconUpload,
  IconX,
} from "@/components/icons";
import { SpectrumButton } from "@/components/spectrum/button";
import { SpectrumInput } from "@/components/spectrum/input";
import { SpectrumTextarea } from "@/components/spectrum/input";
import LayerColorEditor from "@/components/LayerColorEditor";
import CatalogCombobox from "@/components/CatalogCombobox";
import ThicknessSelect from "@/components/ThicknessSelect";
import { layerLabel } from "@/lib/calumen";
import {
  aiOverrideFromSettings,
  loadAppSettings,
} from "@/lib/app-settings";
import {
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_MANUFACTURER_OPTIONS,
  type ProductProfile,
} from "@/lib/products";
import { cn } from "@/lib/utils";

type Preview = {
  profile: ProductProfile;
  sourceName: string;
  sourceType: string;
  rawText: string | null;
};

export default function ProductImport() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  async function processFile(file: File) {
    setLoading(true);
    setError(null);
    setFlash(null);
    setPreview(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append(
        "ai",
        JSON.stringify(
          aiOverrideFromSettings(loadAppSettings()),
        ),
      );

      const response = await fetch("/api/products/import", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            profile?: ProductProfile;
            sourceName?: string;
            sourceType?: string;
            rawText?: string | null;
          }
        | null;

      if (!response.ok || !payload?.profile) {
        throw new Error(
          payload?.error ?? "No se pudo analizar la ficha del producto.",
        );
      }

      setPreview({
        profile: payload.profile,
        sourceName: payload.sourceName ?? file.name,
        sourceType: payload.sourceType ?? "pdf",
        rawText: payload.rawText ?? null,
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo analizar la ficha del producto.",
      );
    } finally {
      setLoading(false);
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void processFile(file);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
  }

  async function saveProduct() {
    if (!preview || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: preview.profile,
          sourceName: preview.sourceName,
          sourceType: preview.sourceType,
          rawText: preview.rawText,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; id?: string }
        | null;
      if (!response.ok || !payload?.id) {
        throw new Error(payload?.error ?? "No se pudo guardar el producto.");
      }
      setFlash("Producto agregado al catálogo.");
      setPreview(null);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo guardar el producto.",
      );
    } finally {
      setSaving(false);
    }
  }

  function updateLayerThickness(index: number, thickness: string) {
    setPreview((current) =>
      current
        ? {
            ...current,
            profile: {
              ...current.profile,
              layers: current.profile.layers.map((layer, currentIndex) =>
                currentIndex === index
                  ? { ...layer, thickness: thickness || undefined }
                  : layer,
              ),
            },
          }
        : current,
    );
  }

  function updateField<K extends keyof ProductProfile>(
    field: K,
    value: ProductProfile[K],
  ) {
    setPreview((current) =>
      current
        ? {
            ...current,
            profile: { ...current.profile, [field]: value },
          }
        : current,
    );
  }

  return (
    <div className="space-y-4">
      {flash ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <IconCheck width={16} height={16} />
          {flash}
        </div>
      ) : null}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-2xl border-2 border-dashed px-5 py-5 transition",
          dragActive
            ? "border-brand-400 bg-brand-50/60"
            : "border-slate-300 bg-white",
        )}
      >
        <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <IconPackage width={20} height={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">
              Agregar producto al catálogo
            </p>
            <p className="mt-0.5 hidden text-[11px] leading-relaxed text-slate-500 sm:block">
              Arrastra una ficha técnica en PDF o una imagen clara. La IA
              extraerá nombre, composición, prestaciones y valores clave.
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onFileChange}
          />
          <SpectrumButton
            type="button"
            variant="primary"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            loading={loading}
            leftIcon={<IconUpload width={14} height={14} />}
          >
            Subir ficha
          </SpectrumButton>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
          <IconAlert width={14} height={14} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <IconX width={13} height={13} />
          </button>
        </div>
      ) : null}

      {preview ? (
        <div className="rounded-2xl border border-brand-200 bg-white p-4 shadow-xs">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                <IconSparkles width={14} height={14} className="text-brand-600" />
                Perfil extraído por IA
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Revisa y ajusta los datos antes de guardarlo en el catálogo.
              </p>
            </div>
            <span className="badge badge-blue">{preview.sourceType.toUpperCase()}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SpectrumInput
              label="Nombre del producto"
              value={preview.profile.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
            <SpectrumInput
              label="Código"
              value={preview.profile.code}
              onChange={(event) => updateField("code", event.target.value)}
            />
            <CatalogCombobox
              label="Categoría"
              value={preview.profile.category}
              options={PRODUCT_CATEGORY_OPTIONS}
              onChange={(value) => updateField("category", value)}
              placeholder="Buscar o crear categoría…"
            />
            <CatalogCombobox
              label="Fabricante"
              value={preview.profile.manufacturer}
              options={PRODUCT_MANUFACTURER_OPTIONS}
              onChange={(value) => updateField("manufacturer", value)}
              placeholder="Buscar o crear fabricante…"
            />
          </div>

          <SpectrumTextarea
            label="Descripción / resumen"
            value={preview.profile.summary || preview.profile.description}
            onChange={(event) => updateField("summary", event.target.value)}
            rows={2}
            className="mt-3"
          />

          <div className="mt-4">
            <LayerColorEditor
              colors={preview.profile.colors}
              onChange={(colors) => updateField("colors", colors)}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Composición detectada
              </p>
              {preview.profile.layers.length > 0 ? (
                <ol className="mt-2 space-y-1.5 text-xs text-slate-700">
                  {preview.profile.layers.map((layer, index) => (
                    <li
                      key={`${layer.material}-${index}`}
                      className="flex items-center gap-2"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {index + 1}. {layerLabel(layer)}
                      </span>
                      <ThicknessSelect
                        value={layer.thickness ?? ""}
                        onChange={(thickness) =>
                          updateLayerThickness(index, thickness)
                        }
                        className="w-32 shrink-0"
                      />
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-xs text-slate-400">
                  Sin composición detectada.
                </p>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Valores clave
              </p>
              <div className="mt-2 space-y-1 text-xs text-slate-700">
                {Object.entries(preview.profile.keyValues)
                  .slice(0, 10)
                  .map(([label, value]) => (
                    <p key={label} className="flex justify-between gap-2">
                      <span className="truncate">{label}</span>
                      <strong className="shrink-0">{value}</strong>
                    </p>
                  ))}
                {Object.keys(preview.profile.keyValues).length === 0 ? (
                  <p className="text-slate-400">Sin valores detectados.</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <p className="text-[10px] text-slate-400">
              Origen: {preview.sourceName}
            </p>
            <div className="flex items-center gap-2">
              <SpectrumButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPreview(null)}
              >
                Descartar
              </SpectrumButton>
              <SpectrumButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() => void saveProduct()}
                loading={saving}
              >
                Guardar producto
              </SpectrumButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
