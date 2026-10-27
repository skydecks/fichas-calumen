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

export type KnowledgeDocMeta = {
  id: string;
  title: string;
  subtitle?: string;
  file: string;
  size: number;
  updatedAt: string;
  isDefault: boolean;
};

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
    .replace(/[\u0300-\u036f]/g, "") // remover tildes
    .replace(/[^a-zA-Z0-9_\-.]+/g, "-") // caracteres no permitidos a guiones
    .replace(/^-+|-+$/g, ""); // recortar guiones en extremos

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
 * Resuelve la ruta física validando que permanezca estrictamente dentro de KNOWLEDGE_DIR.
 */
function resolveSafePath(fileNameOrId: string): { fullPath: string; fileName: string } | null {
  ensureDir();
  const cleanInput = path.basename(fileNameOrId.trim());

  // Intento 1: coincidencia exacta con el archivo
  let targetName = cleanInput.endsWith(".md") ? cleanInput : `${cleanInput}.md`;
  let fullPath = path.resolve(KNOWLEDGE_DIR, targetName);

  if (existsSync(fullPath) && fullPath.startsWith(KNOWLEDGE_DIR)) {
    return { fullPath, fileName: targetName };
  }

  // Intento 2: búsqueda por slug/id insensible a mayúsculas
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
    // ignorar error de lectura de directorio
  }

  return null;
}

/**
 * Extrae título y subtítulo iniciales a partir del contenido Markdown.
 */
function extractDocHeaders(content: string, fallbackFileName: string): {
  title: string;
  subtitle?: string;
} {
  const lines = content.split("\n");
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
 * Lee un documento de conocimiento por nombre de archivo o ID.
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
    const content = getKnowledgeDocument(resolved.fileName);
    const headers = extractDocHeaders(content, resolved.fileName);

    return {
      id: fileToSlug(resolved.fileName),
      title: headers.title,
      subtitle: headers.subtitle,
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
        const content = readFileSync(fullPath, "utf8");
        const headers = extractDocHeaders(content, file);
        const isDefault = file.toLowerCase() === DEFAULT_DOC.toLowerCase();

        list.push({
          id: fileToSlug(file),
          title: headers.title,
          subtitle: headers.subtitle,
          file,
          size: stat.size,
          updatedAt: stat.mtime.toISOString(),
          isDefault,
        });
      } catch (err) {
        console.error(`Error leyendo metadatos de conocimiento para ${file}:`, err);
      }
    }

    // Ordenar: el documento oficial NOM-146 primero, luego orden alfabético o más recientes
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
        file: DEFAULT_DOC,
        size: 0,
        updatedAt: new Date().toISOString(),
        isDefault: true,
      },
    ];
  }
}

/**
 * Guarda o crea un nuevo artículo de conocimiento en formato .md.
 */
export function saveKnowledgeDocument(params: {
  fileName?: string;
  title: string;
  subtitle?: string;
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

  let finalContent = params.content.trim();

  // Si el contenido no tiene encabezado H1 y tenemos título, anteponerlo amistosamente
  if (!/^#\s+/m.test(finalContent) && params.title) {
    const subtitlePart = params.subtitle ? `\n\n> ${params.subtitle}` : "";
    finalContent = `# ${params.title}${subtitlePart}\n\n${finalContent}`;
  }

  writeFileSync(fullPath, finalContent, "utf8");

  // Invalidar caché
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

  // Proteger la norma base obligatoria de borrado accidental
  if (resolved.fileName.toLowerCase() === DEFAULT_DOC.toLowerCase()) {
    throw new Error("El documento normativo base (NOM-146-SCFI-2016) no puede ser eliminado.");
  }

  unlinkSync(resolved.fullPath);
  documentCache.delete(resolved.fileName);
  return true;
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
      const content = getKnowledgeDocument(doc.file);
      const sections = splitSections(content, doc.file);
      allSections.push(...sections);
      docCatalogLines.push(`- ${doc.title} (Archivo: ${doc.file})`);
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

  // 1. Siempre incluir ficha normativa o resumen clave de la norma base si existe
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
        `### [${section.sourceFile}] ${section.title}\n\n${section.body}`,
    )
    .join("\n\n");

  return [
    "BASE DE CONOCIMIENTO TÉCNICO Y NORMATIVO CEYCO (.MD):",
    "Índice de documentos disponibles en el sistema:",
    docCatalogLines.join("\n"),
    "",
    "SECCIONES RELEVANTES RECUPERADAS PARA ESTA CONSULTA:",
    selectedText || "No se encontraron secciones específicas para los términos indicados.",
  ]
    .join("\n")
    .slice(0, MAX_KNOWLEDGE_CHARS);
}
