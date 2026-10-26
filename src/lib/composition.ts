import { layerLabel, thicknessMm } from "./calumen";
import type { GlassLayer, GlassLayerKind } from "./types";

export type CompositionType =
  | "unknown"
  | "monolithic"
  | "laminated"
  | "insulating"
  | "laminated-insulating"
  | "multi-laminated"
  | "multi-insulating"
  | "multi-insulating-laminated";

export type CompositionIssue = {
  level: "error" | "warning";
  message: string;
};

export type CompositionAnalysis = {
  type: CompositionType;
  label: string;
  substrates: number;
  interlayers: number;
  cavities: number;
  coatings: number;
  totalThickness: string;
  summary: string;
  issues: CompositionIssue[];
};

export type CompositionPreset = {
  id: string;
  label: string;
  description: string;
  layers: GlassLayer[];
};

function inferKind(layer: GlassLayer): GlassLayerKind {
  if (layer.kind) return layer.kind;
  const value = layer.material
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/\b(air|aire)\b/.test(value)) return "air";
  if (/camara|cavity|argon|kripton|krypton|gas/.test(value)) return "cavity";
  if (/pvb|sentry|butiral|ionoplast|eva|interlayer/.test(value))
    return "interlayer";
  if (/serigrafia|enamel/.test(value)) return "enamel";
  if (/planitherm|cool.?lite|stopray|suncool|coating|low.?e/.test(value))
    return "coating";
  return "substrate";
}

function isCavity(layer: GlassLayer): boolean {
  const kind = inferKind(layer);
  return kind === "cavity" || kind === "air";
}

function isInterlayer(layer: GlassLayer): boolean {
  return inferKind(layer) === "interlayer";
}

function isSubstrate(layer: GlassLayer): boolean {
  const kind = inferKind(layer);
  return kind === "substrate" || kind === "unknown";
}

function isCoating(layer: GlassLayer): boolean {
  return inferKind(layer) === "coating";
}

function nearestNonCoating(
  layers: GlassLayer[],
  index: number,
  direction: -1 | 1,
): GlassLayer | null {
  for (let current = index + direction; current >= 0 && current < layers.length; current += direction) {
    if (!isCoating(layers[current])) return layers[current];
  }
  return null;
}

function presetGlass(thickness = "6mm"): GlassLayer {
  return {
    material: "PLANILUX",
    thickness,
    treatment: "Templado",
    kind: "substrate",
  };
}

function presetPvb(): GlassLayer {
  return {
    material: "PVB STANDARD",
    thickness: "1.52mm",
    kind: "interlayer",
  };
}

function presetCavity(thickness = "12mm"): GlassLayer {
  return {
    material: "Cámara de aire",
    thickness,
    kind: "cavity",
  };
}

export const COMPOSITION_PRESETS: CompositionPreset[] = [
  {
    id: "monolithic",
    label: "Monolítico",
    description: "Un solo vidrio. Ej. 6 mm templado.",
    layers: [presetGlass()],
  },
  {
    id: "laminated",
    label: "Laminado",
    description: "Dos vidrios unidos con butiral. Ej. 6 + PVB 1.52 + 6.",
    layers: [presetGlass(), presetPvb(), presetGlass()],
  },
  {
    id: "insulating",
    label: "Insulado",
    description: "Dos vidrios separados por cámara de aire. Ej. 6 + 12 + 6.",
    layers: [presetGlass(), presetCavity(), presetGlass()],
  },
  {
    id: "laminated-insulating",
    label: "Insulado con laminado exterior",
    description: "Laminado exterior + cámara + monolítico interior.",
    layers: [presetGlass(), presetPvb(), presetGlass(), presetCavity(), presetGlass()],
  },
  {
    id: "insulating-laminated-interior",
    label: "Insulado con laminado interior",
    description: "Monolítico exterior + cámara + laminado interior.",
    layers: [presetGlass(), presetCavity(), presetGlass(), presetPvb(), presetGlass()],
  },
  {
    id: "multi-insulating",
    label: "Multi-insulado",
    description: "Tres vidrios y dos cámaras. Ej. 6 + 12 + 6 + 12 + 6.",
    layers: [presetGlass(), presetCavity(), presetGlass(), presetCavity(), presetGlass()],
  },
  {
    id: "multi-laminated",
    label: "Multi-laminado",
    description: "Tres vidrios y dos butirales. Ej. 6 + PVB + 6 + PVB + 6.",
    layers: [presetGlass(), presetPvb(), presetGlass(), presetPvb(), presetGlass()],
  },
  {
    id: "multi-insulating-laminated",
    label: "Multi-insulado con laminados",
    description: "Dos cámaras y dos laminados. Ej. 6+PVB+6 + 12 + 6+PVB+6.",
    layers: [
      presetGlass(),
      presetPvb(),
      presetGlass(),
      presetCavity(),
      presetGlass(),
      presetPvb(),
      presetGlass(),
    ],
  },
];

