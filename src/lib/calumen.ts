import {
  CANONICAL_ORDER,
  SECTION_ICONS,
  SECTION_LABELS,
  makeId,
  type GlassLayer,
  type GlassLayerKind,
  type ParseResult,
  type PerfRow,
  type PerfSection,
} from "./types";

const ICON_BY_SRC: Record<string, string> = {
  "luminousperformances.svg": "icon-luminosos.png",
  "energy.svg": "icon-energeticos.png",
  "solar.svg": "icon-solares.png",
  "thermal.svg": "icon-termica.png",
  "acousticsperformances.svg": "icon-acustica.png",
  "color.svg": "icon-color.png",
  "safety.svg": "icon-impacto.png",
  "anti-burglary.svg": "icon-antiagresion.png",
  "manufacturingsizes.svg": "icon-dimensiones.png",
  "manufacturing-sizes.svg": "icon-dimensiones.png",
  "sustainability.svg": "icon-sostenibilidad.png",
};

/** Quita acentos, espacios y signos para comparar etiquetas. */
export function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanText(node: Element | null | undefined): string {
  if (!node) return "";
  const clone = node.cloneNode(true) as Element;
  clone
    .querySelectorAll(
      "a, img, svg, button, script, style, .custom-link-btn, .pdf-hide, p-button",
    )
    .forEach((n) => n.remove());
  return (clone.textContent ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function iconFromSrc(src: string | null | undefined): string | null {
  if (!src) return null;
  const base = src.split("/").pop()?.toLowerCase() ?? "";
  return ICON_BY_SRC[base] ?? null;
}

function keyForSection(icon: string | null, title: string): string {
  if (icon) {
    const entry = Object.entries(SECTION_ICONS).find(([, file]) => file === icon);
    if (entry) return entry[0];
  }
  const t = normalizeKey(title);
  if (t.includes("luminos")) return "luminosos";
  if (t.includes("energ")) return "energeticos";
  if (t.includes("solar")) return "solares";
  if (t.includes("transmitancia") || t.includes("termica")) return "termica";
  if (t.includes("acust")) return "acustica";
  if (t.includes("color")) return "color";
  if (t.includes("impacto")) return "impacto";
  if (t.includes("antiagres")) return "antiagresion";
  if (t.includes("dimension") || t.includes("fabricacion")) return "dimensiones";
  if (t.includes("sostenib")) return "sostenibilidad";
  return `custom_${normalizeKey(title).replace(/ /g, "_") || "seccion"}`;
}

function isSkippable(el: Element): boolean {
  const parent = el.parentElement;
  if (parent?.closest(".performance-units")) return true;
  return false;
}

function rowValue(el: Element): string {
  const children = Array.from(el.children).filter(
    (c) => !c.classList.contains("performance-units-left"),
  );
  const parts = children.map((c) => cleanText(c)).filter(Boolean);
  return Array.from(new Set(parts)).join(" ").trim();
}

function parseRows(scope: Element): PerfRow[] {
  const rows: PerfRow[] = [];
  const seen = new Set<string>();

  scope.querySelectorAll(".performance-units").forEach((el) => {
    if (isSkippable(el)) return;

    const left = el.querySelector(".performance-units-left");
    const label = cleanText(left);
    const italic = cleanText(el.querySelector("i"));
    const value = left ? rowValue(el) : "";

    if (!label && !italic) return;

    let kind: PerfRow["kind"] = "row";
    if (!left && italic) kind = "note";
    else if (left && !value) kind = "heading";

    const finalLabel = label || italic;
    const dedupe = `${kind}|${normalizeKey(finalLabel)}|${value}`;
    if (seen.has(dedupe)) return;
    seen.add(dedupe);

    rows.push({
      id: makeId("row"),
      label: finalLabel,
      value: value || undefined,
      kind,
    });
  });

  return rows;
}

function pinnedRows(root: Element): PerfRow[] {
  const pinned = root.querySelector(".pinned-performances");
  if (!pinned) return [];
  return parseRows(pinned).filter((r) => r.kind === "row");
}

function normalizeThickness(raw: string): string | undefined {
  const value = raw.replace(/\u00a0/g, " ").trim();
  if (!value) return undefined;
  const match = value
    .replace(",", ".")
    .match(/(\d+(?:\.\d+)?)\s*(mm|cm|m)?/i);
  if (!match) return undefined;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  const unit = (match[2] ?? "mm").toLowerCase();
  const mm = unit === "cm" ? amount * 10 : unit === "m" ? amount * 1000 : amount;
  return `${Number(mm.toFixed(3))}mm`;
}

function findConfiguratorScope(root: ParentNode): ParentNode {
  const configurators = Array.from(root.querySelectorAll("app-configurator"));
  const withLayers = configurators.find((element) =>
    element.querySelector(".glazing-layers__item"),
  );
  if (withLayers) return withLayers;
  const layers = root.querySelector(".glazing-layers");
  return layers?.closest("app-configurator") ?? root;
}

function layerKindFromNode(node: Element): GlassLayerKind {
  if (
    node.classList.contains("layer-substrate") ||
    node.classList.contains("open-layer--substrate")
  )
    return "substrate";
  if (
    node.classList.contains("layer-coating") ||
    node.classList.contains("open-layer--coating")
  )
    return "coating";
  if (
    node.classList.contains("layer-cavity") ||
    node.classList.contains("open-layer--cavity")
  )
    return "cavity";
  if (
    node.classList.contains("layer-air") ||
    node.classList.contains("open-layer--air")
  )
    return "air";
  if (
    node.classList.contains("layer-interlayer") ||
    node.classList.contains("open-layer--interlayer")
  )
    return "interlayer";
  if (
    node.classList.contains("layer-enamel") ||
    node.classList.contains("open-layer--enamel")
  )
    return "enamel";
  return "unknown";
}

type DetailedLayerConfig = {
  kind: GlassLayerKind;
  material?: string;
  thickness?: string;
  treatment?: string;
  laminated?: boolean;
};

/**
 * Lee los paneles de edición del configurador (Tipo, Espesor, Tratamiento
 * térmico y Laminar) para precargar las selecciones en la ficha interna.
 */
function parseDetailedLayerConfig(root: ParentNode): DetailedLayerConfig[] {
  const details: DetailedLayerConfig[] = [];

  root.querySelectorAll(".glazing-configurator .open-layer").forEach((block) => {
    const kind = layerKindFromNode(block);
    const labels = Array.from(block.querySelectorAll(".p-dropdown-label"))
      .map((label) => cleanText(label))
      .filter(Boolean);
    if (labels.length === 0) return;

    const checkbox = block.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement | null;

    details.push({
      kind,
      material: labels[0] || undefined,
      thickness: normalizeThickness(labels[1] ?? ""),
      treatment: labels[2] || undefined,
      laminated: checkbox ? checkbox.checked : undefined,
    });
  });

  return details;
}

function parseConfiguratorLayers(root: ParentNode): GlassLayer[] {
  const containers = Array.from(root.querySelectorAll(".glazing-layers"));
  const container = containers.find((element) =>
    element.querySelector(".glazing-layers__item"),
  );
  if (!container) return [];

  const layers: GlassLayer[] = [];
  const details = parseDetailedLayerConfig(root);
  const usedDetails = new Set<number>();
  const description = cleanText(root.querySelector(".open-layer-desc"));
  const positionMatch = description.match(/#(\d+)/);
  const coatingPosition = positionMatch ? Number(positionMatch[1]) : undefined;

  container.querySelectorAll(".glazing-layers__item").forEach((item) => {
    const node = item.querySelector(
      ".layer-substrate, .layer-interlayer, .layer-cavity, .layer-air, .layer-coating, .layer-enamel",
    );
    if (!node) return;

    const kind = layerKindFromNode(node);
    const title =
      (node.getAttribute("title") ?? item.getAttribute("title") ?? "").trim() ||
      cleanText(node);
    const fallbackMaterial =
      kind === "cavity"
        ? "Cámara"
        : kind === "air"
          ? "Cámara de aire"
          : "";
    let material = title || fallbackMaterial;
    let thickness = normalizeThickness(
      cleanText(item.querySelector(".layer-thickness")),
    );
    let treatment: string | undefined;
    let laminated: boolean | undefined;

    // Enriquecer con el panel de edición correspondiente (sustratos, capas).
    const detailIndex = details.findIndex(
      (detail, index) =>
        !usedDetails.has(index) &&
        detail.kind === kind &&
        detail.material !== undefined,
    );
    if (detailIndex >= 0) {
      const detail = details[detailIndex];
      usedDetails.add(detailIndex);
      if (detail.material) material = detail.material;
      thickness = detail.thickness ?? thickness;
      treatment = detail.treatment;
      laminated = detail.laminated;
    }

    if (!material) return;

    layers.push({
      material,
      thickness,
      treatment,
      kind,
      laminated,
      position:
        kind === "coating" && Number.isFinite(coatingPosition)
          ? coatingPosition
          : undefined,
    });
  });

  return layers;
}

/**
 * Convierte el HTML del bloque `app-performances-overview` de Calumen en
 * una estructura editable de secciones y prestaciones.
 */
export function parseCalumenHtml(html: string): ParseResult {
  const warnings: string[] = [];
  if (!html.trim()) {
    return {
      sections: [],
      pinned: [],
      layers: [],
      warnings: ["Pega primero el HTML."],
    };
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const root =
    doc.querySelector("app-performances-overview") ??
    doc.querySelector(".performance-info-wrapper") ??
    doc.body;

  if (!root) {
    return {
      sections: [],
      pinned: [],
      layers: [],
      warnings: ["No se encontró el bloque de prestaciones en el HTML."],
    };
  }

  const sections: PerfSection[] = [];

  root.querySelectorAll(".configurator-accordion-item").forEach((item) => {
    if (item.classList.contains("pinned-performances")) return;

    const header = item.querySelector(".accordion-header");
    if (!header) return;

    const title =
      cleanText(header.querySelector(".title")) ||
      cleanText(header.querySelector(".header-left"));
    if (!title) return;

    const standard = cleanText(header.querySelector(".standard-title"));
    const icon =
      iconFromSrc(header.querySelector(".image-box img")?.getAttribute("src")) ??
      SECTION_ICONS[keyForSection(null, title)] ??
      "icon-luminosos.png";
    const key = keyForSection(icon, title);
    const body = item.querySelector(".accordion-body") ?? item;
    const rows = parseRows(body);

    if (rows.length === 0) return;

    sections.push({
      id: makeId("sec"),
      key,
      title: SECTION_LABELS[key] ?? title,
      standard: standard || undefined,
      icon,
      rows,
    });
  });

  const pinned = pinnedRows(root);
  const configScope = findConfiguratorScope(doc);
  const layers = parseConfiguratorLayers(configScope);
  const glassName =
    cleanText(configScope.querySelector(".open-layer-name")) || undefined;

  if (sections.length === 0) {
    warnings.push(
      layers.length > 0
        ? "No se detectaron prestaciones en este HTML; se actualizó la composición del vidrio."
        : "No se detectaron apartados. Verifica que hayas pegado el bloque completo de prestaciones.",
    );
  }

  const ordered = orderSections(sections);
  return {
    sections: mergePinnedRows(ordered, pinned),
    pinned,
    layers,
    glassName,
    warnings,
  };
}

export function orderSections(sections: PerfSection[]): PerfSection[] {
  const rank = (key: string) => {
    const i = CANONICAL_ORDER.indexOf(key);
    return i === -1 ? CANONICAL_ORDER.length : i;
  };
  return [...sections].sort((a, b) => rank(a.key) - rank(b.key));
}

/** Añade al final las prestaciones fijadas que no aparezcan en ningún apartado. */
function mergePinnedRows(
  sections: PerfSection[],
  pinned: PerfRow[],
): PerfSection[] {
  if (pinned.length === 0) return sections;

  const present = new Set<string>();
  sections.forEach((s) =>
    s.rows.forEach((r) => present.add(normalizeKey(r.label))),
  );

  const missing = pinned.filter((p) => {
    const key = normalizeKey(p.label);
    return !Array.from(present).some(
      (t) => t === key || t.includes(key) || key.includes(t),
    );
  });

  if (missing.length === 0) return sections;

  return [
    ...sections,
    {
      id: makeId("sec"),
      key: "pinned",
      title: "Prestaciones fijadas",
      icon: "icon-solares.png",
      rows: missing.map((r) => ({ ...r, id: makeId("row") })),
    },
  ];
}

function inferLayerKind(material: string): GlassLayerKind {
  const key = normalizeKey(material);
  if (/\b(air|aire)\b/.test(key)) return "air";
  if (/camara|cavity|argon|kripton|krypton|gas/.test(key)) return "cavity";
  if (/pvb|sentry|butiral|ionoplast|eva|interlayer/.test(key))
    return "interlayer";
  if (/serigrafia|enamel/.test(key)) return "enamel";
  if (/planitherm|cool.?lite|stopray|suncool|coating|low.?e/.test(key))
    return "coating";
  return "substrate";
}

/** Acepta una línea por capa: MATERIAL(12mm) - Tratamiento */
export function parseLayers(text: string): GlassLayer[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(
        /^(.*?)(?:\s*\(([^)]*)\))?(?:\s*[-–—]\s*(.+))?$/,
      );
      if (!match) return { material: line, kind: "unknown" } satisfies GlassLayer;
      const [, material, thickness, treatment] = match;
      return {
        material: (material ?? "").trim(),
        thickness: thickness?.trim() || undefined,
        treatment: treatment?.trim() || undefined,
        kind: inferLayerKind(material ?? ""),
      } satisfies GlassLayer;
    })
    .filter((l) => l.material.length > 0);
}

export function layerLabel(layer: GlassLayer): string {
  const size = layer.thickness ? `(${layer.thickness})` : "";
  const treatment = layer.treatment ? ` - ${layer.treatment}` : "";
  return `${layer.material}${size}${treatment}`;
}

export function layersToText(layers: GlassLayer[]): string {
  return layers.map(layerLabel).join("\n");
}

export function layerRequiresThickness(layer: GlassLayer): boolean {
  return layer.kind !== "coating" && layer.kind !== "enamel";
}

export function layersThickness(layers: GlassLayer[]): string {
  const total = layers.reduce((acc, layer) => acc + (thicknessMm(layer) ?? 0), 0);
  const partial = layers.some(
    (layer) => layerRequiresThickness(layer) && thicknessMm(layer) === null,
  );
  return total > 0
    ? `${total.toFixed(1).replace(/\.0$/, "")} mm${partial ? " (parcial)" : ""}`
    : "—";
}

/**
 * Conserva espesores y tratamientos ya introducidos cuando se vuelve a analizar
 * el configurador y este no incluye esos datos.
 */
export function mergeParsedLayers(
  current: GlassLayer[],
  parsed: GlassLayer[],
): GlassLayer[] {
  return parsed.map((layer, index) => {
    const previous = current[index];
    if (
      !previous ||
      normalizeKey(previous.material) !== normalizeKey(layer.material)
    ) {
      return layer;
    }
    return {
      material: layer.material,
      thickness: layer.thickness ?? previous.thickness,
      treatment: layer.treatment ?? previous.treatment,
      kind: layer.kind ?? previous.kind,
      laminated: layer.laminated ?? previous.laminated,
      position: layer.position ?? previous.position,
      color: layer.color ?? previous.color,
    };
  });
}

const INTERLAYER_PATTERN =
  /pvb|sentry|butiral|ionoplast|eva|interlayer|aire|argon|argón|kripton|krypton|gas/i;

/** Espesor numérico en mm. Acepta "12mm", "1,52 mm", "0.76"… */
export function thicknessMm(layer: GlassLayer): number | null {
  if (!layer.thickness) return null;
  const match = layer.thickness.replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function isInterlayer(layer: GlassLayer): boolean {
  return INTERLAYER_PATTERN.test(`${layer.material} ${layer.treatment ?? ""}`);
}

function fallbackThicknessFor(layer: GlassLayer, glassFallback: number): number {
  if (layer.kind === "coating") return 0.05;
  if (layer.kind === "enamel") return 0.2;
  if (!isInterlayer(layer)) return glassFallback;
  const label = `${layer.material} ${layer.treatment ?? ""}`;
  if (/aire|argon|argón|kripton|krypton|gas|cavity|cámara|camara/i.test(label)) {
    return 12;
  }
  return 1.52;
}

export type GlassBar = { width: number; interlayer: boolean };

/**
 * Anchos proporcionales al espesor de cada capa. La suma se limita a
 * `maxWidth` para que el diagrama siempre quepa en la ficha.
 */
export function glassLayerBars(
  layers: GlassLayer[],
  options: { maxWidth?: number; maxScale?: number; minWidth?: number } = {},
): GlassBar[] {
  const { maxWidth = 52, maxScale = 2.2, minWidth = 0.8 } = options;

  if (layers.length === 0) {
    return [
      { width: 8.4, interlayer: false },
      { width: 8.4, interlayer: false },
    ];
  }

  const thicknesses = layers.map((layer) => thicknessMm(layer));
  const known = thicknesses.filter((value): value is number => value !== null);
  const fallback = known.length
    ? known.reduce((acc, value) => acc + value, 0) / known.length
    : 4;
  const values = thicknesses.map(
    (value, index) => value ?? fallbackThicknessFor(layers[index], fallback),
  );
  const total = values.reduce((acc, value) => acc + value, 0);
  const scale = Math.min(maxScale, maxWidth / Math.max(total, 0.1));

  return layers.map((layer, index) => ({
    width: Math.max(minWidth, values[index] * scale),
    interlayer: isInterlayer(layer),
  }));
}

/** Caracteres que las fuentes estándar del PDF no incluyen. */
export function pdfSafe(value: string | undefined | null): string {
  if (!value) return "";
  return value
    .replace(/[\u2080-\u2089]/g, (c) => String(c.charCodeAt(0) - 0x2080))
    .replace(/\u00ad/g, "")
    .replace(/\u200b/g, "")
    .replace(/\ufffd/g, "");
}
