"use client";
import { GlassCompositionDiagram } from "@/components/GlassCompositionDiagram";

import { useMemo, useState } from "react";
import {
  IconAlert,
  IconChevronDown,
  IconChevronUp,
  IconPlus,
  IconTrash,
} from "@/components/icons";
import ThicknessSelect from "@/components/ThicknessSelect";
import { analyzeComposition, COMPOSITION_PRESETS } from "@/lib/composition";
import { glassLayerBars, layerLabel, parseLayers } from "@/lib/calumen";
import {
  colorForLayer,
  type GlassLayer,
  type GlassLayerKind,
  type LayerColors,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const KIND_OPTIONS: { value: GlassLayerKind; label: string }[] = [
  { value: "substrate", label: "Sustrato" },
  { value: "coating", label: "Capa" },
  { value: "cavity", label: "Cámara" },
  { value: "air", label: "Cámara de aire" },
  { value: "interlayer", label: "Butiral" },
  { value: "enamel", label: "Serigrafía" },
  { value: "unknown", label: "Otro" },
];

const ADD_OPTIONS: { kind: GlassLayerKind; label: string }[] = [
  { kind: "substrate", label: "Sustrato" },
  { kind: "cavity", label: "Cámara" },
  { kind: "interlayer", label: "Butiral" },
  { kind: "coating", label: "Capa" },
  { kind: "enamel", label: "Serigrafía" },
];

const TREATMENTS = ["", "Templado", "Termoendurecido", "Recocido", "Endurecido"];
const MATERIALS = [
  "PLANILUX",
  "PLANITHERM HN",
  "PLANITHERM ONE",
  "PLANICLEAR",
  "PVB STANDARD",
  "PVB SENTRYGLAS",
  "EVA",
  "Cámara de aire",
  "Aire",
  "Argón",
  "Serigrafía",
];

function layerKindOf(layer: GlassLayer): GlassLayerKind {
  if (layer.kind) return layer.kind;
  const key = layer.material
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/\b(air|aire)\b/.test(key)) return "air";
  if (/camara|cavity|argon|kripton|krypton|gas/.test(key)) return "cavity";
  if (/pvb|sentry|butiral|ionoplast|eva|interlayer/.test(key))
    return "interlayer";
  if (/serigrafia|enamel/.test(key)) return "enamel";
  if (/planitherm|cool.?lite|stopray|suncool|coating|low.?e/.test(key))
    return "coating";
  return "substrate";
}

function kindLabel(kind: GlassLayerKind): string {
  return KIND_OPTIONS.find((option) => option.value === kind)?.label ?? "Otro";
}