function compositionType(
  substrates: number,
  interlayers: number,
  cavities: number,
): CompositionType {
  if (substrates === 0) return "unknown";
  if (cavities === 0 && interlayers === 0) return "monolithic";
  if (cavities === 0) return interlayers > 1 ? "multi-laminated" : "laminated";
  if (interlayers === 0)
    return cavities > 1 ? "multi-insulating" : "insulating";
  return cavities > 1
    ? "multi-insulating-laminated"
    : "laminated-insulating";
}

function labelFor(type: CompositionType): string {
  switch (type) {
    case "monolithic":
      return "Monolítico";
    case "laminated":
      return "Laminado";
    case "insulating":
      return "Insulado";
    case "laminated-insulating":
      return "Insulado con laminado";
    case "multi-laminated":
      return "Multi-laminado";
    case "multi-insulating":
      return "Multi-insulado";
    case "multi-insulating-laminated":
      return "Multi-insulado con laminados";
    default:
      return "Composición incompleta";
  }
}

export function analyzeComposition(layers: GlassLayer[]): CompositionAnalysis {
  const substrates = layers.filter(isSubstrate).length;
  const interlayers = layers.filter(isInterlayer).length;
  const cavities = layers.filter(isCavity).length;
  const coatings = layers.filter(isCoating).length;
  const type = compositionType(substrates, interlayers, cavities);
  const issues: CompositionIssue[] = [];

  if (layers.length === 0) {
    issues.push({
      level: "error",
      message: "Añade al menos un vidrio a la composición.",
    });
  } else if (substrates === 0) {
    issues.push({
      level: "error",
      message: "La composición necesita al menos un sustrato de vidrio.",
    });
  }

  layers.forEach((layer, index) => {
    if (isSubstrate(layer)) {
      if (!layer.thickness) {
        issues.push({
          level: "warning",
          message: `La capa ${index + 1} (${layer.material}) no tiene espesor.`,
        });
      }
      if (layer.laminated) {
        const adjacent = [
          nearestNonCoating(layers, index, -1),
          nearestNonCoating(layers, index, 1),
        ].some((candidate) => candidate && isInterlayer(candidate));
        if (!adjacent) {
          issues.push({
            level: "warning",
            message: `La capa ${index + 1} está marcada como laminada, pero no tiene un butiral adyacente.`,
          });
        }
      }
    }

    if (isInterlayer(layer)) {
      if (!layer.thickness) {
        issues.push({
          level: "warning",
          message: `El butiral de la posición ${index + 1} no tiene espesor.`,
        });
      }
      const previous = nearestNonCoating(layers, index, -1);
      const next = nearestNonCoating(layers, index, 1);
      if (!previous || !next || !isSubstrate(previous) || !isSubstrate(next)) {
        issues.push({
          level: "error",
          message: `El butiral de la posición ${index + 1} debe estar entre dos vidrios.`,
        });
      }
    }

    if (isCavity(layer)) {
      if (!layer.thickness) {
        issues.push({
          level: "warning",
          message: `La cámara de la posición ${index + 1} no tiene espesor.`,
        });
      }
      const previous = nearestNonCoating(layers, index, -1);
      const next = nearestNonCoating(layers, index, 1);
      if (!previous || !next || !isSubstrate(previous) || !isSubstrate(next)) {
        issues.push({
          level: "error",
          message: `La cámara de la posición ${index + 1} debe estar entre dos vidrios.`,
        });
      }
      if (previous && isCavity(previous)) {
        issues.push({
          level: "error",
          message: `Hay dos cámaras contiguas en la posición ${index + 1}; necesitan un vidrio entre ellas.`,
        });
      }
    }
  });

  const total = layers.reduce(
    (sum, layer) => sum + (thicknessMm(layer) ?? 0),
    0,
  );
  const partial = layers.some((layer) => {
    const kind = inferKind(layer);
    return (
      kind !== "coating" &&
      kind !== "enamel" &&
      thicknessMm(layer) === null
    );
  });

  return {
    type,
    label: labelFor(type),
    substrates,
    interlayers,
    cavities,
    coatings,
    totalThickness:
      total > 0
        ? `${total.toFixed(1).replace(/\.0$/, "")} mm${partial ? " (parcial)" : ""}`
        : "—",
    summary: layers.map(layerLabel).join(" + ") || "Sin composición",
    issues,
  };
}
