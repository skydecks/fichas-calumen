import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

const KNOWLEDGE_DIR = path.join(process.cwd(), "public", "knowledge");
const MAX_KNOWLEDGE_CHARS = 28_000;

type KnowledgeSection = {
  title: string;
  body: string;
};

let cachedDocument: string | null = null;

function readDocument(fileName: string): string {
  if (cachedDocument && fileName === "NOM-146-SCFI-2016.md") {
    return cachedDocument;
  }
  const content = readFileSync(path.join(KNOWLEDGE_DIR, fileName), "utf8");
  if (fileName === "NOM-146-SCFI-2016.md") cachedDocument = content;
  return content;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function queryTerms(query: string): string[] {
  const stop = new Set([
    "para",
    "como",
    "cual",
    "cuales",
    "donde",
    "cuando",
    "sobre",
    "segun",
    "norma",
    "nom",
    "que",
    "del",
    "las",
    "los",
    "con",
    "por",
    "una",
    "unos",
    "unas",
    "este",
    "esta",
    "estos",
    "estas",
    "debe",
    "deben",
    "puede",
    "pueden",
    "necesito",
    "necesita",
    "dime",
    "explica",
    "explicame",
    "aplica",
    "aplican",
    "requiere",
    "requieren",
    "vidrio",
    "vidrios",
    "seguridad",
    "construccion",
  ]);
  return Array.from(
    new Set(
      normalize(query)
        .match(/[a-z0-9.]{4,}/g)
        ?.filter((word) => !stop.has(word)) ?? [],
    ),
  ).slice(0, 8);
}

function splitSections(document: string): KnowledgeSection[] {
  // Split at H2 and H3 headings so tables and requirements can be retrieved
  // without sending an entire 15k-character chapter.
  const parts = document.split(/^#{2,3} /m);
  return parts
    .slice(1)
    .map((part) => {
      const [firstLine, ...rest] = part.split("\n");
      return {
        title: firstLine.trim(),
        body: rest.join("\n").trim(),
      };
    })
    .filter((section) => section.title.length > 0 && section.body.length > 0);
}

function scoreSection(section: KnowledgeSection, terms: string[]): number {
  const title = normalize(section.title);
  const body = normalize(section.body);
  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += 12;
    const occurrences = body.split(term).length - 1;
    score += Math.min(occurrences, 8) * 2;
  }
  // Core sections that are useful in almost any normative question.
  if (/ficha normativa|puntos clave|clasificacion|especificaciones/i.test(title)) {
    score += 3;
  }
  return score;
}

export function getKnowledgeDocument(fileName = "NOM-146-SCFI-2016.md"): string {
  return readDocument(fileName);
}

export function listKnowledgeDocuments(): Array<{
  id: string;
  title: string;
  file: string;
}> {
  return [
    {
      id: "nom-146-scfi-2016",
      title: "NOM-146-SCFI-2016 — Vidrio de seguridad",
      file: "NOM-146-SCFI-2016.md",
    },
  ];
}

/**
 * Recupera la ficha normativa y las secciones más relevantes para la pregunta.
 * El texto completo permanece en public/knowledge para consulta humana.
 */
export function buildAiKnowledge(query: string): string {
  const document = readDocument("NOM-146-SCFI-2016.md");
  const sections = splitSections(document);
  const terms = queryTerms(query);
  const index = sections.map((section) => `- ${section.title}`).join("\n");
  const byTitle = (pattern: RegExp) =>
    sections.find((section) => pattern.test(section.title));

  const selected: KnowledgeSection[] = [];
  const seen = new Set<string>();
  const add = (section: KnowledgeSection | undefined) => {
    if (!section || seen.has(section.title)) return;
    seen.add(section.title);
    selected.push(section);
  };

  // Always send the normative identity and the practical summary.
  add(byTitle(/Ficha normativa/i));
  add(byTitle(/Puntos clave/i));

  const askedAboutNorm =
    /nom[- ]?146|norma completa|texto completo/i.test(query) ||
    terms.length === 0;

  if (askedAboutNorm) {
    // For a general question, traverse the document in order so the model
    // receives the scope, definitions, classification, specifications and
    // test methods as a coherent sequence.
    for (const section of sections) {
      add(section);
      if (selected.length >= 12) break;
    }
  } else {
    const ranked = sections
      .map((section) => ({ section, score: scoreSection(section, terms) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    for (const item of ranked) {
      add(item.section);
      if (selected.length >= 7) break;
    }
  }

  const selectedText = selected
    .map((section) => `## ${section.title}\n\n${section.body}`)
    .join("\n\n");

  return [
    "DOCUMENTO BASE: NOM-146-SCFI-2016 — Productos de vidrio — Vidrio de seguridad usado en la construcción — Especificaciones y métodos de prueba.",
    "Estados Unidos Mexicanos, Secretaría de Economía, DOF 28/10/2016. Transcripción técnica para consulta; el texto oficial prevalece.",
    "ÍNDICE DEL DOCUMENTO:",
    index,
    "",
    "SECCIONES RECUPERADAS PARA ESTA CONSULTA:",
    selectedText,
  ]
    .join("\n")
    .slice(0, MAX_KNOWLEDGE_CHARS);
}
