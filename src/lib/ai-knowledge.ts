import "server-only";

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const KNOWLEDGE_DIR = path.join(process.cwd(), "public", "knowledge");
const MAX_KNOWLEDGE_CHARS = 28_000;
const DEFAULT_DOC = "NOM-146-SCFI-2016.md";

export * from "./knowledge-types";
import {
  type KnowledgeCategory,
  type KnowledgeDocMeta,
} from "./knowledge-types";

type KnowledgeSection = {
  sourceFile: string;
  title: string;
  body: string;
};

// In-memory cache for fast access
const documentCache = new Map<string, { content: string; mtimeMs: number }>();

function ensureDir(): void {
  if (!existsSync(KNOWLEDGE_DIR)) {
    mkdirSync(KNOWLEDGE_DIR, { recursive: true });
  }
}

/**
 * Normaliza y sanitiza un nombre de archivo para evitar Directory Traversal y caracteres inválidos.
 */
export function sanitizeFileName(rawName: string): string {
  const base = rawName
    .replace(/\.md$/i, "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_\-.]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const clean = base || "nuevo-articulo";
  return clean.endsWith(".md") ? clean : `${clean}.md`;
}

/**
 * Convierte un nombre de archivo o título a un identificador slug seguro para URLs.
 */
export function fileToSlug(fileName: string): string {
  return fileName
    .replace(/\.md$/i, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Extrae y parsea el frontmatter YAML y el cuerpo Markdown.
 */
export function parseFrontmatter(rawContent: string): {
  metadata: {
    category?: KnowledgeCategory;
    families?: string[];
    standards?: string[];
  };
  body: string;
} {
  const match = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { metadata: {}, body: rawContent };
  }

  const yamlBlock = match[1];
  const body = match[2];
  const metadata: {
    category?: KnowledgeCategory;
    families?: string[];
    standards?: string[];
  } = {};

  for (const line of yamlBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim().toLowerCase();
    const value = trimmed.slice(colonIndex + 1).trim();

    if (key === "categoria" || key === "category") {
      const cleanVal = value.replace(/['"]/g, "").trim();
      if (
        cleanVal === "Norma Oficial" ||
        cleanVal === "Guía de Producto" ||
        cleanVal === "Criterio de Instalación" ||
        cleanVal === "Procedimiento Interno"
      ) {
        metadata.category = cleanVal as KnowledgeCategory;
      }
    } else if (key === "familias" || key === "families") {
      const cleanList = value
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((s) => s.replace(/['"]/g, "").trim())
        .filter(Boolean);
      metadata.families = cleanList;
    } else if (key === "normas" || key === "standards") {
      const cleanList = value
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((s) => s.replace(/['"]/g, "").trim())
        .filter(Boolean);
      metadata.standards = cleanList;
    }
  }

  return { metadata, body };
}

/**
 * Serializa los metadatos como encabezado YAML frontmatter antes del cuerpo Markdown.
 */
export function serializeFrontmatter(
  meta: {
    category?: KnowledgeCategory;
    families?: string[];
    standards?: string[];
  },
  body: string,
): string {
  const parts: string[] = ["---"];
  if (meta.category) parts.push(`categoria: ${meta.category}`);
  if (meta.families && meta.families.length > 0) {
    parts.push(`familias: [${meta.families.join(", ")}]`);
  }
  if (meta.standards && meta.standards.length > 0) {
    parts.push(`normas: [${meta.standards.join(", ")}]`);
  }
  parts.push("---");
  return `${parts.join("\n")}\n\n${body.trim()}`;
}

/**
 * Resuelve la ruta física validando que permanezca estrictamente dentro de KNOWLEDGE_DIR.
 */
function resolveSafePath(fileNameOrId: string): { fullPath: string; fileName: string } | null {
  ensureDir();
  const cleanInput = path.basename(fileNameOrId.trim());

  let targetName = cleanInput.endsWith(".md") ? cleanInput : `${cleanInput}.md`;
  let fullPath = path.resolve(KNOWLEDGE_DIR, targetName);

  if (existsSync(fullPath) && fullPath.startsWith(KNOWLEDGE_DIR)) {
    return { fullPath, fileName: targetName };
  }

  try {
    const files = readdirSync(KNOWLEDGE_DIR);
    const targetSlug = fileToSlug(cleanInput);

    const match = files.find((f) => {
      if (!f.endsWith(".md")) return false;
      return (
        f.toLowerCase() === targetName.toLowerCase() ||
        fileToSlug(f) === targetSlug
      );
    });

    if (match) {
      const resolved = path.resolve(KNOWLEDGE_DIR, match);
      if (resolved.startsWith(KNOWLEDGE_DIR)) {
        return { fullPath: resolved, fileName: match };
      }
    }
  } catch {
    // ignorar
  }

  return null;
}

/**
 * Extrae título y subtítulo iniciales a partir del cuerpo Markdown.
 */
function extractDocHeaders(body: string, fallbackFileName: string): {
  title: string;
  subtitle?: string;
} {
  const lines = body.split("\n");
  let title = "";
  let subtitle = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!title && trimmed.startsWith("# ")) {
      title = trimmed.replace(/^#\s+/, "").trim();
      continue;
    }
    if (title && !subtitle) {
      if (trimmed.startsWith("## ")) {
        subtitle = trimmed.replace(/^##\s+/, "").trim();
        break;
      } else if (trimmed.startsWith("> ")) {
        subtitle = trimmed.replace(/^>\s+/, "").replace(/\*\*/g, "").trim();
        break;
      } else if (trimmed.length > 5 && !trimmed.startsWith("#")) {
        subtitle = trimmed;
        break;
      }
    }
  }

  if (!title) {
    title = fallbackFileName.replace(/\.md$/i, "").replace(/[-_]+/g, " ");
  }

  return {
    title,
    subtitle: subtitle ? subtitle.slice(0, 160) : undefined,
  };
}

/**
 * Deducción inteligente de categoría y familias si no existen en el frontmatter.
 */
function deduceDocMetadata(
  fileName: string,
  title: string,
  body: string,
  explicitMeta: {
    category?: KnowledgeCategory;
    families?: string[];
    standards?: string[];
  },
): {
  category: KnowledgeCategory;
  families: string[];
  standards: string[];
} {
  let category = explicitMeta.category;
  if (!category) {
    if (
      fileName.toLowerCase().includes("nom") ||
      fileName.toLowerCase().includes("norma") ||
      /nom-\d+|en\s*\d+|astm\s*[a-z]\d+|nfrc/i.test(title)
    ) {
      category = "Norma Oficial";
    } else if (
      /instalacion|montaje|calzos|sellador|drenaje/i.test(title) ||
      /instalacion/i.test(fileName)
    ) {
      category = "Criterio de Instalación";
    } else if (
      /procedimiento|criterio|validacion|emision/i.test(title)
    ) {
      category = "Procedimiento Interno";
    } else {
      category = "Guía de Producto";
    }
  }

  let families = explicitMeta.families ? [...explicitMeta.families] : [];
  if (families.length === 0) {
    const textToScan = `${fileName} ${title} ${body.slice(0, 2000)}`.toLowerCase();
    if (textToScan.includes("templado") || textToScan.includes("esg") || textToScan.includes("impacto")) {
      families.push("Vidrio Templado");
    }
    if (textToScan.includes("laminado") || textToScan.includes("pvb") || textToScan.includes("vsg") || textToScan.includes("sentryglas")) {
      families.push("Vidrio Laminado");
    }
    if (textToScan.includes("doble acristalamiento") || textToScan.includes("dgu") || textToScan.includes("camara") || textToScan.includes("aislante")) {
      families.push("Doble Acristalamiento (DGU)");
    }
    if (textToScan.includes("solar") || textToScan.includes("low-e") || textToScan.includes("baja emisividad") || textToScan.includes("capa")) {
      families.push("Control Solar y Low-E");
    }
    if (textToScan.includes("acustic") || textToScan.includes("rw") || textToScan.includes("db") || textToScan.includes("ruido")) {
      families.push("Aislamiento Acústico");
    }
    if (textToScan.includes("seguridad") || textToScan.includes("contencion") || textToScan.includes("barandal") || textToScan.includes("balas")) {
      families.push("Vidrio de Seguridad y Contención");
    }
  }

  let standards = explicitMeta.standards ? [...explicitMeta.standards] : [];
  if (standards.length === 0) {
    const textToScan = `${title} ${body.slice(0, 3000)}`;
    const foundStandards = textToScan.match(
      /(?:NOM-\d{3}-[A-Z0-9/]+-\d{4}|EN\s*\d{3,5}|ISO\s*\d{4,5}|NFRC\s*\d{3}|ASTM\s*[A-Z]\d{3,4})/gi,
    );
    if (foundStandards) {
      standards = Array.from(new Set(foundStandards.map((s) => s.trim()))).slice(0, 5);
    }
  }

  return { category, families, standards };
}

/**
 * Lee un documento de conocimiento por nombre de archivo o ID.
 * Devuelve el contenido completo (o solo el cuerpo si se solicita).
 */
export function getKnowledgeDocument(fileNameOrId = DEFAULT_DOC): string {
  ensureDir();
  const resolved = resolveSafePath(fileNameOrId);
  if (!resolved) {
    if (fileNameOrId === DEFAULT_DOC) {
      return "# Base de conocimiento\n\nNo se encontró el documento base.";
    }
    throw new Error(`El artículo de conocimiento "${fileNameOrId}" no existe.`);
  }

  const { fullPath, fileName } = resolved;
  const stat = statSync(fullPath);
  const cached = documentCache.get(fileName);

  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached.content;
  }

  const content = readFileSync(fullPath, "utf8");
  documentCache.set(fileName, { content, mtimeMs: stat.mtimeMs });
  return content;
}

/**
 * Devuelve los metadatos de un artículo específico si existe.
 */
export function getKnowledgeDocMeta(fileNameOrId: string): KnowledgeDocMeta | null {
  ensureDir();
  const resolved = resolveSafePath(fileNameOrId);
  if (!resolved) return null;

  try {
    const stat = statSync(resolved.fullPath);
    const rawContent = getKnowledgeDocument(resolved.fileName);
    const { metadata: fmMeta, body } = parseFrontmatter(rawContent);
    const headers = extractDocHeaders(body, resolved.fileName);
    const deduced = deduceDocMetadata(resolved.fileName, headers.title, body, fmMeta);

    return {
      id: fileToSlug(resolved.fileName),
      title: headers.title,
      subtitle: headers.subtitle,
      category: deduced.category,
      families: deduced.families,
      standards: deduced.standards,
      file: resolved.fileName,
      size: stat.size,
      updatedAt: stat.mtime.toISOString(),
      isDefault: resolved.fileName.toLowerCase() === DEFAULT_DOC.toLowerCase(),
    };
  } catch {
    return null;
  }
}

/**
 * Lista dinámicamente todos los documentos Markdown disponibles en public/knowledge/.
 */
export function listKnowledgeDocuments(): KnowledgeDocMeta[] {
  ensureDir();

  try {
    const files = readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".md"));
    const list: KnowledgeDocMeta[] = [];

    for (const file of files) {
      const fullPath = path.join(KNOWLEDGE_DIR, file);
      try {
        const stat = statSync(fullPath);
        const rawContent = readFileSync(fullPath, "utf8");
        const { metadata: fmMeta, body } = parseFrontmatter(rawContent);
        const headers = extractDocHeaders(body, file);
        const deduced = deduceDocMetadata(file, headers.title, body, fmMeta);
        const isDefault = file.toLowerCase() === DEFAULT_DOC.toLowerCase();

        list.push({
          id: fileToSlug(file),
          title: headers.title,
          subtitle: headers.subtitle,
          category: deduced.category,
          families: deduced.families,
          standards: deduced.standards,
          file,
          size: stat.size,
          updatedAt: stat.mtime.toISOString(),
          isDefault,
        });
      } catch (err) {
        console.error(`Error leyendo metadatos de conocimiento para ${file}:`, err);
      }
    }

    list.sort((a, b) => {
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      return a.title.localeCompare(b.title, "es", { sensitivity: "base" });
    });

    return list;
  } catch (error) {
    console.error("No se pudo listar los documentos de conocimiento:", error);
    return [
      {
        id: "nom-146-scfi-2016",
        title: "NOM-146-SCFI-2016 — Vidrio de seguridad",
        category: "Norma Oficial",
        families: ["Vidrio Templado", "Vidrio Laminado"],
        standards: ["NOM-146-SCFI-2016"],
        file: DEFAULT_DOC,
        size: 0,
        updatedAt: new Date().toISOString(),
        isDefault: true,
      },
    ];
  }
}

/**
 * Guarda o crea un nuevo artículo de conocimiento en formato .md preservando metadatos.
 */
export function saveKnowledgeDocument(params: {
  fileName?: string;
  title: string;
  subtitle?: string;
  category?: KnowledgeCategory;
  families?: string[];
  standards?: string[];
  content: string;
}): { id: string; fileName: string; title: string } {
  ensureDir();

  let targetFileName = "";
  if (params.fileName && params.fileName.trim()) {
    targetFileName = sanitizeFileName(params.fileName);
  } else {
    targetFileName = sanitizeFileName(params.title);
  }

  const fullPath = path.resolve(KNOWLEDGE_DIR, targetFileName);
  if (!fullPath.startsWith(KNOWLEDGE_DIR)) {
    throw new Error("Ruta de archivo no autorizada.");
  }

  // Parsear si el usuario ya escribió o no frontmatter
  const { metadata: existingFm, body: rawBody } = parseFrontmatter(params.content);
  let finalBody = rawBody.trim();

  // Asegurar encabezado H1 si no lo tiene
  if (!/^#\s+/m.test(finalBody) && params.title) {
    const subtitlePart = params.subtitle ? `\n\n> ${params.subtitle}` : "";
    finalBody = `# ${params.title}${subtitlePart}\n\n${finalBody}`;
  }

  const finalMetadata = {
    category: params.category || existingFm.category || "Guía de Producto",
    families: params.families && params.families.length > 0 ? params.families : existingFm.families || [],
    standards: params.standards && params.standards.length > 0 ? params.standards : existingFm.standards || [],
  };

  const filePayload = serializeFrontmatter(finalMetadata, finalBody);

  writeFileSync(fullPath, filePayload, "utf8");
  documentCache.delete(targetFileName);

  return {
    id: fileToSlug(targetFileName),
    fileName: targetFileName,
    title: params.title,
  };
}

/**
 * Elimina un documento de conocimiento.
 */
export function deleteKnowledgeDocument(fileNameOrId: string): boolean {
  ensureDir();
  const resolved = resolveSafePath(fileNameOrId);
  if (!resolved) return false;

  if (resolved.fileName.toLowerCase() === DEFAULT_DOC.toLowerCase()) {
    throw new Error("El documento normativo base (NOM-146-SCFI-2016) no puede ser eliminado.");
  }

  unlinkSync(resolved.fullPath);
  documentCache.delete(resolved.fileName);
  return true;
}

/**
 * Busca de forma reactiva y sugerida los artículos aplicables a una composición de vidrio.
 */
export function findKnowledgeForComposition(
  layers: Array<{ material?: string; treatment?: string; thickness?: string }>,
): KnowledgeDocMeta[] {
  const docs = listKnowledgeDocuments();
  if (docs.length === 0) return [];

  const layerTexts = layers
    .map((l) => `${l.material ?? ""} ${l.treatment ?? ""} ${l.thickness ?? ""}`.toLowerCase())
    .join(" ");

  const hasLaminated = /lamin|pvb|vsg|sentry|acustic/i.test(layerTexts);
  const hasTempered = /templ|esg|thermo|endurecid/i.test(layerTexts);
  const hasDgu = layers.some((l) => /camara|gas|aire|argon|intercal/i.test(l.material ?? ""));
  const hasLowE = /low-e|capa|solar|control|baja emisiv/i.test(layerTexts);

  const matched = docs.filter((doc) => {
    if (doc.isDefault) return true; // NOM-146 siempre es relevante en México
    const docTags = doc.families.join(" ").toLowerCase();
    const docTitle = doc.title.toLowerCase();

    if (hasLaminated && (docTags.includes("laminado") || docTitle.includes("laminado") || docTags.includes("seguridad"))) return true;
    if (hasTempered && (docTags.includes("templado") || docTitle.includes("templado") || docTags.includes("seguridad"))) return true;
    if (hasDgu && (docTags.includes("dgu") || docTags.includes("doble acristalamiento") || docTitle.includes("camara"))) return true;
    if (hasLowE && (docTags.includes("solar") || docTags.includes("low-e") || docTitle.includes("termic"))) return true;

    return false;
  });

  return matched.slice(0, 4);
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

function splitSections(document: string, sourceFile: string): KnowledgeSection[] {
  const parts = document.split(/^#{2,3} /m);
  return parts
    .slice(1)
    .map((part) => {
      const [firstLine, ...rest] = part.split("\n");
      return {
        sourceFile,
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
  if (/ficha normativa|puntos clave|clasificacion|especificaciones|requisitos/i.test(title)) {
    score += 3;
  }
  return score;
}

/**
 * Recupera las secciones más relevantes de TODOS los documentos de conocimiento en .md
 * para la consulta dada, enriqueciendo el contexto del Asistente IA.
 */
export function buildAiKnowledge(query: string): string {
  ensureDir();
  const allDocs = listKnowledgeDocuments();
  if (allDocs.length === 0) {
    return "No hay documentos disponibles en la base de conocimiento.";
  }

  const terms = queryTerms(query);
  const allSections: KnowledgeSection[] = [];
  const docCatalogLines: string[] = [];

  for (const doc of allDocs) {
    try {
      const rawContent = getKnowledgeDocument(doc.file);
      const { body } = parseFrontmatter(rawContent);
      const sections = splitSections(body, doc.file);
      allSections.push(...sections);
      docCatalogLines.push(
        `- [${doc.title}](/conocimiento/${doc.id}) — Categoría: ${doc.category} — Archivo: ${doc.file}`,
      );
    } catch {
      // Ignorar fallo de un archivo individual
    }
  }

  const selected: KnowledgeSection[] = [];
  const seen = new Set<string>();
  const add = (section: KnowledgeSection | undefined) => {
    if (!section) return;
    const key = `${section.sourceFile}::${section.title}`;
    if (seen.has(key)) return;
    seen.add(key);
    selected.push(section);
  };

  const nomBase = allSections.find(
    (s) => s.sourceFile.toLowerCase() === DEFAULT_DOC.toLowerCase() && /Ficha normativa/i.test(s.title),
  );
  if (nomBase) add(nomBase);

  const askedAboutNorm =
    /nom[- ]?146|norma completa|texto completo/i.test(query) ||
    terms.length === 0;

  if (askedAboutNorm) {
    for (const section of allSections) {
      add(section);
      if (selected.length >= 10) break;
    }
  } else {
    const ranked = allSections
      .map((section) => ({ section, score: scoreSection(section, terms) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    for (const item of ranked) {
      add(item.section);
      if (selected.length >= 8) break;
    }
  }

  const selectedText = selected
    .map(
      (section) =>
        `### [${section.sourceFile}] ${section.title}\n(Citar como enlace: [/conocimiento/${fileToSlug(section.sourceFile)}])\n\n${section.body}`,
    )
    .join("\n\n");

  return [
    "BASE DE CONOCIMIENTO TÉCNICO Y NORMATIVO (.MD):",
    "Índice de documentos disponibles en el sistema:",
    docCatalogLines.join("\n"),
    "",
    "SECCIONES RELEVANTES RECUPERADAS PARA ESTA CONSULTA:",
    selectedText || "No se encontraron secciones específicas para los términos indicados.",
    "",
    "INSTRUCCIÓN OBLIGATORIA DE CITAS: Cuando menciones o te fundamentes en uno de estos documentos o normas, debes incluir siempre un enlace en formato Markdown [Título del Documento o Norma](/conocimiento/[id-slug]) para que el usuario pueda hacer clic y abrir el artículo de conocimiento en Calumen.",
  ]
    .join("\n")
    .slice(0, MAX_KNOWLEDGE_CHARS);
}
