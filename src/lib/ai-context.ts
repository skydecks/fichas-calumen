import { layerLabel } from "./calumen";
import type { GlassLayer, PerfSection } from "./types";
import type { ProductRecord } from "./products";

export type AIFichaContext = {
  fichaId?: string;
  productId?: string;
  folio: string;
  nombreComercial: string;
  estado: string;
  proyecto?: string;
  cliente?: string;
  agente?: string;
  calculadoPor?: string;
  calculadoEn?: string;
  catalogo?: string;
  normas?: string;
  composicion: string[];
  fuente?: string;
  textoFuente?: string;
  apartados: {
    titulo: string;
    norma?: string;
    valores: string[];
    notas: string[];
  }[];
};

export function buildAIContextFromSections(params: {
  fichaId?: string;
  reference: string;
  glassName: string;
  status: string;
  projectName?: string;
  clientName?: string;
  agentName?: string;
  calculatedBy?: string;
  calculatedAt?: string;
  catalog?: string;
  standard?: string;
  layers: GlassLayer[];
  sections: PerfSection[];
}): AIFichaContext {
  return {
    fichaId: params.fichaId,
    folio: params.reference,
    nombreComercial: params.glassName,
    estado: params.status,
    proyecto: params.projectName,
    cliente: params.clientName,
    agente: params.agentName,
    calculadoPor: params.calculatedBy,
    calculadoEn: params.calculatedAt,
    catalogo: params.catalog,
    normas: params.standard,
    composicion: params.layers.map(layerLabel),
    apartados: params.sections
      .filter((section) => !section.hidden)
      .map((section) => ({
        titulo: section.title,
        norma: section.standard,
        valores: section.rows
          .filter((row) => Boolean(row.value))
          .map((row) => `${row.label}: ${row.value}`),
        notas: section.rows
          .filter((row) => !row.value || row.kind !== "row")
          .map((row) => row.label),
      })),
  };
}

export function buildAIContextFromProduct(
  product: ProductRecord,
  sourceText?: string | null,
): AIFichaContext {
  const standards = Array.from(
    new Set(
      product.sections
        .map((section) => section.standard)
        .filter((standard): standard is string => Boolean(standard)),
    ),
  );
  return {
    productId: product.id,
    folio: product.code || product.name,
    nombreComercial: product.name,
    estado: "Producto de catálogo",
    calculadoPor: product.manufacturer || undefined,
    calculadoEn: product.updatedAt,
    catalogo: product.category || undefined,
    normas: standards.join(" · ") || undefined,
    composicion: product.layers.map((layer) => {
      const parts = [layer.material];
      if (layer.thickness) parts.push(`(${layer.thickness})`);
      if (layer.treatment) parts.push(`- ${layer.treatment}`);
      return parts.join(" ");
    }),
    fuente: product.sourceName || undefined,
    textoFuente: sourceText?.trim().slice(0, 14_000) || undefined,
    apartados: product.sections.map((section) => ({
      titulo: section.title,
      norma: section.standard,
      valores: section.rows
        .filter((row) => Boolean(row.value))
        .map((row) => `${row.label}: ${row.value}`),
      notas: section.rows
        .filter((row) => !row.value || row.kind !== "row")
        .map((row) => row.label),
    })),
  };
}