export default function ProductCompositionEditor({
  layers,
  colors,
  onChange,
}: {
  layers: GlassLayer[];
  colors: LayerColors;
  onChange: (layers: GlassLayer[]) => void;
}) {
  const [presetId, setPresetId] = useState("");
  const [advancedText, setAdvancedText] = useState("");
  const analysis = useMemo(() => analyzeComposition(layers), [layers]);
  const bars = useMemo(
    () => glassLayerBars(layers, { maxWidth: 110, maxScale: 4.4, minWidth: 2 }),
    [layers],
  );
  const colorOf = (layer: GlassLayer) => {
    const kind = layerKindOf(layer);
    return colors[kind] ?? colorForLayer(layer);
  };

  function updateLayer(index: number, patch: Partial<GlassLayer>) {
    onChange(
      layers.map((layer, current) =>
        current === index ? { ...layer, ...patch } : layer,
      ),
    );
  }

  function changeKind(index: number, kind: GlassLayerKind) {
    onChange(
      layers.map((layer, current) => {
        if (current !== index) return layer;
        const next: GlassLayer = { ...layer, kind };
        if (kind === "cavity" || kind === "air") {
          if (!layer.material || layer.material === "PLANILUX") {
            next.material = "Cámara de aire";
          }
          if (!layer.thickness) next.thickness = "12mm";
          next.treatment = undefined;
          next.laminated = undefined;
        } else if (kind === "interlayer") {
          if (!layer.material || layer.material === "PLANILUX") {
            next.material = "PVB STANDARD";
          }
          if (!layer.thickness) next.thickness = "1.52mm";
          next.treatment = undefined;
          next.laminated = undefined;
        } else if (kind === "coating") {
          if (!layer.material || layer.material === "PLANILUX") {
            next.material = "";
          }
          next.treatment = undefined;
          next.laminated = undefined;
        } else if (kind === "substrate") {
          if (
            !layer.material ||
            layer.material === "Cámara de aire" ||
            layer.material === "PVB STANDARD"
          ) {
            next.material = "PLANILUX";
          }
          if (!layer.thickness) next.thickness = "6mm";
        }
        return next;
      }),
    );
  }

  function addLayer(kind: GlassLayerKind) {
    const defaults: Record<GlassLayerKind, GlassLayer> = {
      substrate: { material: "PLANILUX", thickness: "6mm", kind },
      coating: { material: "", kind },
      cavity: { material: "Cámara de aire", thickness: "12mm", kind },
      air: { material: "Cámara de aire", thickness: "12mm", kind },
      interlayer: { material: "PVB STANDARD", thickness: "1.52mm", kind },
      enamel: { material: "Serigrafía", kind },
      unknown: { material: "", kind },
    };
    onChange([...layers, defaults[kind]]);
  }

  function removeLayer(index: number) {
    onChange(layers.filter((_, current) => current !== index));
  }

  function moveLayer(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= layers.length) return;
    const copy = [...layers];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    onChange(copy);
  }

  function applyPreset() {
    const preset = COMPOSITION_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    if (
      layers.length > 0 &&
      !window.confirm(
        `Se reemplazará la composición actual por «${preset.label}». ¿Continuar?`,
      )
    ) {
      return;
    }
    onChange(preset.layers.map((layer) => ({ ...layer })));
  }

  function applyAdvancedText() {
    const parsed = parseLayers(advancedText);
    if (parsed.length === 0) return;
    onChange(
      parsed.map((layer, index) => {
        const current =
          layers[index]?.material.trim().toLowerCase() ===
          layer.material.trim().toLowerCase()
            ? layers[index]
            : layers.find(
                (item) =>
                  item.material.trim().toLowerCase() ===
                  layer.material.trim().toLowerCase(),
              );
        if (!current) return layer;
        return {
          ...layer,
          kind: current.kind ?? layer.kind,
          laminated: current.laminated,
          position: current.position,
        };
      }),
    );
    setAdvancedText("");
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="h-section">Composición del vidrio</h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">
            Ajusta tipo de capa, material, espesor, tratamiento térmico y
            laminado. Puedes reordenar capas o usar una plantilla.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={presetId}
            onChange={(event) => setPresetId(event.target.value)}
            className="select h-8 w-auto max-w-[250px] text-xs"
            title="Plantilla de composición"
          >
            <option value="">Plantilla Calumen…</option>
            {COMPOSITION_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyPreset}
            disabled={!presetId}
            className="btn-secondary btn-sm shrink-0"
          >
            Aplicar
          </button>
        </div>
      </div>

      {layers.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "badge",
              analysis.issues.some((issue) => issue.level === "error")
                ? "badge-red"
                : "badge-blue",
            )}
          >
            {analysis.label}
          </span>
          <span className="chip bg-white">
            {analysis.substrates} vidrio{analysis.substrates === 1 ? "" : "s"}
          </span>
          <span className="chip bg-white">
            {analysis.cavities} cámara{analysis.cavities === 1 ? "" : "s"}
          </span>
          <span className="chip bg-white">
            {analysis.interlayers} butiral{analysis.interlayers === 1 ? "" : "es"}
          </span>
          <span className="chip bg-white">{analysis.totalThickness}</span>
        </div>
      ) : null}

      <datalist id="product-layer-material-options">
        {MATERIALS.map((material) => (
          <option key={material} value={material} />
        ))}
      </datalist>

      <div className="grid gap-3 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-2">
          {layers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
              <p className="text-xs font-semibold text-slate-700">
                Sin capas todavía
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Añade una capa o aplica una plantilla para comenzar.
              </p>
            </div>
          ) : (
            layers.map((layer, index) => {
              const kind = layerKindOf(layer);
              const isSubstrate = kind === "substrate";
              const isCoating = kind === "coating";
              return (
                <div
                  key={`${index}-${layer.material}-${kind}`}
                  className={cn(
                    "rounded-xl border p-3 shadow-xs",
                    isCoating
                      ? "border-red-200 border-l-4 border-l-red-500 bg-red-50/40"
                      : "border-slate-200 bg-white",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold",
                        isCoating
                          ? "bg-red-100 text-red-700"
                          : "bg-brand-100 text-brand-700",
                      )}
                    >
                      {index + 1}
                    </span>
                    <select
                      value={kind}
                      onChange={(event) =>
                        changeKind(index, event.target.value as GlassLayerKind)
                      }
                      className="h-8 w-28 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      title="Tipo de capa"
                    >
                      {KIND_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={layer.material}
                      onChange={(event) =>
                        updateLayer(index, { material: event.target.value })
                      }
                      list="product-layer-material-options"
                      className="h-8 min-w-[130px] flex-1 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      placeholder="Material"
                      aria-label={`Material de la capa ${index + 1}`}
                    />
                    <div className="ml-auto flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveLayer(index, -1)}
                        disabled={index === 0}
                        className="icon-btn h-7 w-7"
                        title="Subir capa"
                      >
                        <IconChevronUp width={13} height={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLayer(index, 1)}
                        disabled={index === layers.length - 1}
                        className="icon-btn h-7 w-7"
                        title="Bajar capa"
                      >
                        <IconChevronDown width={13} height={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLayer(index)}
                        className="icon-btn h-7 w-7 text-slate-400 hover:border-red-200 hover:text-red-600"
                        title="Quitar capa"
                      >
                        <IconTrash width={13} height={13} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {kind === "coating" || kind === "enamel" ? (
                      <div className="flex items-end pb-1">
                        <span className="chip bg-slate-50 text-slate-500">
                          Sin espesor
                        </span>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Espesor
                        </p>
                        <ThicknessSelect
                          value={layer.thickness ?? ""}
                          onChange={(thickness) =>
                            updateLayer(index, {
                              thickness: thickness || undefined,
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                    )}
                    {isSubstrate ? (
                      <>
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Tratamiento térmico
                          <select
                            value={layer.treatment ?? ""}
                            onChange={(event) =>
                              updateLayer(index, {
                                treatment: event.target.value || undefined,
                              })
                            }
                            className="select mt-1 h-8 px-2 py-1 text-xs"
                          >
                            {TREATMENTS.map((treatment) => (
                              <option key={treatment} value={treatment}>
                                {treatment || "Ninguno"}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-end gap-2 pb-1 text-[11px] font-medium text-slate-600">
                          <input
                            type="checkbox"
                            checked={Boolean(layer.laminated)}
                            onChange={(event) =>
                              updateLayer(index, {
                                laminated: event.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                          />
                          Laminar
                        </label>
                      </>
                    ) : (
                      <div className="flex items-end pb-1 sm:col-span-2">
                        <span
                          className={cn(
                            "chip",
                            isCoating
                              ? "border border-red-200 bg-red-50 text-red-700"
                              : "bg-slate-50 text-slate-500",
                          )}
                        >
                          {kind === "coating"
                            ? layer.position
                              ? `Capa funcional #${layer.position}`
                              : "Capa funcional"
                            : kind === "interlayer"
                              ? "Butiral / laminado"
                              : kind === "cavity" || kind === "air"
                                ? "Cámara de aire"
                                : kind === "enamel"
                                  ? "Serigrafía"
                                  : "Otra capa"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Añadir:
            </span>
            {ADD_OPTIONS.map((option) => (
              <button
                key={option.kind}
                type="button"
                onClick={() => addLayer(option.kind)}
                className="btn-secondary btn-sm"
              >
                <IconPlus width={12} height={12} />
                {option.label}
              </button>
            ))}
          </div>

          <details className="mt-2 rounded-xl border border-slate-200 bg-slate-50/60">
            <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-semibold text-slate-600">
              Edición avanzada (texto)
            </summary>
            <div className="border-t border-slate-200 p-3">
              <textarea
                value={advancedText}
                onChange={(event) => setAdvancedText(event.target.value)}
                rows={4}
                className="textarea font-mono text-[12px]"
                placeholder={"PLANILUX(12mm) - Termoendurecido\nPVB STANDARD(1.52mm)\nPLANILUX(12mm) - Termoendurecido"}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={applyAdvancedText}
                  className="btn-secondary btn-sm"
                >
                  Aplicar texto
                </button>
                <span className="text-[10px] text-slate-400">
                  Una capa por línea: MATERIAL(espesor) - Tratamiento
                </span>
              </div>
            </div>
          </details>
        </div>

        <div className="space-y-3">
          <GlassCompositionDiagram
            layers={layers}
            interactive={true}
            showSummary={true}
          />
        </div>
      </div>

      {analysis.issues.length > 0 ? (
        <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Diagnóstico de composición
          </p>
          {analysis.issues.map((issue, index) => (
            <p
              key={index}
              className={cn(
                "flex items-start gap-1.5 text-xs",
                issue.level === "error" ? "text-red-700" : "text-amber-700",
              )}
            >
              <IconAlert width={13} height={13} className="mt-0.5 shrink-0" />
              {issue.message}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
