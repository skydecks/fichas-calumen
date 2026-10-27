import type { GlassLayer, PerfRow, PerfSection } from "./types";
import { makeId, SECTION_ICONS, SECTION_LABELS } from "./types";
import { orderSections } from "./calumen";

interface PdfTextItem {
  s: string;
  x: number;
  y: number;
  w: number;
}

interface PageCluster {
  y: number;
  items: PdfTextItem[];
}

function clusterByLine(items: PdfTextItem[], tolerance = 2.5): PageCluster[] {
  const lines: PageCluster[] = [];
  for (const item of items) {
    let line = lines.find((l) => Math.abs(l.y - item.y) < tolerance);
    if (!line) {
      line = { y: item.y, items: [] };
      lines.push(line);
    }
    line.items.push(item);
  }
  lines.sort((a, b) => b.y - a.y);
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
  }
  return lines;
}

function textOf(items: PdfTextItem[]): string {
  return items.map((i) => i.s).join(" ").trim();
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

function sectionKey(title: string): string {
  const t = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
  return `custom_${t.replace(/ /g, "_") || "seccion"}`;
}

const CANONICAL_SECTION_TITLES = [
  "Factores Luminosos",
  "Factores Energéticos",
  "Factores Solares",
  "Transmitancia Térmica",
  "Acústica",
  "Indice de reproducción de color",
  "Resistencia a impacto pendular",
  "Resistencia antiagresión",
  "Dimensiones de fabricación",
  "Sostenibilidad",
];

/**
 * Extrae secciones, capas y metadatos del texto de un PDF de Calumen.
 * Soporta de forma nativa vidrios monolíticos, laminados, e insulados (doble/triple acristalamiento DGU/TGU)
 * con capas de control solar/bajo emisivo y cámaras de aire/argón.
 */
export function parseCalumenPdfText(
  items: PdfTextItem[],
  meta: { calculatedBy?: string; calculatedAt?: string; catalog?: string; standard?: string },
): {
  sections: PerfSection[];
  layers: GlassLayer[];
  glassName?: string;
  warnings: string[];
  documentTitle?: string;
  rawText: string;
} {
  const warnings: string[] = [];

  // 1. HEADER SUPERIOR (y >= 735): Título del documento, capa comercial y metadatos
  const headerItems = items.filter((i) => i.y >= 735);
  const headerLines = clusterByLine(headerItems);

  let documentTitle = "";
  let coatingMaterial = "";
  let coatingPosition: number | undefined = undefined;

  for (const line of headerLines) {
    const text = textOf(line.items);
    if (!documentTitle && line.y > 768 && !/^(Calculado|Tipo|Página|Calumen)/i.test(text)) {
      documentTitle = text;
    } else if (/^Capa:\s*/i.test(text)) {
      const m = text.match(/^Capa:\s*(.*?)(?:\s*#(\d+))?$/i);
      if (m) {
        coatingMaterial = m[1].trim();
        if (m[2]) coatingPosition = Number(m[2]);
      }
    } else if (/Calculado por:|Catálogo de producto:|Normas:/i.test(text)) {
      if (!meta.calculatedBy) {
        const m = text.match(/Calculado por:\s*(.+?)(?=\s+Calculado en:|\s+Catálogo de producto:|$)/i);
        if (m) meta.calculatedBy = m[1].trim();
      }
      if (!meta.calculatedAt) {
        const m = text.match(/Calculado en:\s*([^\s]+)/i);
        if (m) meta.calculatedAt = m[1].trim();
      }
      if (!meta.catalog) {
        const m = text.match(/Catálogo de producto:\s*(.+?)(?=\s+Normas:|$)/i);
        if (m) meta.catalog = m[1].trim();
      }
      if (!meta.standard) {
        const m = text.match(/Normas:\s*(.+)$/i);
        if (m) meta.standard = m[1].trim();
      }
    }
  }

  // Si no se capturó título en la cabecera alta, buscar el primer texto representativo
  if (!documentTitle) {
    const fallbackLine = headerLines.find(
      (l) => l.y > 700 && !/^(Calculado|Tipo|Página|Calumen)/i.test(textOf(l.items)),
    );
    if (fallbackLine) {
      documentTitle = textOf(fallbackLine.items);
    }
  }

  // Nombre de vidrio comercial enriquecido
  let glassName = documentTitle;
  if (coatingMaterial && !glassName.toLowerCase().includes(coatingMaterial.toLowerCase())) {
    glassName = `${documentTitle} - ${coatingMaterial}${coatingPosition ? ` #${coatingPosition}` : ""}`;
  }

  // 2. COLUMNA IZQUIERDA (x < 270, 60 < y < 735): Composición completa del acristalamiento
  const leftItems = items.filter((i) => i.x < 270 && i.y > 60 && i.y < 735);
  const leftLines = clusterByLine(leftItems);

  const rawLeftTexts = leftLines
    .map((l) => textOf(l.items))
    .filter(Boolean)
    .filter((t) => !/^(Tipo de acristalamiento|Página|Calumen)/i.test(t));

  const layers: GlassLayer[] = [];
  let currentGroup = ""; // "Vidrio 1", "Cámara1", "Vidrio 2", etc.

  for (let idx = 0; idx < rawLeftTexts.length; idx++) {
    const text = rawLeftTexts[idx];

    // Marcadores de grupo en Calumen (Vidrio 1, Cámara1, etc.)
    if (/^Vidrio\s*\d*$/i.test(text)) {
      currentGroup = text;
      continue;
    }
    if (/^C[aá]mara\s*\d*$/i.test(text)) {
      currentGroup = text;
      continue;
    }

    // A) Cámara de aire / gas (Doble o Triple acristalamiento insulado)
    const isCavityContext = /^C[aá]mara/i.test(currentGroup) || /\b(air|aire|argon|gas)\b/i.test(text);
    if (isCavityContext) {
      let mat = "AIR";
      let thick: string | undefined = undefined;
      const thMatch = text.match(/(\d+(?:\.\d+)?)\s*mm/i);
      if (thMatch) {
        thick = `${thMatch[1]}mm`;
      }
      if (/\bargon\b/i.test(text)) mat = "ARGON";
      else if (/\bkripton\b/i.test(text)) mat = "KRIPTON";
      else if (/\b(air|aire)\b/i.test(text)) mat = "AIR";
      else mat = text.replace(/\d+(?:\.\d+)?\s*mm/i, "").trim() || "Cámara de aire";

      layers.push({
        material: mat,
        thickness: thick,
        kind: "air",
      });
      continue;
    }

    // B) Interlámina de seguridad (Laminados)
    if (/\b(pvb|sentryglas|sentry|eva|trosifol|ionoplast)\b/i.test(text)) {
      const match = text.match(/^(.*?)(?:\s*\(([^)]*)\))?$/);
      let mat = text;
      let thick: string | undefined = undefined;
      if (match) {
        mat = match[1].trim();
        thick = match[2] ? normalizeThickness(match[2]) : undefined;
      }
      if (!thick) {
        const directThick = text.match(/(\d+(?:\.\d+)?)\s*mm/i);
        if (directThick) {
          thick = `${directThick[1]}mm`;
          mat = mat.replace(directThick[0], "").trim();
        }
      }
      layers.push({
        material: mat,
        thickness: thick,
        kind: "interlayer",
        laminated: true,
      });
      continue;
    }

    // C) Capa de control solar o bajo emisivo (Low-E / Coating)
    if (
      /\b(cool.?lite|planitherm|stopray|suncool|coating|low.?e)\b/i.test(text) ||
      (coatingMaterial && text.toLowerCase().includes(coatingMaterial.toLowerCase()))
    ) {
      layers.push({
        material: text,
        kind: "coating",
        position: coatingPosition ?? 2,
      });
      continue;
    }

    // D) Sustrato de vidrio estándar: MATERIAL(ESPESOR) - TRATAMIENTO
    const substrateMatch = text.match(/^(.*?)(?:\s*\(([^)]*)\))?(?:\s*[-–—]\s*(.+))?$/);
    if (substrateMatch && substrateMatch[1].trim()) {
      layers.push({
        material: substrateMatch[1].trim(),
        thickness: substrateMatch[2] ? normalizeThickness(substrateMatch[2]) : undefined,
        treatment: substrateMatch[3] ? substrateMatch[3].trim() : undefined,
        kind: "substrate",
      });
      continue;
    }

    // E) Capa genérica
    layers.push({
      material: text,
      kind: "substrate",
    });
  }

  // 3. COLUMNA DERECHA (x >= 270, 60 < y < 735): Prestaciones técnicas y dimensiones
  const rightItems = items.filter((i) => i.x >= 270 && i.y > 60 && i.y < 735);
  const rightLines = clusterByLine(rightItems);

  const sections: PerfSection[] = [];
  let currentSection: PerfSection | null = null;

  for (let idx = 0; idx < rightLines.length; idx++) {
    const line = rightLines[idx];
    const firstItem = line.items[0];
    const lastItem = line.items[line.items.length - 1];
    const lineText = textOf(line.items);

    if (/^(Datos de prestaciones|Página)/i.test(lineText)) continue;

    // ¿Es un encabezado canónico de sección?
    const matchedSectionTitle = CANONICAL_SECTION_TITLES.find(
      (t) => firstItem.s === t || firstItem.s.startsWith(t + " ") || lineText.startsWith(t),
    );

    if (matchedSectionTitle) {
      const key = sectionKey(matchedSectionTitle);
      const existing = sections.find((s) => s.key === key);
      if (!existing) {
        currentSection = {
          id: makeId("sec"),
          key,
          title: SECTION_LABELS[key] ?? matchedSectionTitle,
          standard: undefined,
          icon: SECTION_ICONS[key] ?? "icon-luminosos.png",
          rows: [],
        };
        sections.push(currentSection);
      } else {
        currentSection = existing;
      }

      // Extraer norma en la misma cabecera (ej: "Factores Luminosos"  "CIE015:2018")
      if (line.items.length >= 2 && lastItem !== firstItem) {
        const stdCandidate = lastItem.s.trim();
        if (/(CIE|NFRC|EN\s*\d+|ANSI|ISO|ASTM)/i.test(stdCandidate)) {
          currentSection.standard = stdCandidate;
        }
      }
      continue;
    }

    if (currentSection) {
      // Caso 1: Fila estándar de dos columnas (etiqueta a la izquierda y valor a la derecha)
      if (line.items.length >= 2) {
        const label = textOf(line.items.slice(0, -1));
        const value = lastItem.s.trim();
        currentSection.rows.push({
          id: makeId("row"),
          label,
          value,
          kind: "row",
        });
        continue;
      }

      // Caso 2: Elemento suelto en la línea
      const item = line.items[0];

      // A) Norma en línea siguiente a la cabecera
      if (
        !currentSection.standard &&
        currentSection.rows.length === 0 &&
        /(CIE|NFRC|EN\s*\d+|ANSI|ISO|ASTM)/i.test(item.s)
      ) {
        currentSection.standard = item.s.trim();
        continue;
      }

      // B) Valor a la derecha (x >= 440) que completa una fila o nota previa
      if (item.x >= 440 && currentSection.rows.length > 0) {
        const lastRow = currentSection.rows[currentSection.rows.length - 1];
        if (lastRow.kind === "note" || !lastRow.value) {
          lastRow.kind = "row";
          lastRow.value = item.s.trim();
          continue;
        }
      }

      // C) Etiqueta multilínea (ej: "Resistencia a Impacto de Cuerpo" seguida de "Pendular")
      if (
        currentSection.rows.length > 0 &&
        currentSection.rows[currentSection.rows.length - 1].kind === "note" &&
        !currentSection.rows[currentSection.rows.length - 1].value
      ) {
        const prevRow = currentSection.rows[currentSection.rows.length - 1];
        if (idx + 1 < rightLines.length && rightLines[idx + 1].items[0].x >= 440) {
          prevRow.label = `${prevRow.label} ${item.s.trim()}`;
          continue;
        }
      }

      // D) Continuación de etiqueta en caso de impacto de cuerpo pendular
      if (
        currentSection.rows.length > 0 &&
        item.x < 440 &&
        currentSection.rows[currentSection.rows.length - 1].kind === "row" &&
        /Resistencia a Impacto de Cuerpo$/i.test(currentSection.rows[currentSection.rows.length - 1].label)
      ) {
        currentSection.rows[currentSection.rows.length - 1].label += ` ${item.s.trim()}`;
        continue;
      }

      // E) Nota informativa
      currentSection.rows.push({
        id: makeId("row"),
        label: item.s.trim(),
        kind: "note",
      });
    }
  }

  const ordered = orderSections(sections);

  if (ordered.length === 0) {
    warnings.push("No se detectaron apartados de prestaciones en el PDF.");
  }
  if (layers.length === 0) {
    warnings.push("No se detectó la composición del vidrio en el PDF.");
  }

  const rawText = items
    .map((i) => i.s)
    .filter(Boolean)
    .join(" ")
    .slice(0, 30000);

  return {
    sections: ordered,
    layers,
    warnings,
    glassName,
    documentTitle,
    rawText,
  };
}
