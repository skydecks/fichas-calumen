"use client";

import { DEFAULT_LAYER_COLORS, type LayerColors } from "@/lib/types";

const OPTIONS: Array<{ key: keyof LayerColors; label: string }> = [
  { key: "substrate", label: "Vidrio / sustrato" },
  { key: "coating", label: "Capa funcional" },
  { key: "interlayer", label: "Butiral / laminado" },
  { key: "cavity", label: "Cámara" },
  { key: "air", label: "Cámara de aire" },
  { key: "enamel", label: "Serigrafía" },
  { key: "unknown", label: "Otra capa" },
];

export default function LayerColorEditor({
  colors,
  onChange,
  className,
}: {
  colors: LayerColors;
  onChange: (colors: LayerColors) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Colores de composición
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Se usan en la vista de capas y en el PDF.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_LAYER_COLORS })}
          className="text-[10px] font-semibold text-slate-400 hover:text-brand-600"
        >
          Restaurar
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const value = colors[option.key] ?? DEFAULT_LAYER_COLORS[option.key];
          return (
            <label
              key={option.key}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
            >
              <input
                type="color"
                value={value}
                onChange={(event) =>
                  onChange({ ...colors, [option.key]: event.target.value })
                }
                className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                aria-label={`Color para ${option.label}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-slate-700">
                  {option.label}
                </span>
                <span className="block font-mono text-[10px] text-slate-400">
                  {value}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
