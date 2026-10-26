import "server-only";

import { prisma } from "./db";
import { specToData, type FullSpec } from "./specs";
import { layerLabel } from "./calumen";
import { productToProfile } from "./products";
import type { PerfSection } from "./types";

const SUMMARY_LIMIT = 60;
const DETAIL_LIMIT = 4;
const ISSUED_DETAIL_LIMIT = 8;
const PRODUCT_SUMMARY_LIMIT = 40;
const PRODUCT_DETAIL_LIMIT = 3;
const PRODUCT_SHEET_BUDGET = 48_000;

type ProductRow = Parameters<typeof productToProfile>[0];

const STOPWORDS = new Set([
  "ficha",
  "fichas",
  "tengo",
  "tenemos",
  "sobre",
  "para",
  "como",
  "cual",
  "cuales",
  "qué",
  "que",
  "del",
  "las",
  "los",
  "con",
  "por",
  "una",
  "unos",
  "unas",
  "datos",
  "dime",
  "resume",
  "resumen",
  "información",
  "informacion",
  "guardadas",
  "guardada",
  "producto",
  "productos",
  "puedes",
  "ayuda",
  "analiza",
  "revisa",
  "técnicas",
  "tecnicas",
  "especificaciones",
]);

const KEY_PATTERNS: RegExp[] = [
  /luminosa/i,
  /reflexi[oó]n exterior/i,
  /reflexi[oó]n interior/i,
  /transmisi[oó]n energ[eé]tica/i,
  /^uv\b/i,
  /shgc/i,
  /sombra/i,
  /ug verano/i,
  /ug invierno/i,
  /^rw\b/i,
  /^ra\b/i,
  /^ra,tr\b/i,
  /^stc\b/i,
  /^oitc\b/i,
  /espesor/i,
  /peso/i,
];

function keywords(query: string): string[] {
  const clean = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const words = clean.match(/[a-z0-9.]{4,}/g) ?? [];
  return Array.from(new Set(words.filter((word) => !STOPWORDS.has(word)))).slice(
    0,
    4,
  );
}

function keyValues(sections: PerfSection[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const section of sections) {
    for (const row of section.rows) {
      if (!row.value) continue;
      const label = row.label.trim();
      if (KEY_PATTERNS.some((pattern) => pattern.test(label))) {
        values[label] = row.value;
      }
    }
  }
  return values;
}

function baseMeta(spec: FullSpec) {
  return {
    folio: spec.reference,
    nombreComercial: spec.glassName || spec.reference,
    estado: spec.status,
    recomendable: spec.status === "EMITIDA",
    cliente: spec.project.client.name,
    proyecto: spec.project.name,
    agente: spec.agent?.name ?? null,
    actualizada: spec.updatedAt.toISOString().slice(0, 10),
  };
}

function summaryOf(spec: FullSpec) {
  const data = specToData(spec);
  return {
    ...baseMeta(spec),
    composicion: data.layers.map(layerLabel),
    valoresClave: keyValues(data.sections),
  };
}

function detailOf(spec: FullSpec) {
  const data = specToData(spec);
  return {
    ...baseMeta(spec),
    calculadoPor: data.calculatedBy || null,
    calculadoEn: data.calculatedAt || null,
    catalogo: data.catalog || null,
    normas: data.standard || null,
    composicion: data.layers.map(layerLabel),
    apartados: data.sections
      .filter((section) => !section.hidden)
      .map((section) => ({
        titulo: section.title,
        norma: section.standard ?? null,
        valores: section.rows
          .filter((row) => Boolean(row.value))
          .map((row) => `${row.label}: ${row.value}`),
        notas: section.rows
          .filter((row) => !row.value || row.kind !== "row")
          .map((row) => row.label),
      })),
  };
}

function productSummary(product: ProductRow) {
  const profile = productToProfile(product);
  return {
    id: profile.id,
    nombre: profile.name,
    codigo: profile.code || null,
    categoria: profile.category || null,
    fabricante: profile.manufacturer || null,
    resumen: profile.summary || profile.description || null,
    activo: profile.active,
    composicion: profile.layers.map(layerLabel),
    valoresClave: profile.keyValues,
    colores: profile.colors,
    fuente: profile.sourceName ?? null,
    tipoFuente: profile.sourceType ?? null,
    actualizado: profile.updatedAt?.slice(0, 10) ?? null,
  };
}

function productDetail(product: ProductRow) {
  const profile = productToProfile(product);
  return {
    ...productSummary(product),
    descripcion: profile.description || null,
    fuente: profile.sourceName ?? null,
    apartados: profile.sections.map((section) => ({
      titulo: section.title,
      norma: section.standard ?? null,
      valores: section.rows
        .filter((row) => Boolean(row.value))
        .map((row) => `${row.label}: ${row.value}`),
    })),
  };
}

/**
 * Construye el contexto de solo lectura que se envía al modelo: un resumen de
 * todas las fichas guardadas, detalle de las más relevantes y cifras globales.
 */
