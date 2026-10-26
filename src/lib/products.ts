import type { GlassLayer, LayerColors, PerfRow, PerfSection } from "./types";
import {
  DEFAULT_LAYER_COLORS,
  makeId,
  normalizeLayerColors,
  safeSectionIcon,
} from "./types";

export const PRODUCT_CATEGORY_OPTIONS = [
  "Sustratos",
  "Control solar",
  "Bajo emisivo",
  "Aislamiento térmico",
  "Acústico",
  "Seguridad",
  "Decorativo",
  "Serigrafía",
  "Monolítico",
  "Laminado",
  "Insulado",
];

export const PRODUCT_MANUFACTURER_OPTIONS = [
  "Saint-Gobain Glass",
  "Saint-Gobain",
  "Vitro",
  "Guardian",
  "AGC",
  "Pilkington",
  "CEYCO",
  "Torres",
];

export type ProductProfile = {
  name: string;
  code: string;
  category: string;
  manufacturer: string;
  description: string;
  summary: string;
  layers: GlassLayer[];
  sections: PerfSection[];
  keyValues: Record<string, string>;
  colors: LayerColors;
};

export type ProductRecord = ProductProfile & {
  id: string;
  active: boolean;
  sourceName?: string;
  sourceType?: string;
  createdAt?: string;
  updatedAt?: string;
};

function text(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeRows(input: unknown): PerfRow[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw): PerfRow | null => {
      if (!raw || typeof raw !== "object") return null;
      const value = raw as Record<string, unknown>;
      const label = text(value.label, 600);
      if (!label) return null;
      const kind =
        value.kind === "note" || value.kind === "heading"
          ? value.kind
          : "row";
      const rowValue = text(value.value, 500);
      return {
        id: text(value.id, 80) || makeId("row"),
        label,
        value: rowValue || undefined,
        kind,
      };
    })
    .filter((row): row is PerfRow => Boolean(row));
}

function normalizeSections(input: unknown): PerfSection[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw): PerfSection | null => {
      if (!raw || typeof raw !== "object") return null;
      const value = raw as Record<string, unknown>;
      const title = text(value.title, 300);
      if (!title) return null;
      return {
        id: text(value.id, 80) || makeId("sec"),
        key: text(value.key, 80) || "custom_producto",
        title,
        standard: text(value.standard, 160) || undefined,
        icon: safeSectionIcon(value.icon),
        rows: normalizeRows(value.rows),
        hidden: Boolean(value.hidden),
      };
    })
    .filter((section): section is PerfSection => Boolean(section));
}

function normalizeLayers(input: unknown): GlassLayer[] {
  if (!Array.isArray(input)) return [];
  const kinds = [
    "substrate",
    "coating",
    "cavity",
    "air",
    "interlayer",
    "enamel",
    "unknown",
  ];
  return input
    .map((raw): GlassLayer | null => {
      if (!raw || typeof raw !== "object") return null;
      const value = raw as Record<string, unknown>;
      const material = text(value.material, 200);
      if (!material) return null;
      const kind = text(value.kind, 30);
      const position = Number(value.position);
      return {
        material,
        thickness: text(value.thickness, 60) || undefined,
        treatment: text(value.treatment, 200) || undefined,
        kind: kinds.includes(kind) ? (kind as GlassLayer["kind"]) : undefined,
        laminated:
          typeof value.laminated === "boolean" ? value.laminated : undefined,
        position: Number.isFinite(position) && position > 0 ? position : undefined,
        color:
          typeof value.color === "string" &&
          /^#[0-9a-f]{6}$/i.test(value.color.trim())
            ? value.color.trim().toLowerCase()
            : undefined,
      };
    })
    .filter((layer): layer is GlassLayer => Boolean(layer));
}

function normalizeKeyValues(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    const label = text(key, 200);
    const content = text(value, 300);
    if (label && content) result[label] = content;
  }
  return result;
}

export function normalizeProductProfile(input: unknown): ProductProfile | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const name = text(raw.name, 240);
  if (!name) return null;

  const layers = normalizeLayers(raw.layers);
  const sections = normalizeSections(raw.sections);
  const keyValues = normalizeKeyValues(raw.keyValues);
  if (Object.keys(keyValues).length === 0) {
    for (const section of sections) {
      for (const row of section.rows) {
        if (row.value) keyValues[row.label] = row.value;
      }
    }
  }

  return {
    name,
    code: text(raw.code, 120),
    category: text(raw.category, 160),
    manufacturer: text(raw.manufacturer, 160),
    description: text(raw.description, 2000),
    summary: text(raw.summary, 1000),
    layers,
    sections,
    keyValues,
    colors: normalizeLayerColors(raw.colors),
  };
}

export function normalizeProductLayers(input: unknown): GlassLayer[] {
  return normalizeLayers(input);
}

export function applyLayerColors(
  layers: GlassLayer[],
  colors: LayerColors,
): GlassLayer[] {
  return layers.map((layer) => ({
    ...layer,
    color: colors[layer.kind ?? "unknown"] ?? DEFAULT_LAYER_COLORS.unknown,
  }));
}

export function productToProfile(product: {
  id: string;
  name: string;
  code: string;
  category: string | null;
  manufacturer: string | null;
  description: string | null;
  summary: string | null;
  layers: string;
  sections: string;
  keyValues: string;
  colors: string;
  active: boolean;
  sourceName: string | null;
  sourceType: string | null;
  rawText: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ProductRecord {
  const parse = <T>(value: string, fallback: T): T => {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  };

  const layers = normalizeLayers(parse<unknown>(product.layers, []));
  const sections = normalizeSections(parse<unknown>(product.sections, []));
  const keyValues = normalizeKeyValues(parse<unknown>(product.keyValues, {}));
  const colors = normalizeLayerColors(parse<unknown>(product.colors, {}));
  const coloredLayers = applyLayerColors(layers, colors);

  return {
    id: product.id,
    name: product.name,
    code: product.code,
    category: product.category ?? "",
    manufacturer: product.manufacturer ?? "",
    description: product.description ?? "",
    summary: product.summary ?? "",
    layers: coloredLayers,
    sections,
    keyValues,
    colors,
    active: product.active,
    sourceName: product.sourceName ?? undefined,
    sourceType: product.sourceType ?? undefined,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
