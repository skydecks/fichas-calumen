import type { Prisma } from "@prisma/client";
import type { GlassLayer, PerfRow, PerfSection, SpecData } from "./types";
import { toDateInput } from "./utils";
import { normalizeBranding, safeSectionIcon, type BrandingData } from "./types";

export type FullSpec = Prisma.SpecificationGetPayload<{
  include: {
    project: { include: { client: true } };
    agent: true;
  };
}>;

export type SpecListItem = Prisma.SpecificationGetPayload<{
  include: {
    project: { include: { client: true } };
    agent: true;
  };
}>;

export type StoredSpecData = {
  sections: PerfSection[];
  pinned: PerfRow[];
  glassName?: string;
  branding?: BrandingData;
};

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function specToData(spec: FullSpec): SpecData {
  const stored = parseJson<StoredSpecData>(spec.data, {
    sections: [],
    pinned: [],
  });

  return {
    reference: spec.reference,
    glassName: spec.glassName || undefined,
    calculatedBy: spec.calculatedBy ?? "",
    calculatedAt: toDateInput(spec.calculatedAt) || toDateInput(spec.issuedAt),
    catalog: spec.catalog ?? "México",
    standard: spec.standard ?? "NFRC",
    layers: parseJson<GlassLayer[]>(spec.glassLayers, []),
    sections: Array.isArray(stored.sections)
      ? stored.sections.map((section) => ({
          ...section,
          icon: safeSectionIcon(section.icon),
        }))
      : [],
    pinned: Array.isArray(stored.pinned) ? stored.pinned : [],
    projectName: spec.project?.name,
    clientName: spec.project?.client?.name,
    agentName: spec.agent?.name ?? undefined,
    branding: normalizeBranding(stored.branding),
  };
}

export function storagePayload(data: StoredSpecData): string {
  return JSON.stringify({
    sections: data.sections,
    pinned: data.pinned,
    glassName: data.glassName,
    branding: data.branding,
  });
}
