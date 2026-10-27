import type { ReactNode } from "react";
import React from "react";

export type GlossaryTerm = {
  term: string;
  definition: string;
  category: "Térmico" | "Óptico" | "Acústico" | "Seguridad" | "Procesamiento";
};

export const TECHNICAL_GLOSSARY: Record<string, GlossaryTerm> = {
  ug: {
    term: "Ug (Transmitancia Térmica)",
    definition:
      "Transmitancia térmica del vidrio central (W/m²K). Mide el calor transmitido por conducción y convección. A menor valor Ug, mayor aislamiento térmico.",
    category: "Térmico",
  },
  shgc: {
    term: "SHGC (Factor Solar)",
    definition:
      "Solar Heat Gain Coefficient. Fracción de la radiación solar que entra a través del vidrio. A menor SHGC, menor calentamiento del interior.",
    category: "Térmico",
  },
  "factor solar": {
    term: "Factor Solar (FS / SHGC)",
    definition:
      "Porcentaje o fracción de energía solar total que ingresa al edificio (radiación directa más calor absorbido reemitido).",
    category: "Térmico",
  },
  tl: {
    term: "TL (Transmisión Luminosa)",
    definition:
      "Porcentaje de luz visible (380-780 nm) que atraviesa el acristalamiento. Determina la claridad visual y el confort lumínico.",
    category: "Óptico",
  },
  rw: {
    term: "Rw (Aislamiento Acústico)",
    definition:
      "Índice ponderado de reducción acústica en decibeles (dB) según EN ISO 717-1 / ASTM E413. Mayor valor = mayor atenuación del ruido.",
    category: "Acústico",
  },
  pvb: {
    term: "PVB (Polivinil Butiral)",
    definition:
      "Interlámina plástica flexible de alta adherencia usada en vidrios laminados para retener fragmentos ante rotura y mitigar impactos.",
    category: "Seguridad",
  },
  sentryglas: {
    term: "SentryGlas® (Interlámina Estructural)",
    definition:
      "Capa de ionoplasto de rigidez extrema (hasta 100 veces más rígida y 5 veces más resistente al desgarre que el PVB tradicional).",
    category: "Seguridad",
  },
  "choque termico": {
    term: "Rotura por Choque Térmico",
    definition:
      "Fisura provocada por el gradiente de temperatura entre el centro del vidrio caliente por radiación solar y los bordes fríos en la perfilería.",
    category: "Procesamiento",
  },
  "canto pulido": {
    term: "Canto Pulido Industrial",
    definition:
      "Desbaste y biselado de los bordes del vidrio que elimina microfisuras de corte, reduciendo el riesgo de rotura térmica y facilitando el templado.",
    category: "Procesamiento",
  },
  "low-e": {
    term: "Low-E (Baja Emisividad)",
    definition:
      "Recubrimiento microscópico de óxidos metálicos que refleja la radiación infrarroja de onda larga para conservar el clima interior.",
    category: "Térmico",
  },
  dgu: {
    term: "DGU (Doble Acristalamiento)",
    definition:
      "Unidad de vidrio aislante formada por dos hojas selladas perimetralmente con cámara de aire deshidratado o gas argón.",
    category: "Térmico",
  },
  "vidrio templado": {
    term: "Vidrio Templado Térmico",
    definition:
      "Vidrio calentado a ~650 °C y enfriado bruscamente. 4 a 5 veces más resistente al impacto que el recocido; fragmenta en trozos pequeños sin aristas cortantes.",
    category: "Seguridad",
  },
  "vidrio laminado": {
    term: "Vidrio Laminado de Seguridad",
    definition:
      "Ensamble de dos o más hojas unidas con interláminas (PVB, EVA o ionómero). Conserva la contención física aún después de quebrarse.",
    category: "Seguridad",
  },
  "nom-146": {
    term: "NOM-146-SCFI-2016",
    definition:
      "Norma Oficial Mexicana obligatoria para vidrio de seguridad y/o contención usado en la construcción (impacto humano, clasificación y métodos de prueba).",
    category: "Seguridad",
  },
};

const GLOSSARY_REGEX =
  /\b(ug|shgc|factor solar|tl|rw|pvb|sentryglas|choque t[eé]rmico|canto pulido|low-e|dgu|vidrio templado|vidrio laminado|nom-146)\b/gi;

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Escanea texto y resalta términos técnicos con tooltip interactivo sobrio y minimalista.
 */
export function enhanceTextWithGlossary(text: string): ReactNode {
  if (!text || typeof text !== "string") return text;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reiniciar índice
  GLOSSARY_REGEX.lastIndex = 0;

  while ((match = GLOSSARY_REGEX.exec(text)) !== null) {
    const matchedText = match[0];
    const startIndex = match.index;

    if (startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, startIndex));
    }

    const key = normalizeKey(matchedText);
    const item = TECHNICAL_GLOSSARY[key];

    if (item) {
      parts.push(
        <span
          key={`${startIndex}-${key}`}
          className="cursor-help border-b border-dotted border-slate-400 text-slate-900 transition-colors hover:border-brand-600 hover:text-brand-700 font-medium"
          title={`ℹ️ ${item.term} [${item.category}]:\n${item.definition}`}
        >
          {matchedText}
        </span>,
      );
    } else {
      parts.push(matchedText);
    }

    lastIndex = startIndex + matchedText.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