export async function buildAiCatalog(
  query: string,
  currentSpecId?: string,
  currentProductId?: string,
): Promise<string> {
  const include = {
    project: { include: { client: true } },
    agent: true,
  } as const;

  const [
    total,
    byStatus,
    clients,
    projects,
    agents,
    latest,
    issued,
    productTotal,
    productActive,
    latestProducts,
  ] = await Promise.all([
    prisma.specification.count(),
    prisma.specification.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.client.count(),
    prisma.project.count(),
    prisma.salesAgent.count({ where: { active: true } }),
    prisma.specification.findMany({
      include,
      orderBy: { updatedAt: "desc" },
      take: SUMMARY_LIMIT,
    }),
    prisma.specification.findMany({
      where: { status: "EMITIDA" },
      include,
      orderBy: { updatedAt: "desc" },
      take: SUMMARY_LIMIT,
    }),
    prisma.product.count(),
    prisma.product.count({ where: { active: true } }),
    prisma.product.findMany({
      orderBy: { updatedAt: "desc" },
      take: PRODUCT_SUMMARY_LIMIT,
    }),
  ]);

  const extra: FullSpec[] = [];

  if (currentSpecId) {
    const current = await prisma.specification.findUnique({
      where: { id: currentSpecId },
      include,
    });
    if (current) extra.push(current);
  }

  const productExtras: ProductRow[] = [];
  if (currentProductId) {
    const currentProduct = await prisma.product.findUnique({
      where: { id: currentProductId },
    });
    if (currentProduct) productExtras.push(currentProduct);
  }

  const words = keywords(query);
  if (words.length > 0) {
    const matchedProducts = await prisma.product.findMany({
      where: {
        OR: words.flatMap((word) => [
          { name: { contains: word } },
          { code: { contains: word } },
          { category: { contains: word } },
          { manufacturer: { contains: word } },
          { description: { contains: word } },
          { rawText: { contains: word } },
        ]),
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
    });
    productExtras.push(...matchedProducts);
  }

  if (words.length > 0) {
    const matched = await prisma.specification.findMany({
      where: {
        OR: words.flatMap((word) => [
          { reference: { contains: word } },
          { glassName: { contains: word } },
          { project: { name: { contains: word } } },
          { project: { client: { name: { contains: word } } } },
        ]),
      },
      include,
      orderBy: { updatedAt: "desc" },
      take: 3,
    });
    extra.push(...matched);
  }

  const summaryPool = [...extra, ...issued, ...latest];
  const unique = Array.from(
    new Map(summaryPool.map((spec) => [spec.id, spec])).values(),
  ).slice(0, SUMMARY_LIMIT);

  const detailPool = Array.from(
    new Map(summaryPool.map((spec) => [spec.id, spec])).values(),
  );
  const detailLimit = Math.min(
    ISSUED_DETAIL_LIMIT + 4,
    Math.max(DETAIL_LIMIT, issued.length + Math.min(extra.length, 2)),
  );
  const details = detailPool.slice(0, detailLimit);

  const uniqueProducts = Array.from(
    new Map(
      [...productExtras, ...latestProducts].map((product) => [
        product.id,
        product,
      ]),
    ).values(),
  ).slice(0, PRODUCT_SUMMARY_LIMIT);

  const productDetails = Array.from(
    new Map(
      [...productExtras, ...latestProducts].map((product) => [
        product.id,
        product,
      ]),
    ).values(),
  ).slice(0, PRODUCT_DETAIL_LIMIT);

  const sheetLimit =
    uniqueProducts.length > 0
      ? Math.max(
          1_200,
          Math.floor(PRODUCT_SHEET_BUDGET / uniqueProducts.length),
        )
      : 0;
  const fichasProductos = uniqueProducts
    .map((product) => {
      const source = product.rawText?.trim();
      if (!source || sheetLimit === 0) return null;
      return {
        id: product.id,
        nombre: product.name,
        codigo: product.code || null,
        fuente: product.sourceName ?? null,
        tipoFuente: product.sourceType ?? null,
        texto: source.slice(0, sheetLimit),
        truncado: source.length > sheetLimit,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const porEstado = Object.fromEntries(
    byStatus.map((item) => [item.status, item._count._all]),
  );

  const catalog = {
    resumen: {
      fichasGuardadas: total,
      porEstado,
      clientes: clients,
      proyectos: projects,
      agentesActivos: agents,
      productos: productTotal,
      productosActivos: productActive,
      nota:
        total > unique.length
          ? `Se muestran las ${unique.length} fichas más relevantes de ${total}.`
          : undefined,
    },
    fichas: unique.map(summaryOf),
    detalle: details.map(detailOf),
    productos: uniqueProducts.map(productSummary),
    detalleProductos: productDetails.map(productDetail),
    fichasProductos,
    recomendacion: {
      regla:
        "Para recomendar una composición usa únicamente fichas con estado EMITIDA (recomendable: true). Para recomendar un producto usa el catálogo de productos. Si ninguna ficha emitida cumple, dilo claramente.",
      fichasEmitidas: issued.map((spec) => spec.reference),
      totalFichasEmitidas: issued.length,
      productosDisponibles: uniqueProducts.length,
    },
  };

  return JSON.stringify(catalog);
}
