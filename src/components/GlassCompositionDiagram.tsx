"use client";

import { useMemo, useState } from "react";
import {
  Sun,
  Home,
  Shield,
  Sparkles,
  Wind,
  Maximize2,
  Info,
  CheckCircle2,
  Layers as LayersIcon,
} from "lucide-react";
import type { GlassLayer, GlassLayerKind } from "@/lib/types";
import { layerLabel, thicknessMm } from "@/lib/calumen";
import { analyzeComposition } from "@/lib/composition";
import { cn } from "@/lib/utils";

interface GlassCompositionDiagramProps {
  layers: GlassLayer[];
  className?: string;
  compact?: boolean;
  onSelectLayer?: (index: number) => void;
  selectedIndex?: number | null;
  interactive?: boolean;
  showSummary?: boolean;
}

type DiagramItem =
  | {
      type: "substrate";
      index: number;
      layer: GlassLayer;
      thicknessMm: number;
      widthPx: number;
      leftFace: number;
      rightFace: number;
      leftCoating?: GlassLayer;
      rightCoating?: GlassLayer;
    }
  | {
      type: "cavity";
      index: number;
      layer: GlassLayer;
      thicknessMm: number;
      widthPx: number;
      gasName: string;
      spacerName: string;
    }
  | {
      type: "interlayer";
      index: number;
      layer: GlassLayer;
      thicknessMm: number;
      widthPx: number;
    };

function inferKind(layer: GlassLayer): GlassLayerKind {
  if (layer.kind) return layer.kind;
  const val = (layer.material || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/\b(air|aire)\b/.test(val)) return "air";
  if (/camara|cavity|argon|kripton|krypton|gas/.test(val)) return "cavity";
  if (/pvb|sentry|butiral|ionoplast|eva|interlayer/.test(val)) return "interlayer";
  if (/planitherm|cool.?lite|stopray|suncool|coating|low.?e/.test(val)) return "coating";
  return "substrate";
}

function getSubstrateColor(material: string): {
  bg: string;
  border: string;
  tint: string;
} {
  const m = material.toLowerCase();
  if (m.includes("diamant") || m.includes("ultra")) {
    return {
      bg: "from-cyan-50/80 via-blue-50/70 to-slate-100/90 dark:from-cyan-950/40 dark:via-blue-900/30 dark:to-slate-900/60",
      border: "border-cyan-300 dark:border-cyan-700",
      tint: "text-cyan-700 dark:text-cyan-300",
    };
  }
  if (m.includes("bronze") || m.includes("bronce")) {
    return {
      bg: "from-amber-100/70 via-amber-200/50 to-amber-100/80 dark:from-amber-950/50 dark:via-amber-900/40 dark:to-amber-950/60",
      border: "border-amber-400 dark:border-amber-700",
      tint: "text-amber-800 dark:text-amber-300",
    };
  }
  if (m.includes("green") || m.includes("verde")) {
    return {
      bg: "from-emerald-100/70 via-emerald-200/50 to-emerald-100/80 dark:from-emerald-950/50 dark:via-emerald-900/40 dark:to-emerald-950/60",
      border: "border-emerald-400 dark:border-emerald-700",
      tint: "text-emerald-800 dark:text-emerald-300",
    };
  }
  if (m.includes("grey") || m.includes("gris")) {
    return {
      bg: "from-slate-200/80 via-slate-300/60 to-slate-200/90 dark:from-slate-800/60 dark:via-slate-800/40 dark:to-slate-900/70",
      border: "border-slate-400 dark:border-slate-600",
      tint: "text-slate-800 dark:text-slate-200",
    };
  }
  // Standard float / Planilux
  return {
    bg: "from-sky-50/90 via-blue-50/60 to-cyan-50/80 dark:from-sky-950/40 dark:via-blue-900/30 dark:to-cyan-950/50",
    border: "border-sky-300/90 dark:border-sky-700",
    tint: "text-sky-800 dark:text-sky-300",
  };
}

