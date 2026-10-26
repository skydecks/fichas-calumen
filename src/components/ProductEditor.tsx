"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconAlert, IconCheck } from "@/components/icons";
import LayerColorEditor from "@/components/LayerColorEditor";
import CatalogCombobox from "@/components/CatalogCombobox";
import ProductCompositionEditor from "@/components/ProductCompositionEditor";
import { SpectrumButton } from "@/components/spectrum/button";
import { SpectrumInput, SpectrumTextarea } from "@/components/spectrum/input";
import {
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_MANUFACTURER_OPTIONS,
  type ProductRecord,
} from "@/lib/products";
import type { LayerColors } from "@/lib/types";

export default function ProductEditor({ product }: { product: ProductRecord }) {
  const router = useRouter();
  const [name, setName] = useState(product.name);
  const [code, setCode] = useState(product.code);
  const [category, setCategory] = useState(product.category);
  const [manufacturer, setManufacturer] = useState(product.manufacturer);
  const [description, setDescription] = useState(product.description);
  const [summary, setSummary] = useState(product.summary);
  const [active, setActive] = useState(product.active);
  const [colors, setColors] = useState<LayerColors>(product.colors);
  const [layers, setLayers] = useState(product.layers);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code,
          category,
          manufacturer,
          description,
          summary,
          active,
          colors,
          layers,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo guardar el producto.");
      }
      setSaved(true);
      router.refresh();
      window.setTimeout(() => setSaved(false), 4000);
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

  return (
    <div className="space-y-5">
      {saved ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
          <IconCheck width={14} height={14} />
          Producto actualizado.
        </div>
      ) : null}
      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
          <IconAlert width={14} height={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <SpectrumInput
          label="Nombre del producto"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <SpectrumInput
          label="Código"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <CatalogCombobox
          label="Categoría"
          value={category}
          options={PRODUCT_CATEGORY_OPTIONS}
          onChange={setCategory}
          placeholder="Buscar o crear categoría…"
        />
        <CatalogCombobox
          label="Fabricante"
          value={manufacturer}
          options={PRODUCT_MANUFACTURER_OPTIONS}
          onChange={setManufacturer}
          placeholder="Buscar o crear fabricante…"
        />
      </div>

      <SpectrumTextarea
        label="Descripción"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        rows={2}
      />
      <SpectrumTextarea
        label="Resumen técnico"
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
        rows={2}
      />

      <ProductCompositionEditor
        layers={layers}
        colors={colors}
        onChange={setLayers}
      />

      <LayerColorEditor colors={colors} onChange={setColors} />

      <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 accent-brand-600"
        />
        Producto activo para el catálogo y las predicciones
      </label>

      <div className="flex justify-end border-t border-slate-100 pt-3">
        <SpectrumButton
          type="button"
          variant="primary"
          onClick={() => void save()}
          loading={saving}
        >
          Guardar cambios
        </SpectrumButton>
      </div>
    </div>
  );
}
