import type { BrandingData, GlassLayer, PerfRow, PerfSection, SpecStatus } from "./types";
import {
  SPEC_STATUSES,
  makeId,
  normalizeBranding,
  safeSectionIcon,
} from "./types";

export type SpecInput = {
  reference: string;
  projectId: string;
  agentId: string | null;
  glassName: string;
  calculatedBy: string;
  calculatedAt: Date;
  catalog: string;
  standard: string;
  status: SpecStatus;
  notes: string;
  layers: GlassLayer[];
  sections: PerfSection[];
  pinned: PerfRow[];
  rawHtml: string | null;
  branding?: BrandingData;
};

function str(value: unknown, max = 20000): string {
  if (typeof value !== "string") return "";
  return value.slice(0, max);
}

function normalizeRows(input: unknown): PerfRow[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw): PerfRow | null => {
      const item = raw as Partial<PerfRow> | null;
      if (!item) return null;
      const label = str(item.label, 600).trim();
      if (!label) return null;
      const kind =
        item.kind === "note" || item.kind === "heading" ? item.kind : "row";
      const value = str(item.value, 400).trim();
      return {
        id: str(item.id, 60) || makeId("row"),
        label,
        value: value || undefined,
        kind,
      };
    })
    .filter((row): row is PerfRow => Boolean(row));
}

function normalizeSections(input: unknown): PerfSection[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw): PerfSection | null => {
      const item = raw as Partial<PerfSection> | null;
      if (!item) return null;
      const title = str(item.title, 300).trim();
      if (!title) return null;
      return {
        id: str(item.id, 60) || makeId("sec"),
        key: str(item.key, 80) || "custom",
        title,
        standard: str(item.standard, 160).trim() || undefined,
        icon: safeSectionIcon(item.icon),
        rows: normalizeRows(item.rows),
        hidden: Boolean(item.hidden),
      };
    })
    .filter((section): section is PerfSection => Boolean(section));
}

const LAYER_KINDS = [
  "substrate",
  "coating",
  "cavity",
  "air",
  "interlayer",
  "enamel",
  "unknown",
] as const;

function normalizeLayers(input: unknown): GlassLayer[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw): GlassLayer | null => {
      const item = raw as Partial<GlassLayer> | null;
      if (!item) return null;
      const material = str(item.material, 200).trim();
      if (!material) return null;
      const kindRaw = str(item.kind, 30);
      const kind = (LAYER_KINDS as readonly string[]).includes(kindRaw)
        ? (kindRaw as GlassLayer["kind"])
        : undefined;
      const position = Number(item.position);
      return {
        material,
        thickness: str(item.thickness, 60).trim() || undefined,
        treatment: str(item.treatment, 200).trim() || undefined,
        kind,
        laminated:
          typeof item.laminated === "boolean" ? item.laminated : undefined,
        position:
          Number.isFinite(position) && position > 0 ? position : undefined,
        color:
          typeof item.color === "string" &&
          /^#[0-9a-f]{6}$/i.test(item.color.trim())
            ? item.color.trim().toLowerCase()
            : undefined,
      };
    })
    .filter((layer): layer is GlassLayer => Boolean(layer));
}

function parseDate(value: unknown): Date {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00.000Z`);
  }
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

export function parseSpecInput(
  body: Record<string, unknown>,
): { ok: true; value: SpecInput } | { ok: false; error: string } {
  const reference = str(body.reference, 200).trim();
  const projectId = str(body.projectId, 80).trim();

  if (!reference) return { ok: false, error: "La referencia es obligatoria." };
  if (!projectId) return { ok: false, error: "Selecciona un proyecto." };

  const statusRaw = str(body.status, 30) as SpecStatus;
  const status = SPEC_STATUSES.includes(statusRaw) ? statusRaw : "BORRADOR";

  return {
    ok: true,
    value: {
      reference,
      projectId,
      agentId: str(body.agentId, 80).trim() || null,
      glassName: str(body.glassName, 200).trim(),
      calculatedBy: str(body.calculatedBy, 200).trim(),
      calculatedAt: parseDate(body.calculatedAt),
      catalog: str(body.catalog, 120).trim() || "México",
      standard: str(body.standard, 120).trim() || "NFRC",
      status,
      notes: str(body.notes, 5000).trim(),
      layers: normalizeLayers(body.layers),
      sections: normalizeSections(body.sections),
      pinned: normalizeRows(body.pinned),
      rawHtml: str(body.rawHtml, 400000) || null,
      branding: normalizeBranding(body.branding),
    },
  };
}

export function parseDataForPdf(body: Record<string, unknown>) {
  return {
    reference: str(body.reference, 200).trim() || "Ficha técnica",
    glassName: str(body.glassName, 200).trim() || undefined,
    calculatedBy: str(body.calculatedBy, 200).trim(),
    calculatedAt: str(body.calculatedAt, 40),
    catalog: str(body.catalog, 120).trim() || "México",
    standard: str(body.standard, 120).trim() || "NFRC",
    projectName: str(body.projectName, 200).trim() || undefined,
    clientName: str(body.clientName, 200).trim() || undefined,
    agentName: str(body.agentName, 200).trim() || undefined,
    layers: normalizeLayers(body.layers),
    sections: normalizeSections(body.sections),
    pinned: normalizeRows(body.pinned),
    branding: normalizeBranding(body.branding),
  };
}