export function GlassCompositionDiagram({
  layers,
  className,
  compact = false,
  onSelectLayer,
  selectedIndex,
  interactive = true,
  showSummary = true,
}: GlassCompositionDiagramProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const analysis = useMemo(() => analyzeComposition(layers), [layers]);

  // Construir el modelo arquitectónico de capas y caras
  const { diagramItems, faceMap, totalThicknessMm } = useMemo(() => {
    const items: DiagramItem[] = [];
    let currentFace = 1;
    let totalTh = 0;

    const coatings = layers
      .map((layer, index) => ({ layer, index, kind: inferKind(layer) }))
      .filter((item) => item.kind === "coating");

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const kind = inferKind(layer);
      const th = thicknessMm(layer) ?? (kind === "air" || kind === "cavity" ? 12 : kind === "interlayer" ? 0.76 : 6);

      if (kind === "coating") {
        // Las capas se aplican a las caras de los sustratos adyacentes
        continue;
      }

      totalTh += th;

      if (kind === "substrate") {
        const leftFace = currentFace;
        const rightFace = currentFace + 1;
        currentFace += 2;

        // Buscar si alguna capa declarada está asociada a esta cara
        const leftCoating = coatings.find(
          (c) => c.layer.position === leftFace,
        )?.layer;

        // Si la siguiente capa es coating y no tiene posición declarada o tiene rightFace
        const nextLayer = layers[i + 1];
        const rightCoating =
          coatings.find((c) => c.layer.position === rightFace)?.layer ??
          (nextLayer && inferKind(nextLayer) === "coating" && (!nextLayer.position || nextLayer.position === rightFace)
            ? nextLayer
            : undefined);

        // Escalar ancho visual en píxeles (base 6mm = 32px, max 19mm = 68px, min 3mm = 20px)
        const widthPx = Math.max(22, Math.min(74, Math.round(th * 4.2 + 8)));

        items.push({
          type: "substrate",
          index: i,
          layer,
          thicknessMm: th,
          widthPx,
          leftFace,
          rightFace,
          leftCoating,
          rightCoating,
        });
      } else if (kind === "air" || kind === "cavity") {
        const widthPx = Math.max(34, Math.min(84, Math.round(th * 3.8 + 10)));
        items.push({
          type: "cavity",
          index: i,
          layer,
          thicknessMm: th,
          widthPx,
          gasName: layer.material || "AIR",
          spacerName: "Warm-Edge / Butilo",
        });
      } else if (kind === "interlayer") {
        const widthPx = Math.max(14, Math.min(26, Math.round(th * 12 + 6)));
        items.push({
          type: "interlayer",
          index: i,
          layer,
          thicknessMm: th,
          widthPx,
        });
      }
    }

    return {
      diagramItems: items,
      faceMap: currentFace - 1,
      totalThicknessMm: totalTh,
    };
  }, [layers]);

  if (layers.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center dark:border-slate-800 dark:bg-slate-900/30",
          className,
        )}
      >
        <LayersIcon className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          Sin capas definidas
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          Carga una ficha técnica en PDF o añade sustratos y cámaras para visualizar la composición.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 transition",
        className,
      )}
    >
      {/* Cabecera del Diagrama: Tipo y Espesor Total */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
              <LayersIcon className="h-3.5 w-3.5" />
              {analysis.label}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {analysis.substrates} {analysis.substrates === 1 ? "vidrio" : "vidrios"}
              {analysis.cavities > 0 ? ` · ${analysis.cavities} cámara` : ""}
              {analysis.interlayers > 0 ? ` · ${analysis.interlayers} interlámina` : ""}
              {analysis.coatings > 0 ? ` · ${analysis.coatings} capa solar` : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {totalThicknessMm.toFixed(1).replace(/\.0$/, "")} mm nominal
          </span>
        </div>
      </div>

      {/* Indicadores Ambientales: Exterior vs Interior */}
      <div className="relative mb-2 flex items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
          <Sun className="h-3.5 w-3.5" />
          <span>Exterior (Cara 1)</span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-slate-400 text-[9.5px] font-normal normal-case">
          <span>Incidencia solar →</span>
        </div>
        <div className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
          <span>Interior (Cara {faceMap})</span>
          <Home className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* ÁREA CENTRAL: CORTE TRANSVERSAL ARQUITECTÓNICO DEL VIDRIO */}
      <div className="relative overflow-x-auto rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/50">
        <div className="mx-auto flex min-w-max items-center justify-center gap-1.5 sm:gap-2 py-4">
          {diagramItems.map((item, itemIdx) => {
            const isSelected = selectedIndex === item.index;
            const isHovered = hoveredIndex === item.index;

            // CASO 1: SUSTRATO DE VIDRIO
            if (item.type === "substrate") {
              const colors = getSubstrateColor(item.layer.material);
              const treatment = item.layer.treatment || "Recocido";
              const isTempered = /templado|tempered|ft/i.test(treatment);

              return (
                <div
                  key={`sub-${item.index}`}
                  onClick={() => interactive && onSelectLayer?.(item.index)}
                  onMouseEnter={() => setHoveredIndex(item.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={cn(
                    "relative flex flex-col items-center justify-between rounded-lg border-2 bg-gradient-to-b transition-all select-none shadow-xs",
                    colors.bg,
                    colors.border,
                    interactive ? "cursor-pointer hover:scale-[1.02] hover:shadow-md" : "",
                    isSelected ? "ring-3 ring-brand-500 ring-offset-2 dark:ring-offset-slate-950 z-10" : "",
                    isHovered ? "border-brand-500" : "",
                  )}
                  style={{
                    width: compact ? Math.max(20, item.widthPx * 0.7) : item.widthPx,
                    height: compact ? 120 : 170,
                  }}
                  title={`${layerLabel(item.layer)} (Cara ${item.leftFace} y ${item.rightFace})`}
                >
                  {/* Capa de Control Solar en Cara Izquierda (si aplica) */}
                  {item.leftCoating && (
                    <div
                      className="absolute -left-[3px] top-0 bottom-0 w-[4px] rounded-full bg-gradient-to-b from-amber-400 via-red-500 to-amber-500 shadow-sm z-20 animate-pulse"
                      title={`Capa: ${item.leftCoating.material} en Cara ${item.leftFace}`}
                    >
                      <span className="absolute -top-5 -left-2 rounded bg-red-600 px-1 py-0.2 text-[8.5px] font-bold text-white shadow-xs">
                        #{item.leftFace}
                      </span>
                    </div>
                  )}

                  {/* Número de Cara Izquierda en la parte superior */}
                  <span className="absolute -top-5 left-0 text-[9px] font-mono font-bold text-slate-400">
                    ①{item.leftFace > 1 ? item.leftFace : ""}
                  </span>

                  {/* Bisel superior del vidrio (efecto brillo) */}
                  <div className="w-full h-2 rounded-t-md bg-white/40 dark:bg-white/10" />

                  {/* Centro: Espesor destacado y material */}
                  <div className="flex flex-col items-center justify-center px-1 text-center">
                    <span className="font-mono text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white drop-shadow-xs">
                      {item.thicknessMm}
                    </span>
                    <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 -mt-1">
                      mm
                    </span>
                  </div>

                  {/* Tratamiento térmico en la base */}
                  <div className="w-full px-1 pb-1.5 text-center">
                    <span
                      className={cn(
                        "inline-block rounded px-1 py-0.5 text-[8.5px] font-bold uppercase tracking-wider truncate max-w-full",
                        isTempered
                          ? "bg-blue-100/90 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          : "bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                      )}
                    >
                      {isTempered ? "FT" : "REC"}
                    </span>
                  </div>

                  {/* Capa de Control Solar en Cara Derecha (ej. Cara 2 en DGU) */}
                  {item.rightCoating && (
                    <div
                      className="absolute -right-[3px] top-0 bottom-0 w-[4px] rounded-full bg-gradient-to-b from-amber-400 via-red-500 to-amber-500 shadow-sm z-20 animate-pulse"
                      title={`Capa: ${item.rightCoating.material} en Cara ${item.rightFace}`}
                    >
                      <span className="absolute -top-5 -right-2 rounded bg-red-600 px-1 py-0.2 text-[8.5px] font-bold text-white shadow-xs">
                        #{item.rightFace}
                      </span>
                    </div>
                  )}

                  {/* Número de Cara Derecha en la parte superior */}
                  <span className="absolute -top-5 right-0 text-[9px] font-mono font-bold text-slate-400">
                    {item.rightFace}
                  </span>
                </div>
              );
            }

            // CASO 2: CÁMARA DE AIRE / GAS (CON SEPARADOR WARM-EDGE Y SELLO BUTILO)
            if (item.type === "cavity") {
              const isArgon = /argon/i.test(item.gasName);

              return (
                <div
                  key={`cav-${item.index}`}
                  onClick={() => interactive && onSelectLayer?.(item.index)}
                  onMouseEnter={() => setHoveredIndex(item.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={cn(
                    "relative flex flex-col items-center justify-between rounded-lg border border-dashed border-slate-300/80 bg-slate-100/40 dark:border-slate-700/80 dark:bg-slate-900/40 transition select-none",
                    interactive ? "cursor-pointer hover:border-brand-400 hover:bg-slate-100/80" : "",
                    isSelected ? "ring-2 ring-brand-500" : "",
                  )}
                  style={{
                    width: compact ? Math.max(26, item.widthPx * 0.7) : item.widthPx,
                    height: compact ? 120 : 170,
                  }}
                  title={`Cámara: ${item.gasName} (${item.thicknessMm} mm)`}
                >
                  {/* Perfil Separador Superior (Spacer Bar / Swisspacer) */}
                  <div className="w-full flex flex-col items-center pt-0.5">
                    <div className="w-[88%] h-3 rounded-xs border border-slate-400 bg-slate-700 dark:border-slate-500 dark:bg-slate-600 flex items-center justify-center gap-0.5 px-0.5 shadow-2xs">
                      <div className="h-1 w-1 rounded-full bg-amber-400/80" />
                      <div className="h-1 w-1 rounded-full bg-slate-300" />
                    </div>
                    {/* Sello primario de butilo */}
                    <div className="w-[70%] h-1 bg-slate-900/40 rounded-b-xs" />
                  </div>

                  {/* Centro: Espesor y Gas */}
                  <div className="flex flex-col items-center justify-center px-1 text-center my-auto">
                    <div className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400">
                      <Wind className="h-3 w-3" />
                      <span className="font-mono text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                        {item.thicknessMm}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "mt-0.5 rounded px-1 py-0.2 text-[8px] font-extrabold uppercase tracking-wider",
                        isArgon
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                          : "bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                      )}
                    >
                      {isArgon ? "ARGÓN" : "AIRE"}
                    </span>
                  </div>

                  {/* Perfil Separador Inferior (Spacer Bar / Swisspacer) */}
                  <div className="w-full flex flex-col items-center pb-0.5">
                    {/* Sello primario de butilo */}
                    <div className="w-[70%] h-1 bg-slate-900/40 rounded-t-xs" />
                    <div className="w-[88%] h-3 rounded-xs border border-slate-400 bg-slate-700 dark:border-slate-500 dark:bg-slate-600 flex items-center justify-center gap-0.5 px-0.5 shadow-2xs">
                      <div className="h-1 w-1 rounded-full bg-amber-400/80" />
                      <div className="h-1 w-1 rounded-full bg-slate-300" />
                    </div>
                  </div>
                </div>
              );
            }

            // CASO 3: INTERLÁMINA DE SEGURIDAD (PVB / SENTRYGLAS)
            if (item.type === "interlayer") {
              const isSentry = /sentry/i.test(item.layer.material);

              return (
                <div
                  key={`int-${item.index}`}
                  onClick={() => interactive && onSelectLayer?.(item.index)}
                  onMouseEnter={() => setHoveredIndex(item.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={cn(
                    "relative flex flex-col items-center justify-center rounded-sm transition select-none shadow-2xs",
                    isSentry
                      ? "border border-amber-400 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-300 dark:border-amber-600 dark:from-amber-600 dark:to-amber-700"
                      : "border border-sky-400 bg-gradient-to-b from-sky-200 via-sky-300 to-sky-200 dark:border-sky-600 dark:from-sky-700 dark:to-sky-800",
                    interactive ? "cursor-pointer hover:scale-105" : "",
                    isSelected ? "ring-2 ring-brand-500" : "",
                  )}
                  style={{
                    width: item.widthPx,
                    height: compact ? 120 : 170,
                  }}
                  title={`Interlámina: ${item.layer.material} (${item.thicknessMm} mm)`}
                >
                  <Shield className="h-3 w-3 text-slate-700 dark:text-white" />
                  <span className="mt-1 text-[7.5px] font-bold uppercase rotate-90 text-slate-800 dark:text-white whitespace-nowrap">
                    {item.thicknessMm}
                  </span>
                </div>
              );
            }

            return null;
          })}
        </div>

        {/* LÍNEA DE COTAS ARQUITECTÓNICA (DIMENSION LINE) */}
        <div className="mt-3 flex items-center justify-center border-t border-slate-200 pt-2 dark:border-slate-800 text-[10px] font-mono text-slate-500">
          <span className="mr-2 text-[9px] uppercase tracking-wider font-semibold text-slate-400">
            Cotas:
          </span>
          <div className="flex items-center gap-1">
            {diagramItems.map((item, idx) => (
              <span key={idx} className="inline-flex items-center">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {item.thicknessMm}
                </span>
                {idx < diagramItems.length - 1 ? (
                  <span className="mx-1 text-slate-300 dark:text-slate-600">+</span>
                ) : null}
              </span>
            ))}
            <span className="mx-1.5 font-bold text-slate-400">=</span>
            <span className="rounded bg-brand-100 px-1.5 py-0.5 font-bold text-brand-800 dark:bg-brand-950 dark:text-brand-300">
              {totalThicknessMm.toFixed(1).replace(/\.0$/, "")} mm
            </span>
          </div>
        </div>
      </div>

      {/* DESGLOSE Y LISTA DE CAPAS INTERACTIVAS */}
      {showSummary && (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Desglose de capas (Exterior a Interior)
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {layers.map((layer, idx) => {
              const kind = inferKind(layer);
              const isSelected = selectedIndex === idx;
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={idx}
                  onClick={() => interactive && onSelectLayer?.(idx)}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border p-2.5 transition text-left select-none",
                    isSelected
                      ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500 dark:border-brand-400 dark:bg-brand-950/30"
                      : isHovered
                        ? "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"
                        : "border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900",
                    interactive ? "cursor-pointer" : "",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold",
                      kind === "coating"
                        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                        : kind === "air" || kind === "cavity"
                          ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          : kind === "interlayer"
                            ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                    )}
                  >
                    {idx + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                      {layer.material}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                      {layer.thickness && (
                        <span className="font-mono font-medium">{layer.thickness}</span>
                      )}
                      {layer.treatment && (
                        <span className="chip py-0 px-1 text-[9px]">{layer.treatment}</span>
                      )}
                      {kind === "coating" && (
                        <span className="chip bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 py-0 px-1 text-[9px]">
                          Capa {layer.position ? `en Cara #${layer.position}` : "funcional"}
                        </span>
                      )}
                      {kind === "air" && (
                        <span className="chip py-0 px-1 text-[9px]">Cámara de gas</span>
                      )}
                      {kind === "interlayer" && (
                        <span className="chip bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 py-0 px-1 text-[9px]">
                          Seguridad
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
