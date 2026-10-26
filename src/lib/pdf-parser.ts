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

function clusterByLine(items: PdfTextItem[]): PageCluster[] {
  const lines: PageCluster[] = [];
  for (const item of items) {
    let line = lines.find((l) => Math.abs(l.y - item.y) < 2);
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
  const t = title.normalize("NFD")
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

const SECTION_TITLES = [
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
  "Huella de carbono",
  "Potencial de calentamiento global",
  "Espesor nominal",
  "Peso",
];

function isSectionTitle(text: string): boolean {
  return SECTION_TITLES.some((t) => text === t || text.startsWith(t + " ") || text.includes(" " + t));
}

/**
 * Extrae secciones, capas y metadatos del texto de una página de Calumen PDF.
 * No inventa valores: solo lo que está impreso en el PDF.
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
  const lines = clusterByLine(items);

  const documentTitle =
    lines
      .filter((line) => line.y > 700 && (line.items[0]?.x ?? 999) < 300)
      .map((line) => textOf(line.items))
      .find(
        (text) =>
          text.length > 1 &&
          !/^(Calculado|Tipo de acristalamiento|Página|Calumen)/i.test(text),
      ) ??
    lines
      .map((line) => textOf(line.items))
      .find(
        (text) =>
          text.length > 1 &&
          !/^(Calculado|Tipo de acristalamiento|Página|Calumen|Datos de prestaciones)/i.test(text),
      );

  const rawText = lines
    .map((line) => textOf(line.items))
    .filter(Boolean)
    .join("\n")
    .slice(0, 30000);

  const sections: PerfSection[] = [];
  let currentSection: PerfSection | null = null;
  const layers: GlassLayer[] = [];

  for (const line of lines) {
    // Umbral: x<250 = columna izquierda (capas / vidrio), x>=250 = derecha (secciones / filas)
    const leftItems = line.items.filter((i) => i.x < 250);
    const rightItems = line.items.filter((i) => i.x >= 250);
    const leftText = textOf(leftItems);
    const rightText = textOf(rightItems);
    const full = `${leftText} ${rightText}`.trim();

    // Saltar cabecera / pie de página
    if (
      /^Página \d+\/\d+$/.test(full) ||
      /^Calumen®/.test(full) ||
      /^Datos de prestaciones/.test(full) ||
      /^Tipo de acristalamiento/.test(full)
    )
      continue;

    // Cabecera del PDF: Calculado por / fecha / catálogo / normas
    if (/Calculado por:|Catálogo de producto:|Normas:/.test(full)) {
      if (!meta.calculatedBy) {
        const m = full.match(
          /Calculado por:\s*(.+?)(?=\s+Calculado en:|\s+Catálogo de producto:|$)/i,
        );
        if (m) meta.calculatedBy = m[1].trim();
      }
      if (!meta.calculatedAt) {
        const m = full.match(/Calculado en:\s*([^\s]+)/i);
        if (m) meta.calculatedAt = m[1].trim();
      }
      if (!meta.catalog) {
        const m = full.match(
          /Catálogo de producto:\s*(.+?)(?=\s+Normas:|$)/i,
        );
        if (m) meta.catalog = m[1].trim();
      }
      if (!meta.standard) {
        const m = full.match(/Normas:\s*(.+)$/i);
        if (m) meta.standard = m[1].trim();
      }
      continue;
    }

    // Columna izquierda: capa de vidrio MATERIAL(12mm) - Tratamiento
    if (leftText && !/^(Vidrio|Calculado por|Página)/i.test(leftText)) {
      const layerMatch = leftText.match(
        /^(.*?)(?:\s*\(([^)]*)\))?(?:\s*[-–—]\s*(.+))?$/,
      );
      if (
        layerMatch &&
        layerMatch[1].trim() &&
        /^(PLANILUX|PVB|EVA|SGG|Saint|Vidrio|Float|Planibel|Diamant|Stopray|CoolLite)/i.test(
          layerMatch[1].trim(),
        )
      ) {
        layers.push({
          material: layerMatch[1].trim(),
          thickness: layerMatch[2]
            ? normalizeThickness(layerMatch[2])
            : undefined,
          treatment: layerMatch[3] ? layerMatch[3].trim() : undefined,
        });
        continue;
      }
    }

    // Columna derecha: primer item = etiqueta, último = valor
    if (rightItems.length >= 2) {
      const first = textOf(rightItems.slice(0, 1));
      const last = textOf(rightItems.slice(-1));

      // ¿Es un título de sección?
      if (isSectionTitle(first)) {
        const title = first;
        const key = sectionKey(title);
        const existing = sections.find((s) => s.key === key);
        if (!existing) {
          currentSection = {
            id: makeId("sec"),
            key,
            title: SECTION_LABELS[key] ?? title,
            standard: undefined,
            icon: SECTION_ICONS[key] ?? "icon-luminosos.png",
            rows: [],
          };
          sections.push(currentSection);
        } else {
          currentSection = existing;
        }
        // El estándar puede estar en el último item
        if (currentSection && !currentSection.standard) {
          const stdMatch = last.match(
            /(CIE015:?2018|NFRC|EN\s*\d+|ANSI[^\s]*|ISO\s*\d+[^\s]*)/,
          );
          if (stdMatch) currentSection.standard = stdMatch[0];
        }
        continue;
      }

      // Fila de prestación: etiqueta => valor
      if (first && last && currentSection) {
        currentSection.rows.push({
          id: makeId("row"),
          label: first.replace(/\s+/g, " ").trim(),
          value: last.replace(/\s+/g, " ").trim(),
          kind: "row",
        });
        continue;
      }
    }

    // Columna derecha: estándar suelto de sección (línea siguiente al título)
    if (
      currentSection &&
      !currentSection.standard &&
      rightText &&
      (rightText.includes("CIE015") ||
        rightText.includes("NFRC") ||
        rightText.includes("EN ") ||
        rightText.includes("ANSI") ||
        rightText.includes("ISO "))
    ) {
      currentSection.standard = rightText;
      continue;
    }
  }

  const ordered = orderSections(sections);

  if (ordered.length === 0) {
    warnings.push("No se detectaron apartados de prestaciones en el PDF.");
  }
  if (layers.length === 0) {
    warnings.push("No se detectó la composición del vidrio en el PDF.");
  }

  return {
    sections: ordered,
    layers,
    warnings,
    documentTitle,
    rawText,
  };
}
