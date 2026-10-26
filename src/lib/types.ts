export type RowKind = "row" | "note" | "heading";

export type PerfRow = {
  id: string;
  label: string;
  value?: string;
  kind: RowKind;
};

export type PerfSection = {
  id: string;
  key: string;
  title: string;
  standard?: string;
  icon: string;
  rows: PerfRow[];
  hidden?: boolean;
};

export type BrandingData = {
  appName?: string;
  organizationName?: string;
  organizationTagline?: string;
  logoDataUrl?: string;
  supportLine?: string;
};

function textBranding(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim().slice(0, max);
  return text || undefined;
}

export function normalizeBranding(input: unknown): BrandingData | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return undefined;
  }
  const raw = input as Record<string, unknown>;
  const logo =
    typeof raw.logoDataUrl === "string" &&
    /^data:image\/(?:png|jpe?g);base64,[a-z0-9+/=]+$/i.test(raw.logoDataUrl) &&
    raw.logoDataUrl.length <= 2_000_000
      ? raw.logoDataUrl
      : undefined;

  const branding: BrandingData = {
    appName: textBranding(raw.appName, 120),
    organizationName: textBranding(raw.organizationName, 160),
    organizationTagline: textBranding(raw.organizationTagline, 160),
    logoDataUrl: logo,
    supportLine: textBranding(raw.supportLine, 300),
  };

  return Object.values(branding).some(Boolean) ? branding : undefined;
}

export type GlassLayerKind =
  | "substrate"
  | "coating"
  | "cavity"
  | "air"
  | "interlayer"
  | "enamel"
  | "unknown";

export type GlassLayer = {
  material: string;
  thickness?: string;
  treatment?: string;
  /** Naturaleza de la capa dentro del acristalamiento. */
  kind?: GlassLayerKind;
  /** Solo aplica a sustratos: el configurador marca si es laminado. */
  laminated?: boolean;
  /** Posición declarada por Calumen, por ejemplo la capa #2. */
  position?: number;
  /** Color de representación de esta capa (hex #RRGGBB). */
  color?: string;
};

export type LayerColors = {
  substrate?: string;
  coating?: string;
  interlayer?: string;
  cavity?: string;
  air?: string;
  enamel?: string;
  unknown?: string;
};

export const DEFAULT_LAYER_COLORS: Required<LayerColors> = {
  substrate: "#d9ebfc",
  coating: "#ef4444",
  interlayer: "#7fb1e8",
  cavity: "#e8eef6",
  air: "#e8eef6",
  enamel: "#99f6e4",
  unknown: "#d9ebfc",
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function normalizeColor(value: unknown): string | undefined {
  return typeof value === "string" && HEX_COLOR.test(value.trim())
    ? value.trim().toLowerCase()
    : undefined;
}

export function normalizeLayerColors(input: unknown): LayerColors {
  const raw =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const colors: LayerColors = {};
  for (const key of Object.keys(DEFAULT_LAYER_COLORS) as Array<
    keyof LayerColors
  >) {
    colors[key] = normalizeColor(raw[key]) ?? DEFAULT_LAYER_COLORS[key];
  }
  return colors;
}

export function colorForLayer(layer: GlassLayer): string {
  const explicit = normalizeColor(layer.color);
  if (explicit) return explicit;
  const kind = layer.kind ?? "unknown";
  return DEFAULT_LAYER_COLORS[kind] ?? DEFAULT_LAYER_COLORS.unknown;
}

export type SpecData = {
  reference: string;
  glassName?: string;
  calculatedBy: string;
  calculatedAt: string;
  catalog: string;
  standard: string;
  layers: GlassLayer[];
  sections: PerfSection[];
  pinned: PerfRow[];
  projectName?: string;
  clientName?: string;
  agentName?: string;
  branding?: BrandingData;
};

export type ParseResult = {
  sections: PerfSection[];
  pinned: PerfRow[];
  layers: GlassLayer[];
  glassName?: string;
  warnings: string[];
};

export type SpecStatus = "BORRADOR" | "REVISADA" | "EMITIDA" | "ARCHIVADA";

export const SPEC_STATUSES: SpecStatus[] = [
  "BORRADOR",
  "REVISADA",
  "EMITIDA",
  "ARCHIVADA",
];

export const STATUS_LABEL: Record<string, string> = {
  BORRADOR: "Borrador",
  REVISADA: "Revisada",
  EMITIDA: "Emitida",
  ARCHIVADA: "Archivada",
};

export const STATUS_STYLE: Record<string, string> = {
  BORRADOR: "badge badge-slate",
  REVISADA: "badge badge-amber",
  EMITIDA: "badge badge-green",
  ARCHIVADA: "badge badge-red",
};

export const PROJECT_STATUSES = [
  "PROSPECTO",
  "EN_DISENO",
  "COTIZADO",
  "ADJUDICADO",
  "CERRADO",
];

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  PROSPECTO: "Prospecto",
  EN_DISENO: "En diseño",
  COTIZADO: "Cotizado",
  ADJUDICADO: "Adjudicado",
  CERRADO: "Cerrado",
};

export const SECTION_LABELS: Record<string, string> = {
  luminosos: "Factores Luminosos",
  energeticos: "Factores Energéticos",
  solares: "Factores Solares",
  termica: "Transmitancia Térmica",
  acustica: "Acústica",
  color: "Índice de reproducción de color",
  impacto: "Resistencia a impacto pendular",
  antiagresion: "Resistencia antiagresión",
  dimensiones: "Dimensiones de fabricación",
  sostenibilidad: "Sostenibilidad",
};

export const SECTION_ICONS: Record<string, string> = {
  luminosos: "icon-luminosos.png",
  energeticos: "icon-energeticos.png",
  solares: "icon-solares.png",
  termica: "icon-termica.png",
  acustica: "icon-acustica.png",
  color: "icon-color.png",
  impacto: "icon-impacto.png",
  antiagresion: "icon-antiagresion.png",
  dimensiones: "icon-dimensiones.png",
  sostenibilidad: "icon-sostenibilidad.png",
};

const ALLOWED_SECTION_ICONS = new Set([
  ...Object.values(SECTION_ICONS),
  "icon-exterior.png",
  "icon-interior.png",
]);

export function safeSectionIcon(value: unknown): string {
  if (typeof value === "string" && ALLOWED_SECTION_ICONS.has(value)) {
    return value;
  }
  return SECTION_ICONS.luminosos;
}

export const CANONICAL_ORDER = [
  "luminosos",
  "energeticos",
  "solares",
  "termica",
  "acustica",
  "color",
  "impacto",
  "antiagresion",
  "dimensiones",
  "sostenibilidad",
];

export function makeId(prefix = "row"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyData(): SpecData {
  const today = new Date().toISOString().slice(0, 10);
  return {
    reference: "",
    calculatedBy: "",
    calculatedAt: today,
    catalog: "México",
    standard: "NFRC",
    layers: [],
    sections: [],
    pinned: [],
  };
}
