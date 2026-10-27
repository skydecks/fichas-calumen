"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Table,
  Quote,
  Code,
  AlertCircle,
  Eye,
  Edit3,
  Columns,
  Sparkles,
  FileText,
  Upload,
  Loader2,
  CheckCircle2,
  ShieldAlert,
  Wand2,
} from "lucide-react";
import { AiMarkdown } from "@/lib/ai-markdown";
import { SubmitButton } from "@/components/SubmitButton";
import { Field } from "@/components/ui";
import { SpectrumCard } from "@/components/spectrum/card";
import {
  GLASS_FAMILIES,
  KNOWLEDGE_CATEGORIES,
  type KnowledgeCategory,
} from "@/lib/knowledge-types";

export type KnowledgeFormValues = {
  fileName?: string;
  originalFileName?: string;
  title?: string;
  subtitle?: string;
  category?: KnowledgeCategory;
  families?: string[];
  standards?: string[];
  content?: string;
};

const TEMPLATES: Record<string, { label: string; content: string; subtitle: string; category: KnowledgeCategory; families: string[] }> = {
  norma: {
    label: "Norma Técnica Oficial",
    subtitle: "Especificaciones, clasificación y métodos de evaluación para acristalamiento.",
    category: "Norma Oficial",
    families: ["Vidrio Templado", "Vidrio de Seguridad y Contención"],
    content: `## Ficha normativa

- **Clave:** CLAVE-NORMA-AÑO
- **Título oficial:** Nombre completo oficial de la norma técnica.
- **Organismo emisor:** Organismo / Secretaría / Comité de Normalización.
- **Campo de aplicación:** Vidrio para fachadas, cancelería y usos en edificación.
- **Objetivo:** Definir requisitos técnicos mínimos de seguridad y desempeño.

## 1. Alcance y campo de aplicación

Describe detalladamente a qué tipos de vidrios, espesores y configuraciones aplica este estándar.

## 2. Clasificación y designación

| Clase | Designación | Nivel de impacto / resistencia | Espesores habituales |
| :--- | :--- | :--- | :--- |
| Clase A | Vidrio de Seguridad Templado | Nivel 1 (Mayor resistencia) | 6 mm a 12 mm |
| Clase B | Vidrio Laminado de Seguridad | Nivel 2 (Contención y retención) | 3+3 mm a 10+10 mm |

## 3. Especificaciones y requisitos técnicos

1. **Resistencia mecánica:** Debe soportar los ensayos de impacto pendular establecidos.
2. **Fragmentación:** En caso de rotura, los fragmentos no deben presentar aristas cortantes peligrosas.
3. **Marcado obligatorio:** Todo panel procesado debe incluir grabado permanente indeleble.

## 4. Métodos de prueba

- Ensayo de impacto por caída libre de peso o bolsa pendular.
- Ensayo de fragmentación y conteo de trozos en 50x50 mm.
- Ensayo de choque térmico y resistencia a diferenciales de temperatura.
`,
  },
  guia: {
    label: "Guía de Producto y Prestaciones",
    subtitle: "Criterios técnicos, prestaciones recomendadas y recomendaciones de especificación.",
    category: "Guía de Producto",
    families: ["Control Solar y Low-E", "Doble Acristalamiento (DGU)"],
    content: `## Descripción técnica

Presentación del producto o familia de vidrios, tecnología de capa (magnetrónica, pirolítica o masa) y propósito principal (control solar, aislamiento acústico o térmico).

## Prestaciones y valores recomendados

| Configuración | TL (%) | FS / SHGC | Valor Ug (W/m²K) | Rw Acústico (dB) |
| :--- | :---: | :---: | :---: | :---: |
| Monolítico 6 mm claro | 88% | 0.81 | 5.7 | 31 dB |
| Doble Acristalamiento (DGU) 6-12-6 | 70% | 0.40 | 1.4 | 36 dB |
| Laminado acústico 4+4 PVB Acústico | 82% | 0.65 | 5.3 | 38 dB |

## Ventajas principales

- **Eficiencia energética:** Reduce significativamente la ganancia solar y consumo de climatización.
- **Confort visual:** Transmisión luminosa balanceada con reflectancia exterior moderada.
- **Seguridad física:** Vidrio procesado con templado térmico o interlámina de seguridad.

## Recomendaciones de instalación y manipulación

1. Asegurar drenaje perimetral adecuado en la perfilería para evitar estancamiento de humedad.
2. Usar calzos de apoyo de dureza Shore A 70-80 en las posiciones normativas.
3. Compatibilidad química estricta de selladores estructurales con el intercalario y los bordes.
`,
  },
  instalacion: {
    label: "Criterio de Instalación y Montaje",
    subtitle: "Requisitos de calzado, sellado perimetral y tolerancias en obra.",
    category: "Criterio de Instalación",
    families: ["Vidrio Laminado", "Vidrio Templado"],
    content: `## Objetivo

Definir los lineamientos y precauciones para la correcta instalación en cancelería o muros cortina, evitando roturas térmicas o delaminación.

## Criterios de calzado de apoyo y laterales

1. **Ubicación:** Calzos de apoyo situados a un décimo de la longitud de la base (L/10), mínimo a 50 mm de las esquinas.
2. **Material:** EPDM o silicona de dureza Shore A 70 a 80.
3. **Holguras perimetrales:** Mínimo 5 mm en todo el contorno para permitir dilatación térmica.

## Compatibilidad de selladores

- Prohibido el contacto de siliconas acéticas con los bordes de vidrio laminado (riesgo de ataque químico al PVB).
- Utilizar exclusivamente selladores de curado neutro compatibles con la barrera de estanqueidad de unidades aislantes.
`,
  },
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function KnowledgeEditor({
  action,
  initialValues = {},
  isEditing = false,
  cancelHref = "/conocimiento",
}: {
  action: (formData: FormData) => void | Promise<void>;
  initialValues?: KnowledgeFormValues;
  isEditing?: boolean;
  cancelHref?: string;
}) {
  const contentId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initialValues.title ?? "");
  const [subtitle, setSubtitle] = useState(initialValues.subtitle ?? "");
  const [fileName, setFileName] = useState(initialValues.fileName ?? "");
  const [isAutoFileName, setIsAutoFileName] = useState(!initialValues.fileName);
  const [category, setCategory] = useState<KnowledgeCategory>(
    initialValues.category ?? "Guía de Producto",
  );
  const [families, setFamilies] = useState<string[]>(
    initialValues.families ?? ["Vidrio Templado"],
  );
  const [standards, setStandards] = useState<string>(
    initialValues.standards ? initialValues.standards.join(", ") : "",
  );
  const [content, setContent] = useState(initialValues.content ?? "");
  const [viewMode, setViewMode] = useState<"edit" | "split" | "preview">("split");

  // Estados de IA y Copiloto
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState("");
  const [isImportingPdf, setIsImportingPdf] = useState(false);
  const [complianceResult, setComplianceResult] = useState<{
    score: number;
    strengths: string[];
    improvements: string[];
    missingStandards: string[];
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || isEditing) return;
    const raw = sessionStorage.getItem("calumen_imported_pdf");
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data.title) setTitle(data.title);
        if (data.subtitle) setSubtitle(data.subtitle);
        if (data.category) setCategory(data.category);
        if (data.families && data.families.length > 0) setFamilies(data.families);
        if (data.standards && data.standards.length > 0) setStandards(data.standards.join(", "));
        if (data.suggestedFileName) setFileName(data.suggestedFileName);
        if (data.content) setContent(data.content);
        setViewMode("split");
      } catch {
        // ignorar
      } finally {
        sessionStorage.removeItem("calumen_imported_pdf");
      }
    }
  }, [isEditing]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (isAutoFileName && !isEditing) {
      const slug = slugify(newTitle);
      setFileName(slug ? `${slug}.md` : "");
    }
  };

  const toggleFamily = (fam: string) => {
    setFamilies((prev) =>
      prev.includes(fam) ? prev.filter((f) => f !== fam) : [...prev, fam],
    );
  };

  const handleTemplateSelect = (key: string) => {
    if (!key || !TEMPLATES[key]) return;
    const t = TEMPLATES[key];
    if (content.trim().length > 0) {
      const ok = confirm("¿Deseas reemplazar el contenido actual por la plantilla seleccionada?");
      if (!ok) return;
    }
    setContent(t.content);
    if (!subtitle) setSubtitle(t.subtitle);
    setCategory(t.category);
    setFamilies(t.families);
  };

  const insertMarkdown = (before: string, after: string = "", placeholder: string = "") => {
    const textarea = document.getElementById(contentId) as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const replacement = `${before}${selectedText || placeholder}${after}`;

    const newContent =
      textarea.value.substring(0, start) +
      replacement +
      textarea.value.substring(end);

    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + (selectedText || placeholder).length,
      );
    }, 10);
  };

  // Copiloto: Llamar endpoint de IA para generar borrador o enriquecer
  const callAiAssist = async (copilotAction: "generate_draft" | "improve_technical" | "add_table" | "validate_compliance") => {
    if (copilotAction === "generate_draft" && !title.trim()) {
      alert("Por favor escribe primero un título para que la IA genere el borrador.");
      return;
    }

    setIsAiLoading(true);
    setAiStatusMessage(
      copilotAction === "generate_draft"
        ? "Generando borrador técnico con IA..."
        : copilotAction === "improve_technical"
          ? "Enriqueciendo rigor técnico y tablas..."
          : copilotAction === "add_table"
            ? "Generando tabla de prestaciones sugeridas..."
            : "Validando cumplimiento técnico y normativo...",
    );

    try {
      const res = await fetch("/api/ai/knowledge-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: copilotAction,
          title,
          subtitle,
          category,
          families,
          content,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || "No se pudo completar la acción con IA.");
        return;
      }

      if (copilotAction === "validate_compliance") {
        setComplianceResult(data.compliance);
      } else if (copilotAction === "add_table") {
        insertMarkdown(`\n\n${data.markdown}\n\n`);
      } else if (copilotAction === "improve_technical" || copilotAction === "generate_draft") {
        setContent(data.markdown);
      }
    } catch (err: any) {
      alert(`Error al conectar con el Asistente IA: ${err.message}`);
    } finally {
      setIsAiLoading(false);
      setAiStatusMessage("");
    }
  };

  // Importador de PDF a Markdown
  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImportingPdf(true);
    setAiStatusMessage("Extrayendo y estructurando PDF a Markdown con IA...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/knowledge/import-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || "No se pudo importar el PDF.");
        return;
      }

      if (data.title) setTitle(data.title);
      if (data.subtitle) setSubtitle(data.subtitle);
      if (data.category) setCategory(data.category);
      if (data.families && data.families.length > 0) setFamilies(data.families);
      if (data.standards && data.standards.length > 0) setStandards(data.standards.join(", "));
      if (data.suggestedFileName && !isEditing) setFileName(data.suggestedFileName);
      if (data.content) setContent(data.content);

      setViewMode("split");
    } catch (err: any) {
      alert(`Error al procesar el PDF: ${err.message}`);
    } finally {
      setIsImportingPdf(false);
      setAiStatusMessage("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <form action={action} className="space-y-6">
      {isEditing && initialValues.originalFileName ? (
        <input
          type="hidden"
          name="originalFileName"
          value={initialValues.originalFileName}
        />
      ) : null}

      {/* Inputs ocultos de categorización para el Server Action */}
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="families" value={families.join(", ")} />
      <input type="hidden" name="standards" value={standards} />

      {/* Input oculto para carga de PDF */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handlePdfUpload}
      />

      {/* Banner de Estado de IA / Carga */}
      {(isAiLoading || isImportingPdf) && (
        <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 p-4 text-xs font-medium text-brand-800 shadow-xs">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          <span>{aiStatusMessage}</span>
        </div>
      )}

      {/* Panel de Validación Técnica (si se evaluó con IA) */}
      {complianceResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 shadow-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Evaluación Técnica de Rigor (IA): Puntuación {complianceResult.score}/100
            </span>
            <button
              type="button"
              onClick={() => setComplianceResult(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="font-semibold text-emerald-800">Puntos Fuertes:</p>
              <ul className="mt-1 list-disc pl-4 text-slate-700">
                {complianceResult.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-amber-800">Sugerencias de Mejora:</p>
              <ul className="mt-1 list-disc pl-4 text-slate-700">
                {complianceResult.improvements.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tarjeta de Metadatos y Clasificación */}
      <SpectrumCard padding="md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Metadatos y Clasificación Técnica
            </h3>
            <p className="text-xs text-slate-500">
              Información de indexación para el repositorio y el Asistente IA.
            </p>
          </div>
          {!isEditing ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImportingPdf}
              className="btn-secondary text-xs inline-flex items-center gap-1.5 border-dashed border-brand-300 bg-brand-50/50 hover:bg-brand-50 text-brand-700"
            >
              <Upload className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Importar Ficha desde PDF</span>
              <span className="sm:hidden">Subir PDF</span>
            </button>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Título del artículo *"
            htmlFor="title"
            className="sm:col-span-2"
          >
            <input
              id="title"
              name="title"
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ej. NOM-146-SCFI-2016 — Vidrio de seguridad o Guía de Doble Acristalamiento Solar"
              className="input text-base font-medium"
            />
          </Field>

          <Field
            label="Subtítulo o descripción breve"
            htmlFor="subtitle"
            className="sm:col-span-1"
          >
            <input
              id="subtitle"
              name="subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Resumen o especificaciones de referencia"
              className="input"
            />
          </Field>

          <Field
            label="Categoría del documento *"
            htmlFor="category_select"
            className="sm:col-span-1"
          >
            <select
              id="category_select"
              value={category}
              onChange={(e) => setCategory(e.target.value as KnowledgeCategory)}
              className="input"
            >
              {KNOWLEDGE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Nombre del archivo Markdown (.md) *"
            htmlFor="fileName"
            className="sm:col-span-1"
          >
            <div className="flex items-center gap-2">
              <input
                id="fileName"
                name="fileName"
                required
                value={fileName}
                disabled={isEditing}
                onChange={(e) => {
                  setIsAutoFileName(false);
                  setFileName(e.target.value);
                }}
                placeholder="ejemplo-documento.md"
                className={`input font-mono text-xs ${isEditing ? "bg-slate-50 text-slate-500" : ""}`}
              />
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => {
                    const slug = slugify(title);
                    setFileName(slug ? `${slug}.md` : "");
                    setIsAutoFileName(true);
                  }}
                  title="Auto-generar nombre a partir del título"
                  className="btn-secondary shrink-0 px-2.5 py-1.5 text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </Field>

          <Field
            label="Normas técnicas relacionadas (separadas por coma)"
            htmlFor="standards_input"
            className="sm:col-span-1"
          >
            <input
              id="standards_input"
              value={standards}
              onChange={(e) => setStandards(e.target.value)}
              placeholder="Ej. NOM-146-SCFI-2016, EN 410, EN 673, NFRC 100"
              className="input text-xs"
            />
          </Field>
        </div>

        {/* Selector de Familias de Vidrio */}
        <div className="mt-4 border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold text-slate-600 block mb-2">
            Familias de vidrio aplicables:
          </span>
          <div className="flex flex-wrap gap-2">
            {GLASS_FAMILIES.map((fam) => {
              const active = families.includes(fam);
              return (
                <button
                  key={fam}
                  type="button"
                  onClick={() => toggleFamily(fam)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-brand-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {fam}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selector de Plantilla */}
        {!isEditing ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-xs font-semibold text-slate-500">
              Plantillas base:
            </span>
            {Object.entries(TEMPLATES).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleTemplateSelect(key)}
                className="chip hover:bg-brand-50 hover:text-brand-700 transition"
              >
                + {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </SpectrumCard>

      {/* Editor y Previsualización */}
      <SpectrumCard padding="none" className="overflow-hidden">
        {/* Barra de herramientas y modos */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/70 p-2 sm:px-4">
          {/* Herramientas de formato */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => insertMarkdown("**", "**", "texto en negrita")}
              className="rounded p-1.5 text-slate-600 hover:bg-slate-200/80 transition"
              title="Negrita (**)"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown("*", "*", "texto en cursiva")}
              className="rounded p-1.5 text-slate-600 hover:bg-slate-200/80 transition"
              title="Cursiva (*)"
            >
              <Italic className="h-4 w-4" />
            </button>
            <span className="mx-1 h-4 w-px bg-slate-300" />
            <button
              type="button"
              onClick={() => insertMarkdown("## ", "\n", "Título de Sección")}
              className="rounded p-1.5 text-slate-600 hover:bg-slate-200/80 transition"
              title="Encabezado H2"
            >
              <Heading2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown("### ", "\n", "Subapartado")}
              className="rounded p-1.5 text-slate-600 hover:bg-slate-200/80 transition"
              title="Encabezado H3"
            >
              <Heading3 className="h-4 w-4" />
            </button>
            <span className="mx-1 h-4 w-px bg-slate-300" />
            <button
              type="button"
              onClick={() => insertMarkdown("- ", "\n", "Elemento de lista")}
              className="rounded p-1.5 text-slate-600 hover:bg-slate-200/80 transition"
              title="Lista con viñetas"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown("1. ", "\n", "Elemento numerado")}
              className="rounded p-1.5 text-slate-600 hover:bg-slate-200/80 transition"
              title="Lista numerada"
            >
              <ListOrdered className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                insertMarkdown(
                  "\n| Parámetro | Valor | Unidad |\n| :--- | :--- | :--- |\n| Espesor | 6.0 | mm |\n| Transmisión | 80% | % |\n\n",
                )
              }
              className="rounded p-1.5 text-slate-600 hover:bg-slate-200/80 transition"
              title="Insertar tabla"
            >
              <Table className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown("> ", "\n", "Nota o cita técnica")}
              className="rounded p-1.5 text-slate-600 hover:bg-slate-200/80 transition"
              title="Cita o nota"
            >
              <Quote className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown("```\n", "\n```\n", "especificación")}
              className="rounded p-1.5 text-slate-600 hover:bg-slate-200/80 transition"
              title="Bloque de código"
            >
              <Code className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                insertMarkdown("> [!IMPORTANT]\n> ", "\n", "Requisito normativo mandatorio.")
              }
              className="rounded p-1.5 text-slate-600 hover:bg-slate-200/80 transition"
              title="Alerta Importante"
            >
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </button>
          </div>

          {/* Botones de Copiloto IA */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => callAiAssist("generate_draft")}
              disabled={isAiLoading}
              className="btn-ghost text-xs px-2 py-1 text-purple-700 hover:bg-purple-50 inline-flex items-center gap-1 border border-purple-200 rounded"
              title="Generar borrador técnico completo asistido por IA"
            >
              <Wand2 className="h-3.5 w-3.5 text-purple-600" />
              Borrador con IA
            </button>

            <button
              type="button"
              onClick={() => callAiAssist("add_table")}
              disabled={isAiLoading}
              className="btn-ghost text-xs px-2 py-1 text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1 border border-slate-200 rounded"
              title="Generar tabla de valores recomendados con IA"
            >
              <Sparkles className="h-3.5 w-3.5 text-brand-600" />
              Tabla IA
            </button>

            <button
              type="button"
              onClick={() => callAiAssist("validate_compliance")}
              disabled={isAiLoading}
              className="btn-ghost text-xs px-2 py-1 text-emerald-700 hover:bg-emerald-50 inline-flex items-center gap-1 border border-emerald-200 rounded"
              title="Validar rigor técnico y normas"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-emerald-600" />
              Validar Rigor
            </button>

            <span className="mx-1 h-4 w-px bg-slate-300" />

            {/* Selector de Modos de Vista */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("edit")}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${
                  viewMode === "edit"
                    ? "bg-brand-50 text-brand-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Edit3 className="h-3.5 w-3.5" />
                Editor
              </button>
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={`hidden sm:flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${
                  viewMode === "split"
                    ? "bg-brand-50 text-brand-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Columns className="h-3.5 w-3.5" />
                Dividido
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${
                  viewMode === "preview"
                    ? "bg-brand-50 text-brand-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Vista previa
              </button>
            </div>
          </div>
        </div>

        {/* Área de Trabajo */}
        <div
          className={`grid min-h-[500px] ${
            viewMode === "split"
              ? "grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200"
              : "grid-cols-1"
          }`}
        >
          {viewMode !== "preview" ? (
            <div className="flex flex-col p-4">
              <textarea
                id={contentId}
                name="content"
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escribe el artículo en formato Markdown (.md)...&#10;&#10;Usa ## para encabezados, tablas GFM, listas y citas técnicas."
                className="h-full min-h-[460px] w-full resize-y font-mono text-xs leading-relaxed text-slate-800 placeholder-slate-400 focus:outline-none"
              />
            </div>
          ) : null}

          {viewMode !== "edit" ? (
            <div className="flex flex-col bg-slate-50/40 p-5 overflow-y-auto max-h-[700px]">
              <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Vista Previa en Tiempo Real
                </span>
                <span className="text-[11px] text-slate-400">
                  {wordCount} palabras · ~{readTimeMinutes} min de lectura
                </span>
              </div>
              {content.trim() ? (
                <div className="prose prose-sm max-w-none text-slate-700">
                  {title ? (
                    <div className="mb-4 border-b border-slate-200 pb-3">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="badge badge-blue">{category}</span>
                        {families.map((f) => (
                          <span key={f} className="chip">{f}</span>
                        ))}
                      </div>
                      <h1 className="text-xl font-bold tracking-tight text-slate-900">
                        {title}
                      </h1>
                      {subtitle ? (
                        <p className="mt-1 text-sm text-slate-500 italic">
                          {subtitle}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <AiMarkdown content={content} />
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
                  <FileText className="mb-2 h-8 w-8 stroke-1 text-slate-300" />
                  <p className="text-sm">El contenido que redactes aparecerá formateado aquí.</p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Barra inferior de estado */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-4 py-2.5 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>{charCount} caracteres</span>
            <span>{wordCount} palabras</span>
            <span>~{readTimeMinutes} min de lectura</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-slate-600">
              YAML Frontmatter y GFM compatibles con Asistente IA (NIM & Gemini)
            </span>
          </div>
        </div>
      </SpectrumCard>

      {/* Botones de Acción */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <Link href={cancelHref} className="btn-secondary">
          Cancelar
        </Link>
        <SubmitButton
          className="btn-primary"
          pendingLabel="Guardando artículo..."
        >
          {isEditing ? "Guardar cambios (.md)" : "Crear artículo (.md)"}
        </SubmitButton>
      </div>
    </form>
  );
}
