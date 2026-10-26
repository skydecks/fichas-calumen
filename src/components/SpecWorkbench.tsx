"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconAlert,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconDownload,
  IconEye,
  IconEyeOff,
  IconFilePdf,
  IconPackage,
  IconPlus,
  IconSave,
  IconSparkles,
  IconTrash,
  IconUpload,
  IconX,
} from "@/components/icons";
import {
  glassLayerBars,
  layerLabel,
  layersToText,
  mergeParsedLayers,
  parseCalumenHtml,
  parseLayers,
} from "@/lib/calumen";
import {
  SECTION_ICONS,
  SECTION_LABELS,
  SPEC_STATUSES,
  STATUS_LABEL,
  makeId,
  colorForLayer,
  type GlassLayer,
  type GlassLayerKind,
  type PerfRow,
  type PerfSection,
  type SpecData,
  type SpecStatus,
} from "@/lib/types";
import { analyzeComposition, COMPOSITION_PRESETS } from "@/lib/composition";
import type { ProductRecord } from "@/lib/products";
import { cn, pdfFileName } from "@/lib/utils";
import { SpectrumButton } from "@/components/spectrum/button";
import ThicknessSelect from "@/components/ThicknessSelect";
import {
  aiOverrideFromSettings,
  brandingFromSettings,
  getProvider,
  loadAppSettings,
  useAppSettings,
} from "@/lib/app-settings";

type ProjectOption = {
  id: string;
  name: string;
  clientName: string;
  agentId: string | null;
};

type AgentOption = { id: string; name: string; active: boolean };

export type WorkbenchInitialMeta = {
  projectId: string;
  agentId: string;
  status: string;
  notes: string;
  glassName: string;
  rawHtml: string | null;
};

type Flash = { type: "success" | "error" | "info"; text: string } | null;

type PdfImportData = {
  sourceType?: "pdf" | "html" | "manual";
  fileName?: string;
  documentTitle?: string;
  glassName?: string;
  meta?: {
    calculatedBy?: string;
    calculatedAt?: string;
    catalog?: string;
    standard?: string;
  };
  layers?: GlassLayer[];
  sections?: PerfSection[];
  rawText?: string;
};

type AiFieldSuggestion = {
  field: string;
  value: string;
  reason?: string;
};

const SUGGESTION_LABELS: Record<string, string> = {
  glassName: "Nombre comercial",
  reference: "Referencia interna",
  catalog: "Catálogo",
  standard: "Normas",
  calculatedBy: "Calculado por",
  notes: "Notas internas",
};

const LAYER_KIND_OPTIONS: { value: GlassLayerKind; label: string }[] = [
  { value: "substrate", label: "Sustrato" },
  { value: "coating", label: "Capa" },
  { value: "cavity", label: "Cámara" },
  { value: "air", label: "Cámara de aire" },
  { value: "interlayer", label: "Butiral" },
  { value: "enamel", label: "Serigrafía" },
  { value: "unknown", label: "Otro" },
];

const ADD_LAYER_OPTIONS: { kind: GlassLayerKind; label: string }[] = [
  { kind: "substrate", label: "Sustrato" },
  { kind: "cavity", label: "Cámara" },
  { kind: "interlayer", label: "Butiral" },
  { kind: "coating", label: "Capa" },
  { kind: "enamel", label: "Serigrafía" },
];

const TREATMENT_OPTIONS = [
  "",
  "Templado",
  "Termoendurecido",
  "Recocido",
  "Endurecido",
];

const MATERIAL_OPTIONS = [
  "PLANILUX",
  "PLANITHERM HN",
  "PLANITHERM ONE",
  "PLANICLEAR",
  "PVB STANDARD",
  "PVB SENTRYGLAS",
  "EVA",
  "Cámara de aire",
  "Aire",
  "Argón",
  "Serigrafía",
];

function layerKindOf(layer: GlassLayer): GlassLayerKind {
  if (layer.kind) return layer.kind;
  const key = layer.material
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/\b(air|aire)\b/.test(key)) return "air";
  if (/camara|cavity|argon|kripton|krypton|gas/.test(key)) return "cavity";
  if (/pvb|sentry|butiral|ionoplast|eva|interlayer/.test(key))
    return "interlayer";
  if (/serigrafia|enamel/.test(key)) return "enamel";
  if (/planitherm|cool.?lite|stopray|suncool|coating|low.?e/.test(key))
    return "coating";
  return "substrate";
}

function layerKindLabel(kind: GlassLayerKind): string {
  return LAYER_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? "Otro";
}

const ICON_OPTIONS = Object.entries(SECTION_ICONS).map(([key, file]) => ({
  key,
  file,
  label: SECTION_LABELS[key] ?? key,
}));

const EXAMPLE_LAYERS =
  "PLANILUX(12mm) - Termoendurecido\nPVB STANDARD(1.52mm)\nPLANILUX(12mm) - Termoendurecido";

export default function SpecWorkbench({
  specId,
  initial,
  initialMeta,
  projects,
  agents,
}: {
  specId?: string;
  initial: SpecData;
  initialMeta: WorkbenchInitialMeta;
  projects: ProjectOption[];
  agents: AgentOption[];
}) {
  const router = useRouter();
  const sectionsRef = useRef<HTMLDivElement>(null);
  const compositionRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const aiPanelRef = useRef<HTMLDivElement>(null);

  const [reference, setReference] = useState(initial.reference);
  const [projectId, setProjectId] = useState(initialMeta.projectId);
  const [agentId, setAgentId] = useState(initialMeta.agentId);
  const [status, setStatus] = useState<SpecStatus>(
    (SPEC_STATUSES as string[]).includes(initialMeta.status)
      ? (initialMeta.status as SpecStatus)
      : "BORRADOR",
  );
  const [calculatedBy, setCalculatedBy] = useState(initial.calculatedBy);
  const [calculatedAt, setCalculatedAt] = useState(initial.calculatedAt);
  const [catalog, setCatalog] = useState(initial.catalog);
  const [standard, setStandard] = useState(initial.standard);
  const [notes, setNotes] = useState(initialMeta.notes);
  const [glassName, setGlassName] = useState(initialMeta.glassName);
  const [layers, setLayers] = useState<GlassLayer[]>(initial.layers);
  const [catalogProducts, setCatalogProducts] = useState<ProductRecord[]>([]);
  const [catalogProductId, setCatalogProductId] = useState("");
  const [presetId, setPresetId] = useState("");
  const [advancedText, setAdvancedText] = useState(layersToText(initial.layers));
  const [rawHtml, setRawHtml] = useState(initialMeta.rawHtml ?? "");

  const [sections, setSections] = useState<PerfSection[]>(initial.sections);
  const [pinned, setPinned] = useState<PerfRow[]>(initial.pinned);

  const [warnings, setWarnings] = useState<string[]>([]);
  const [flash, setFlash] = useState<Flash>(null);
  const [saving, setSaving] = useState(false);
  const [pdfImporting, setPdfImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const dragDepth = useRef(0);
  const [lastPdfData, setLastPdfData] = useState<PdfImportData | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AiFieldSuggestion[]>([]);
  const [aiAlternatives, setAiAlternatives] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestError, setAiSuggestError] = useState<string | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const appSettings = useAppSettings();
  const providerName = getProvider(appSettings).name || "SkyDeck ICS";

  const layerText = useMemo(() => layersToText(layers), [layers]);

  useEffect(() => {
    setAdvancedText(layerText);
  }, [layerText]);

  useEffect(() => {
    let active = true;
    fetch("/api/products?active=1")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { data?: ProductRecord[] } | null) => {
        if (active && Array.isArray(payload?.data)) {
          setCatalogProducts(payload.data);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (specId) return;
    const settings = loadAppSettings();
    if (settings.defaultCalculatedBy) {
      setCalculatedBy(settings.defaultCalculatedBy);
    }
    if (settings.defaultCatalog) setCatalog(settings.defaultCatalog);
    if (settings.defaultStandard) setStandard(settings.defaultStandard);
  }, [specId]);

  const compositionAnalysis = useMemo(
    () => analyzeComposition(layers),
    [layers],
  );
  const thickness = compositionAnalysis.totalThickness;
  const bars = useMemo(
    () => glassLayerBars(layers, { maxWidth: 110, maxScale: 4.4, minWidth: 2 }),
    [layers],
  );

  const totalRows = sections.reduce((acc, section) => acc + section.rows.length, 0);

  const keyValue = (needle: string) => {
    const found = sections
      .flatMap((section) => section.rows)
      .find(
        (row) =>
          row.value &&
          row.label.toLowerCase().includes(needle.toLowerCase()),
      );
    return found?.value;
  };

  const selectedProject = projects.find((p) => p.id === projectId);

  useEffect(() => {
    if (!previewUrl) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewUrl(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function notify(type: "success" | "error" | "info", text: string) {
    setFlash({ type, text });
    window.setTimeout(() => setFlash(null), 5000);
  }

  function handleAnalyze(sourceHtml?: string) {
    const html = sourceHtml ?? rawHtml;
    if (!html.trim()) {
      notify("error", "Pega o arrastra primero un HTML de Calumen.");
      return;
    }
    try {
      const result = parseCalumenHtml(html);
      const hasSections = result.sections.length > 0;
      const hasLayers = result.layers.length > 0;

      if (hasSections) {
        setSections(result.sections);
        setPinned(result.pinned);
      }

      let effectiveLayers = layers;
      if (hasLayers) {
        effectiveLayers = mergeParsedLayers(layers, result.layers);
        setLayers(effectiveLayers);
      }

      if (result.glassName && !glassName.trim()) {
        setGlassName(result.glassName);
      }

      setWarnings([...result.warnings]);

      if (hasSections || hasLayers) {
        const parts: string[] = [];
        if (hasSections) parts.push(`${result.sections.length} apartados`);
        if (hasLayers) parts.push(`${result.layers.length} capas`);
        notify(
          "success",
          `Se detectaron ${parts.join(" y ")}. Revisa los datos antes de emitir.`,
        );
        if (loadAppSettings().autoSuggestPdf) {
          void requestAiSuggestions({
            sourceType: "html",
            documentTitle: result.glassName,
            glassName: result.glassName,
            layers: effectiveLayers,
            sections: result.sections,
            meta: { calculatedBy, calculatedAt, catalog, standard },
          });
        }
        window.setTimeout(() => {
          const target = hasSections
            ? sectionsRef.current
            : compositionRef.current;
          target?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 120);
      } else {
        notify(
          "error",
          "No se detectaron prestaciones ni composición en el HTML.",
        );
      }
    } catch (error) {
      console.error(error);
      notify("error", "El HTML pegado no tiene un formato reconocible.");
    }
  }

  function clearPaste() {
    setRawHtml("");
    setSections([]);
    setPinned([]);
    setWarnings([]);
    setLastPdfData(null);
    dismissAiSuggestions();
  }

  function currentFieldValue(field: string): string {
    switch (field) {
      case "glassName":
        return glassName;
      case "reference":
        return reference;
      case "catalog":
        return catalog;
      case "standard":
        return standard;
      case "calculatedBy":
        return calculatedBy;
      case "notes":
        return notes;
      default:
        return "";
    }
  }

  function suggestionSource(): PdfImportData {
    return (
      lastPdfData ?? {
        sourceType: "manual",
        layers,
        sections,
        meta: { calculatedBy, calculatedAt, catalog, standard },
      }
    );
  }

  async function requestAiSuggestions(source: PdfImportData) {
    setAiSuggesting(true);
    setAiSuggestError(null);
    setAiSuggestions([]);
    setAiAlternatives([]);
    setAiSummary("");
    setAppliedSuggestions([]);

    try {
      const response = await fetch("/api/ai/suggest-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            sourceType: source.sourceType ?? "manual",
            fileName: source.fileName,
            documentTitle: source.documentTitle,
            calculatedBy: source.meta?.calculatedBy,
            calculatedAt: source.meta?.calculatedAt,
            catalog: source.meta?.catalog,
            standard: source.meta?.standard,
            layers:
              source.layers && source.layers.length > 0
                ? source.layers
                : layers,
            sections:
              source.sections && source.sections.length > 0
                ? source.sections
                : sections,
            rawText: source.rawText,
            current: {
              glassName: source.glassName || glassName,
              reference,
              catalog,
              standard,
              calculatedBy,
              notes,
            },
          },
          ai: aiOverrideFromSettings(loadAppSettings()),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            suggestions?: AiFieldSuggestion[];
            alternatives?: string[];
            summary?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            `${providerName} no pudo sugerir cambios para esta ficha.`,
        );
      }

      const suggestions = Array.isArray(payload?.suggestions)
        ? payload.suggestions.filter(
            (item) =>
              typeof item?.field === "string" &&
              typeof item?.value === "string" &&
              item.value.trim().length > 0,
          )
        : [];

      setAiSuggestions(suggestions);
      setAiAlternatives(
        Array.isArray(payload?.alternatives)
          ? payload.alternatives
              .filter((item): item is string => typeof item === "string")
              .filter(Boolean)
              .slice(0, 4)
          : [],
      );
      setAiSummary(
        typeof payload?.summary === "string" ? payload.summary : "",
      );

      if (suggestions.length === 0) {
        setAiSuggestError(
          `${providerName} no propuso cambios. Puedes editar los campos manualmente.`,
        );
      }
    } catch (error) {
      console.error(error);
      setAiSuggestError(
        error instanceof Error
          ? error.message
          : `No se pudieron generar las sugerencias con ${providerName}.`,
      );
    } finally {
      setAiSuggesting(false);
    }
  }

  function applyAiSuggestion(field: string, value: string) {
    const text = value.trim();
    if (!text) return;

    switch (field) {
      case "glassName":
        setGlassName(text);
        break;
      case "reference":
        setReference(text);
        break;
      case "catalog":
        setCatalog(text);
        break;
      case "standard":
        setStandard(text);
        break;
      case "calculatedBy":
        setCalculatedBy(text);
        break;
      case "notes":
        setNotes(text);
        break;
      default:
        return;
    }

    setAppliedSuggestions((previous) =>
      previous.includes(field) ? previous : [...previous, field],
    );
  }

  function applyAllAiSuggestions() {
    for (const suggestion of aiSuggestions) {
      applyAiSuggestion(suggestion.field, suggestion.value);
    }
  }

  function dismissAiSuggestions() {
    setAiSuggestions([]);
    setAiAlternatives([]);
    setAiSummary("");
    setAiSuggestError(null);
    setAppliedSuggestions([]);
  }

  async function handlePdfImport(file: File) {
    setPdfImporting(true);
    setWarnings([]);
    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch("/api/pdf-import", {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "No se pudo importar el PDF.");
      }

      const data = await response.json();

      if (data.sections && data.sections.length > 0) {
        setSections(data.sections);
      }
      if (data.layers && data.layers.length > 0) {
        const merged = mergeParsedLayers(layers, data.layers);
        setLayers(merged);
      }
      if (data.glassName && !glassName.trim()) {
        setGlassName(data.glassName);
      }
      if (data.warnings && data.warnings.length > 0) {
        setWarnings(data.warnings);
      }

      const pdfData: PdfImportData = {
        sourceType: "pdf",
        fileName:
          typeof data.fileName === "string" ? data.fileName : file.name,
        documentTitle:
          typeof data.documentTitle === "string"
            ? data.documentTitle
            : undefined,
        glassName:
          typeof data.glassName === "string" ? data.glassName : undefined,
        meta:
          typeof data.meta === "object" && data.meta !== null
            ? (data.meta as PdfImportData["meta"])
            : undefined,
        layers: Array.isArray(data.layers) ? data.layers : undefined,
        sections: Array.isArray(data.sections) ? data.sections : undefined,
        rawText:
          typeof data.rawText === "string" ? data.rawText : undefined,
      };
      setLastPdfData(pdfData);
      const settings = loadAppSettings();
      if (settings.autoSuggestPdf) {
        void requestAiSuggestions(pdfData);
      }

      const parts: string[] = [];
      if (data.sections?.length) parts.push(`${data.sections.length} apartados`);
      if (data.layers?.length) parts.push(`${data.layers.length} capas`);
      notify(
        "success",
        parts.length
          ? settings.autoSuggestPdf
            ? `PDF importado: ${parts.join(" y ")}. ${getProvider(settings).name} está sugiriendo nombres y campos.`
            : `PDF importado: ${parts.join(" y ")}. Pulsa «Sugerir con IA» para analizarlo.`
          : "El PDF no trajo datos reconocibles.",
      );
      window.setTimeout(() => {
        const target =
          aiPanelRef.current ??
          (data.sections?.length
            ? sectionsRef.current
            : compositionRef.current);
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 250);
    } catch (error) {
      console.error(error);
      notify(
        "error",
        error instanceof Error ? error.message : "No se pudo importar el PDF.",
      );
    } finally {
      setPdfImporting(false);
    }
  }

  async function handleDroppedFile(file: File) {
    const name = file.name.toLowerCase();

    if (file.type === "application/pdf" || name.endsWith(".pdf")) {
      if (file.size > 12 * 1024 * 1024) {
        notify("error", "El PDF supera los 12 MB.");
        return;
      }
      await handlePdfImport(file);
      return;
    }

    if (
      name.endsWith(".html") ||
      name.endsWith(".htm") ||
      name.endsWith(".txt") ||
      file.type === "text/html" ||
      file.type === "text/plain"
    ) {
      if (file.size > 2 * 1024 * 1024) {
        notify("error", "El archivo HTML supera los 2 MB.");
        return;
      }
      try {
        const text = await file.text();
        if (!text.trim()) {
          notify("error", "El archivo HTML está vacío.");
          return;
        }
        setRawHtml(text);
        notify("info", `${file.name} cargado. Analizando datos de Calumen…`);
        handleAnalyze(text);
      } catch {
        notify("error", "No se pudo leer el archivo HTML.");
      }
      return;
    }

    notify(
      "error",
      "Arrastra un PDF de Calumen o un archivo HTML/HTM/TXT del configurador.",
    );
  }

  function hasFileDrag(event: DragEvent<HTMLDivElement>): boolean {
    return Array.from(event.dataTransfer.types).includes("Files");
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!hasFileDrag(event)) return;
    dragDepth.current += 1;
    setDragActive(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (hasFileDrag(event)) {
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length === 0) return;
    if (files.length > 1) {
      notify("info", "Se procesará el primer archivo.");
    }
    void handleDroppedFile(files[0]);
  }

  function updateSection(sectionId: string, patch: Partial<PerfSection>) {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section,
      ),
    );
  }

  function updateRow(sectionId: string, rowId: string, patch: Partial<PerfRow>) {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              rows: section.rows.map((row) =>
                row.id === rowId ? { ...row, ...patch } : row,
              ),
            }
          : section,
      ),
    );
  }

  function addRow(sectionId: string) {
    const row: PerfRow = {
      id: makeId("row"),
      label: "Nueva prestación",
      value: "",
      kind: "row",
    };
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, rows: [...section.rows, row] }
          : section,
      ),
    );
  }

  function removeRow(sectionId: string, rowId: string) {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, rows: section.rows.filter((r) => r.id !== rowId) }
          : section,
      ),
    );
  }

  function removeSection(sectionId: string) {
    setSections((prev) => prev.filter((section) => section.id !== sectionId));
  }
  function updateLayerAt(index: number, patch: Partial<GlassLayer>) {
    setLayers((previous) =>
      previous.map((layer, current) =>
        current === index ? { ...layer, ...patch } : layer,
      ),
    );
  }

  function changeLayerKind(index: number, kind: GlassLayerKind) {
    setLayers((previous) =>
      previous.map((layer, current) => {
        if (current !== index) return layer;
        const next: GlassLayer = { ...layer, kind };
        if (kind === "cavity" || kind === "air") {
          if (!layer.material || layer.material === "PLANILUX") {
            next.material = "Cámara de aire";
          }
          if (!layer.thickness) next.thickness = "12mm";
          next.treatment = undefined;
          next.laminated = undefined;
        } else if (kind === "interlayer") {
          if (!layer.material || layer.material === "PLANILUX") {
            next.material = "PVB STANDARD";
          }
          if (!layer.thickness) next.thickness = "1.52mm";
          next.treatment = undefined;
          next.laminated = undefined;
        } else if (kind === "coating") {
          if (!layer.material || layer.material === "PLANILUX") {
            next.material = "";
          }
          next.treatment = undefined;
          next.laminated = undefined;
        } else if (kind === "substrate") {
          if (
            !layer.material ||
            layer.material === "Cámara de aire" ||
            layer.material === "PVB STANDARD"
          ) {
            next.material = "PLANILUX";
          }
          if (!layer.thickness) next.thickness = "6mm";
        }
        return next;
      }),
    );
  }

  function applyAdvancedText() {
    const parsed = parseLayers(advancedText);
    setLayers((previous) =>
      parsed.map((layer, index) => {
        const current =
          previous[index]?.material.trim().toLowerCase() ===
          layer.material.trim().toLowerCase()
            ? previous[index]
            : previous.find(
                (item) =>
                  item.material.trim().toLowerCase() ===
                  layer.material.trim().toLowerCase(),
              );
        if (!current) return layer;
        return {
          ...layer,
          kind: current.kind ?? layer.kind,
          laminated: current.laminated,
          position: current.position,
        };
      }),
    );
  }

  function addLayer(kind: GlassLayerKind) {
    const defaults: Record<GlassLayerKind, GlassLayer> = {
      substrate: { material: "PLANILUX", thickness: "6mm", kind },
      coating: { material: "", thickness: "", kind },
      cavity: { material: "Cámara de aire", thickness: "12mm", kind },
      air: { material: "Cámara de aire", thickness: "12mm", kind },
      interlayer: { material: "PVB STANDARD", thickness: "1.52mm", kind },
      enamel: { material: "Serigrafía", thickness: "", kind },
      unknown: { material: "", kind },
    };
    setLayers((previous) => [...previous, defaults[kind]]);
  }

  function applyCatalogProduct(productId: string) {
    setCatalogProductId(productId);
    const product = catalogProducts.find((item) => item.id === productId);
    if (!product) return;

    setGlassName(product.name);
    const nextLayers = product.layers.map((layer) => {
      const kind = layer.kind ?? layerKindOf(layer);
      return {
        ...layer,
        color:
          layer.color ||
          product.colors[kind] ||
          product.colors.unknown ||
          undefined,
      };
    });
    if (nextLayers.length > 0) setLayers(nextLayers);
    if (product.sections.length > 0) {
      setSections(product.sections);
      setPinned([]);
    }
    notify(
      "success",
      `Producto «${product.name}» cargado. Se aplicaron composición, colores y prestaciones.`,
    );
  }

  function applyCompositionPreset() {
    const preset = COMPOSITION_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    if (
      layers.length > 0 &&
      !window.confirm(
        `Se reemplazará la composición actual por «${preset.label}». ¿Continuar?`,
      )
    ) {
      return;
    }
    setLayers(preset.layers.map((layer) => ({ ...layer })));
    notify("success", `Composición «${preset.label}» aplicada. Ajusta espesores y materiales si es necesario.`);
  }

  function removeLayerAt(index: number) {
    setLayers((previous) =>
      previous.filter((_, current) => current !== index),
    );
  }

  function moveLayerAt(index: number, delta: number) {
    setLayers((previous) => {
      const target = index + delta;
      if (target < 0 || target >= previous.length) return previous;
      const copy = [...previous];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  }


  function moveSection(sectionId: string, delta: number) {
    setSections((prev) => {
      const index = prev.findIndex((section) => section.id === sectionId);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  }

  function addSection() {
    const section: PerfSection = {
      id: makeId("sec"),
      key: "custom",
      title: "Nuevo apartado",
      standard: "",
      icon: "icon-luminosos.png",
      rows: [
        {
          id: makeId("row"),
          label: "Nueva prestación",
          value: "",
          kind: "row",
        },
      ],
    };
    setSections((prev) => [...prev, section]);
  }

  function buildBody() {
    return {
      reference: reference.trim(),
      projectId,
      agentId: agentId || null,
      projectName: selectedProject?.name ?? null,
      clientName: selectedProject?.clientName ?? null,
      agentName: agents.find((agent) => agent.id === agentId)?.name ?? null,
      glassName,
      calculatedBy,
      calculatedAt,
      catalog,
      standard,
      status,
      notes,
      layers,
      sections,
      pinned,
      rawHtml,
      branding: brandingFromSettings(loadAppSettings()),
    };
  }

  async function handlePreview() {
    if (!projectId) {
      notify("error", "Selecciona un proyecto antes de previsualizar.");
      return;
    }
    setPreviewLoading(true);
    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "No se pudo generar la vista previa.");
      }
      const blob = await response.blob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : "Error generando la vista previa.",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSave() {
    if (!reference.trim()) {
      notify("error", "La referencia de la ficha es obligatoria.");
      return;
    }
    if (!projectId) {
      notify("error", "Selecciona el proyecto al que pertenece la ficha.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        specId ? `/api/specs/${specId}` : "/api/specs",
        {
          method: specId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildBody()),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | { id?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo guardar la ficha.");
      }

      if (!specId && payload?.id) {
        router.push(`/fichas/${payload.id}`);
        router.refresh();
        return;
      }

      notify("success", "Ficha guardada correctamente.");
      router.refresh();
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : "Error guardando la ficha.",
      );
    } finally {
      setSaving(false);
    }
  }

  const flashStyles: Record<string, string> = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-blue-200 bg-blue-50 text-blue-800",
  };

  return (
    <div
      className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="min-w-0 space-y-6">
        {flash ? (
          <div
            className={cn(
              "flex items-start gap-2 rounded-xl border px-4 py-3 text-sm",
              flashStyles[flash.type],
            )}
          >
            {flash.type === "success" ? (
              <IconCheck width={16} height={16} className="mt-0.5 shrink-0" />
            ) : (
              <IconAlert width={16} height={16} className="mt-0.5 shrink-0" />
            )}
            <span>{flash.text}</span>
          </div>
        ) : null}

        {/* Datos del documento */}
        <section className="card card-pad">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="h-section">1 · Datos del documento</h2>
              <p className="mt-1 text-xs text-slate-500">
                Identifica la ficha y el proyecto al que pertenece.
              </p>
            </div>
            <span className="badge badge-blue">{STATUS_LABEL[status]}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="reference">
                Folio / referencia *
              </label>
              <input
                id="reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                className="input font-semibold"
                placeholder="Ej. FT-2026-001"
              />
              <p className="hint">
                Identificador interno. El PDF se titula con el nombre comercial
                del vidrio.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="project">
                Proyecto *
              </label>
              <select
                id="project"
                value={projectId}
                onChange={(event) => {
                  const value = event.target.value;
                  setProjectId(value);
                  const project = projects.find((p) => p.id === value);
                  if (project?.agentId) setAgentId(project.agentId);
                }}
                className="select"
              >
                <option value="">Selecciona un proyecto</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} · {project.clientName}
                  </option>
                ))}
              </select>
              {selectedProject ? (
                <p className="hint">Cliente: {selectedProject.clientName}</p>
              ) : null}
            </div>
            <div>
              <label className="label" htmlFor="agent">
                Agente de ventas
              </label>
              <select
                id="agent"
                value={agentId}
                onChange={(event) => setAgentId(event.target.value)}
                className="select"
              >
                <option value="">Sin asignar</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                    {agent.active ? "" : " (inactivo)"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="status">
                Estado
              </label>
              <select
                id="status"
                value={status}
                onChange={(event) => setStatus(event.target.value as SpecStatus)}
                className="select"
              >
                {SPEC_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABEL[value]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="glassName">
                Nombre comercial del vidrio
              </label>
              <input
                id="glassName"
                value={glassName}
                onChange={(event) => setGlassName(event.target.value)}
                className="input"
                placeholder="Ej. ClimaGuard Premium"
              />
              <p className="hint">
                Se usa como título del PDF. Si está vacío, se usa la
                referencia.
              </p>
            </div>
            <div className="sm:col-span-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                    <IconPackage width={16} height={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <label
                      className="label mb-1"
                      htmlFor="catalogProduct"
                    >
                      Producto del catálogo
                    </label>
                    <select
                      id="catalogProduct"
                      value={catalogProductId}
                      onChange={(event) =>
                        applyCatalogProduct(event.target.value)
                      }
                      className="select h-8 text-xs"
                    >
                      <option value="">Seleccionar producto…</option>
                      {catalogProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                          {product.code ? ` · ${product.code}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Link
                    href="/productos"
                    className="shrink-0 text-[11px] font-semibold text-brand-600 hover:underline"
                  >
                    Gestionar catálogo
                  </Link>
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
                  Al seleccionar un producto se cargan su composición,
                  prestaciones y colores de representación.
                </p>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="calculatedBy">
                Calculado por
              </label>
              <input
                id="calculatedBy"
                value={calculatedBy}
                onChange={(event) => setCalculatedBy(event.target.value)}
                className="input"
                placeholder="Ej. Soporte Técnico CEYCO"
              />
            </div>
            <div>
              <label className="label" htmlFor="calculatedAt">
                Calculado en
              </label>
              <input
                id="calculatedAt"
                type="date"
                value={calculatedAt}
                onChange={(event) => setCalculatedAt(event.target.value)}
                className="input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="catalog">
                  Catálogo
                </label>
                <input
                  id="catalog"
                  value={catalog}
                  onChange={(event) => setCatalog(event.target.value)}
                  className="input"
                  placeholder="México"
                />
              </div>
              <div>
                <label className="label" htmlFor="standard">
                  Normas
                </label>
                <input
                  id="standard"
                  value={standard}
                  onChange={(event) => setStandard(event.target.value)}
                  className="input"
                  placeholder="NFRC"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="notes">
                Notas internas
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                className="textarea"
                placeholder="Solo visible en el sistema, no se imprime en el PDF."
              />
            </div>
          </div>
        </section>

        {/* Pegar HTML */}
        <section className="card card-pad">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="h-section">2 · Pegar o arrastrar datos de Calumen</h2>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">
                Pega el HTML, arrastra un PDF de Calumen o suelta el HTML del
                configurador. El analizador extrae los apartados y construye la
                composición del vidrio con sus materiales y espesores.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleAnalyze()}
              className="btn-primary shrink-0"
            >
              <IconSparkles width={16} height={16} />
              Analizar HTML
            </button>
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label="Arrastrar o seleccionar un PDF o HTML de Calumen"
            onClick={() => fileRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileRef.current?.click();
              }
            }}
            className="mb-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-4 py-5 text-center transition hover:border-brand-300 hover:bg-brand-50/40 focus:outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-500/20"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-600 shadow-xs ring-1 ring-slate-200">
              <IconUpload width={18} height={18} />
            </span>
            <p className="mt-2 text-xs font-semibold text-slate-800">
              Arrastra y suelta aquí un PDF o HTML de Calumen
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              o haz clic para seleccionar el archivo
            </p>
          </div>

          <textarea
            value={rawHtml}
            onChange={(event) => setRawHtml(event.target.value)}
            rows={7}
            spellCheck={false}
            className="textarea scrollbar-thin font-mono text-[11px] leading-relaxed"
            placeholder={`<div class="performance-info-wrapper"> … prestaciones … </div>\n<app-configurator> … composición del vidrio … </app-configurator>`}
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleAnalyze()}
              className="btn-secondary btn-sm"
              disabled={!rawHtml.trim()}
            >
              <IconSparkles width={14} height={14} />
              Reanalizar
            </button>
            <button
              type="button"
              onClick={clearPaste}
              className="btn-ghost btn-sm"
              disabled={!rawHtml && sections.length === 0}
            >
              Limpiar
            </button>
            <span className="ml-auto text-xs text-slate-500">
              {sections.length} apartados · {totalRows} valores
            </span>
          </div>

          {/* Importar PDF de Calumen */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
              <IconFilePdf width={14} height={14} className="text-brand-600" />
              <span className="text-xs font-semibold text-slate-800">
                Importar PDF de Calumen
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf,.html,.htm,.txt,text/html,text/plain"
              className="hidden"
              onChange={(event) => {
                const f = event.currentTarget.files?.[0];
                if (f) void handleDroppedFile(f);
                event.currentTarget.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={pdfImporting}
              className={cn(
                "btn-secondary btn-sm shrink-0",
                pdfImporting && "opacity-70",
              )}
            >
              <span className="flex items-center gap-1.5">
                {pdfImporting ? (
                  <>
                    <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                    Importando…
                  </>
                ) : (
                  <>
                    <IconFilePdf width={14} height={14} />
                    Subir archivo
                  </>
                )}
              </span>
            </button>
            <SpectrumButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void requestAiSuggestions(suggestionSource())}
              disabled={
                aiSuggesting ||
                pdfImporting ||
                (!lastPdfData && layers.length === 0 && sections.length === 0)
              }
              leftIcon={<IconSparkles width={14} height={14} />}
            >
              {aiSuggesting ? "Analizando…" : "Sugerir con IA"}
            </SpectrumButton>
            <span className="text-[10px] text-slate-500">
              PDF o HTML de Calumen
            </span>
          </div>

          <div ref={aiPanelRef}>
            {aiSuggesting || aiSuggestions.length > 0 || aiSuggestError ? (
              <div className="mt-4 rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
                      <IconSparkles width={16} height={16} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        Sugerencias de {providerName}
                      </p>
                      {aiSuggesting ? (
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Analizando la composición y los datos del PDF…
                        </p>
                      ) : aiSummary ? (
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                          {aiSummary}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <span className="badge badge-blue shrink-0">IA</span>
                </div>

                {aiSuggesting ? (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-brand-100 bg-white/80 px-3 py-2 text-xs text-slate-500">
                    <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                    Generando propuesta de nombre y campos…
                  </div>
                ) : null}

                {aiSuggestError ? (
                  <div className="mt-3 flex flex-wrap items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    <IconAlert width={14} height={14} className="mt-0.5 shrink-0" />
                    <span className="min-w-0 flex-1">{aiSuggestError}</span>
                    <button
                      type="button"
                      onClick={() => void requestAiSuggestions(suggestionSource())}
                      className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-red-700 shadow-xs hover:bg-red-100"
                    >
                      Reintentar
                    </button>
                  </div>
                ) : null}

                {aiSuggestions.length > 0 ? (
                  <ul className="mt-3 grid gap-2">
                    {aiSuggestions.map((suggestion) => {
                      const applied = appliedSuggestions.includes(suggestion.field);
                      const current = currentFieldValue(suggestion.field);
                      return (
                        <li
                          key={`${suggestion.field}-${suggestion.value}`}
                          className="rounded-lg border border-slate-200 bg-white p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                {SUGGESTION_LABELS[suggestion.field] ??
                                  suggestion.field}
                              </p>
                              <p className="mt-0.5 break-words text-sm font-semibold text-slate-900">
                                {suggestion.value}
                              </p>
                              {suggestion.reason ? (
                                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                                  {suggestion.reason}
                                </p>
                              ) : null}
                              {current && current !== suggestion.value ? (
                                <p className="mt-1 truncate text-[10px] text-slate-400">
                                  Actual: {current}
                                </p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                applyAiSuggestion(
                                  suggestion.field,
                                  suggestion.value,
                                )
                              }
                              disabled={applied}
                              className={cn(
                                "btn btn-sm shrink-0",
                                applied
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "btn-secondary",
                              )}
                            >
                              {applied ? (
                                <span className="flex items-center gap-1">
                                  <IconCheck width={13} height={13} />
                                  Aplicado
                                </span>
                              ) : (
                                "Aplicar"
                              )}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                {aiAlternatives.length > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Otras opciones:
                    </span>
                    {aiAlternatives.map((alternative) => (
                      <button
                        key={alternative}
                        type="button"
                        onClick={() =>
                          applyAiSuggestion("glassName", alternative)
                        }
                        className="chip bg-white transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                      >
                        {alternative}
                      </button>
                    ))}
                  </div>
                ) : null}

                {aiSuggestions.length > 0 || aiSuggestError ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {aiSuggestions.length > 0 ? (
                      <SpectrumButton
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={applyAllAiSuggestions}
                        disabled={aiSuggestions.every((suggestion) =>
                          appliedSuggestions.includes(suggestion.field),
                        )}
                      >
                        Aplicar todo
                      </SpectrumButton>
                    ) : null}
                    <SpectrumButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={dismissAiSuggestions}
                    >
                      Descartar
                    </SpectrumButton>
                    <span className="ml-auto text-[10px] text-slate-400">
                      Revisa las propuestas antes de guardar.
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {warnings.length > 0 ? (
            <div className="mt-4 space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
              {warnings.map((warning, index) => (
                <p
                  key={index}
                  className="flex items-start gap-1.5 text-xs text-amber-800"
                >
                  <IconAlert width={13} height={13} className="mt-0.5 shrink-0" />
                  {warning}
                </p>
              ))}
            </div>
          ) : null}

          {pinned.length > 0 ? (
            <div className="mt-4 rounded-xl bg-slate-50 px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Prestaciones fijadas detectadas
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {pinned.map((row) => (
                  <span key={row.id} className="chip bg-white">
                    <span className="text-slate-500">{row.label}:</span>
                    <span className="font-semibold text-slate-800">
                      {row.value ?? "—"}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {/* Composición */}
        <section ref={compositionRef} className="card card-pad scroll-mt-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="h-section">3 · Composición del vidrio</h2>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">
                Las selecciones del configurador se precargan aquí: tipo de
                capa, material, espesor, tratamiento térmico y laminado. Puedes
                ajustar cualquier capa o usar la edición avanzada.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={presetId}
                onChange={(event) => setPresetId(event.target.value)}
                className="select h-8 w-auto max-w-[250px] text-xs"
                title="Plantilla de composición"
              >
                <option value="">Plantilla Calumen…</option>
                {COMPOSITION_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyCompositionPreset}
                disabled={!presetId}
                className="btn-secondary btn-sm shrink-0"
              >
                Aplicar
              </button>
            </div>
          </div>

          {layers.length > 0 ? (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "badge",
                  compositionAnalysis.issues.some(
                    (issue) => issue.level === "error",
                  )
                    ? "badge-red"
                    : "badge-blue",
                )}
              >
                {compositionAnalysis.label}
              </span>
              <span className="chip bg-white">
                {compositionAnalysis.substrates} vidrio
                {compositionAnalysis.substrates === 1 ? "" : "s"}
              </span>
              <span className="chip bg-white">
                {compositionAnalysis.cavities} cámara
                {compositionAnalysis.cavities === 1 ? "" : "s"}
              </span>
              <span className="chip bg-white">
                {compositionAnalysis.interlayers} butiral
                {compositionAnalysis.interlayers === 1 ? "" : "es"}
              </span>
              <span className="chip bg-white">
                {compositionAnalysis.totalThickness}
              </span>
            </div>
          ) : null}

          <datalist id="layer-material-options">
            {MATERIAL_OPTIONS.map((material) => (
              <option key={material} value={material} />
            ))}
          </datalist>
          <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <div className="space-y-2">
              {layers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                  <p className="text-xs font-semibold text-slate-700">
                    Sin capas todavía
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Analiza el configurador o añade una capa manualmente.
                  </p>
                </div>
              ) : (
                layers.map((layer, index) => {
                  const kind = layerKindOf(layer);
                  const isSubstrate = kind === "substrate";
                  const isCoating = kind === "coating";
                  return (
                    <div
                      key={`${index}-${layer.material}-${kind}`}
                      className={cn(
                        "rounded-xl border p-3 shadow-xs",
                        isCoating
                          ? "border-red-200 border-l-4 border-l-red-500 bg-red-50/40"
                          : "border-slate-200 bg-white",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold",
                            isCoating
                              ? "bg-red-100 text-red-700"
                              : "bg-brand-100 text-brand-700",
                          )}
                        >
                          {index + 1}
                        </span>
                        <select
                          value={kind}
                          onChange={(event) =>
                            changeLayerKind(
                              index,
                              event.target.value as GlassLayerKind,
                            )
                          }
                          className="h-8 w-28 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                          title="Tipo de capa"
                        >
                          {LAYER_KIND_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input
                          value={layer.material}
                          onChange={(event) =>
                            updateLayerAt(index, {
                              material: event.target.value,
                            })
                          }
                          list="layer-material-options"
                          className="h-8 min-w-[130px] flex-1 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                          placeholder="Material"
                          aria-label={`Material de la capa ${index + 1}`}
                        />
                        <div className="ml-auto flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveLayerAt(index, -1)}
                            disabled={index === 0}
                            className="icon-btn h-7 w-7"
                            title="Subir capa"
                          >
                            <IconChevronUp width={13} height={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveLayerAt(index, 1)}
                            disabled={index === layers.length - 1}
                            className="icon-btn h-7 w-7"
                            title="Bajar capa"
                          >
                            <IconChevronDown width={13} height={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLayerAt(index)}
                            className="icon-btn h-7 w-7 text-slate-400 hover:border-red-200 hover:text-red-600"
                            title="Quitar capa"
                          >
                            <IconTrash width={13} height={13} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        {kind === "coating" || kind === "enamel" ? (
                          <div className="flex items-end pb-1">
                            <span className="chip bg-slate-50 text-slate-500">
                              Sin espesor
                            </span>
                          </div>
                        ) : (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Espesor
                            </p>
                            <ThicknessSelect
                              value={layer.thickness ?? ""}
                              onChange={(thickness) =>
                                updateLayerAt(index, {
                                  thickness: thickness || undefined,
                                })
                              }
                              className="mt-1"
                            />
                          </div>
                        )}
                        {isSubstrate ? (
                          <>
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Tratamiento térmico
                              <select
                                value={layer.treatment ?? ""}
                                onChange={(event) =>
                                  updateLayerAt(index, {
                                    treatment: event.target.value || undefined,
                                  })
                                }
                                className="select mt-1 h-8 px-2 py-1 text-xs"
                              >
                                {TREATMENT_OPTIONS.map((treatment) => (
                                  <option key={treatment} value={treatment}>
                                    {treatment || "Ninguno"}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="flex items-end gap-2 pb-1 text-[11px] font-medium text-slate-600">
                              <input
                                type="checkbox"
                                checked={Boolean(layer.laminated)}
                                onChange={(event) =>
                                  updateLayerAt(index, {
                                    laminated: event.target.checked,
                                  })
                                }
                                className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                              />
                              Laminar
                            </label>
                          </>
                        ) : (
                          <div className="flex items-end pb-1 sm:col-span-2">
                            <span
                              className={cn(
                                "chip",
                                isCoating
                                  ? "border border-red-200 bg-red-50 text-red-700"
                                  : "bg-slate-50 text-slate-500",
                              )}
                            >
                              {kind === "coating"
                                ? layer.position
                                  ? `Capa funcional #${layer.position}`
                                  : "Capa funcional"
                                : kind === "interlayer"
                                  ? "Butiral / laminado"
                                  : kind === "cavity" || kind === "air"
                                    ? "Cámara de aire"
                                    : kind === "enamel"
                                      ? "Serigrafía"
                                      : "Otra capa"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Añadir:
                </span>
                {ADD_LAYER_OPTIONS.map((option) => (
                  <button
                    key={option.kind}
                    type="button"
                    onClick={() => addLayer(option.kind)}
                    className="btn-secondary btn-sm"
                  >
                    <IconPlus width={12} height={12} />
                    {option.label}
                  </button>
                ))}
              </div>

              <details className="mt-2 rounded-xl border border-slate-200 bg-slate-50/60">
                <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-semibold text-slate-600">
                  Edición avanzada (texto)
                </summary>
                <div className="border-t border-slate-200 p-3">
                  <textarea
                    value={advancedText}
                    onChange={(event) => setAdvancedText(event.target.value)}
                    rows={4}
                    className="textarea font-mono text-[12px]"
                    placeholder={EXAMPLE_LAYERS}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={applyAdvancedText}
                      className="btn-secondary btn-sm"
                    >
                      Aplicar texto
                    </button>
                    <span className="text-[10px] text-slate-400">
                      Una capa por línea: MATERIAL(espesor) - Tratamiento
                    </span>
                  </div>
                </div>
              </details>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Vista de capas
                </p>
                <span className="chip bg-white">Espesor {thickness}</span>
              </div>
              {layers.length > 0 ? (
                <>
                  <div className="mt-3 flex items-center gap-1.5">
                    <img
                      src="/assets/icon-exterior.png"
                      alt="Exterior"
                      className="h-4 w-4 shrink-0 object-contain opacity-60"
                    />
                    <div className="flex h-12 flex-1 items-center justify-center gap-[2px] rounded-lg border border-slate-200 bg-white px-2">
                      {bars.map((bar, index) => {
                        const color = colorForLayer(layers[index]);
                        return (
                          <div
                            key={index}
                            className="h-9 rounded-[1px] border"
                            style={{
                              width: bar.width,
                              backgroundColor: color,
                              borderColor: color,
                            }}
                          />
                        );
                      })}
                    </div>
                    <img
                      src="/assets/icon-interior.png"
                      alt="Interior"
                      className="h-4 w-4 shrink-0 object-contain opacity-60"
                    />
                  </div>
                  <p className="mt-1.5 text-center text-[10px] text-slate-400">
                    Ancho proporcional al espesor de cada capa
                  </p>
                  <p className="mt-0.5 text-center text-[10px] text-slate-500">
                    {compositionAnalysis.summary}
                  </p>
                </>
              ) : null}
              {layers.length === 0 ? (
                <p className="mt-3 text-xs italic text-slate-400">
                  Aún no hay capas definidas.
                </p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {layers.map((layer, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-100 text-[10px] font-bold text-brand-700">
                        {index + 1}
                      </span>
                      <span className="min-w-0 text-xs leading-5 text-slate-700">
                        <span className="block font-medium">
                          {layerLabel(layer)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {layerKindLabel(layerKindOf(layer))}
                          {layer.position ? ` · #${layer.position}` : ""}
                          {layer.laminated ? " · Laminado" : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                Precargado desde las selecciones del configurador de Calumen.
              </p>
            </div>
          </div>

          {compositionAnalysis.issues.length > 0 ? (
            <div className="mt-4 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Diagnóstico de composición
              </p>
              {compositionAnalysis.issues.map((issue, index) => (
                <p
                  key={index}
                  className={cn(
                    "flex items-start gap-1.5 text-xs",
                    issue.level === "error"
                      ? "text-red-700"
                      : "text-amber-700",
                  )}
                >
                  <IconAlert
                    width={13}
                    height={13}
                    className="mt-0.5 shrink-0"
                  />
                  {issue.message}
                </p>
              ))}
            </div>
          ) : null}

        </section>

        {/* Prestaciones */}
        <section ref={sectionsRef} className="scroll-mt-6 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                4 · Prestaciones de la ficha
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Edita etiquetas y valores. Puedes ocultar apartados del PDF,
                reordenarlos o eliminarlos.
              </p>
            </div>
            <button
              type="button"
              onClick={addSection}
              className="btn-secondary btn-sm"
            >
              <IconPlus width={14} height={14} />
              Añadir apartado
            </button>
          </div>

          {sections.length === 0 ? (
            <div className="card flex flex-col items-center px-6 py-12 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <IconSparkles width={20} height={20} />
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-800">
                Sin prestaciones todavía
              </p>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                Pega el HTML de Calumen y pulsa «Analizar HTML», o añade un
                apartado manualmente.
              </p>
              <button
                type="button"
                onClick={addSection}
                className="btn-secondary btn-sm mt-4"
              >
                <IconPlus width={14} height={14} />
                Añadir apartado manual
              </button>
            </div>
          ) : (
            sections.map((section, sectionIndex) => (
              <article
                key={section.id}
                className={cn(
                  "card overflow-hidden transition",
                  section.hidden && "opacity-60",
                )}
              >
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
                  <img
                    src={`/assets/${section.icon}`}
                    alt=""
                    className="h-4 w-4 shrink-0 object-contain"
                  />
                  <select
                    value={section.icon}
                    onChange={(event) =>
                      updateSection(section.id, { icon: event.target.value })
                    }
                    className="h-7 w-28 cursor-pointer rounded-md border border-slate-200 bg-white px-1 text-[10px] text-slate-600 outline-none focus:border-brand-400"
                    title="Icono del apartado"
                  >
                    {ICON_OPTIONS.map((option) => (
                      <option key={option.key} value={option.file}>
                        {option.label}
                      </option>
                    ))}
                    {ICON_OPTIONS.every((o) => o.file !== section.icon) ? (
                      <option value={section.icon}>Personalizado</option>
                    ) : null}
                  </select>

                  <input
                    value={section.title}
                    onChange={(event) =>
                      updateSection(section.id, { title: event.target.value })
                    }
                    className="min-w-[140px] flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm font-semibold text-slate-900 outline-none hover:border-slate-200 focus:border-brand-400 focus:bg-white"
                    placeholder="Título del apartado"
                  />
                  <input
                    value={section.standard ?? ""}
                    onChange={(event) =>
                      updateSection(section.id, { standard: event.target.value })
                    }
                    className="w-36 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-right text-xs font-semibold text-slate-600 outline-none hover:border-slate-200 focus:border-brand-400 focus:bg-white"
                    placeholder="Norma"
                  />

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Mover arriba"
                      onClick={() => moveSection(section.id, -1)}
                      disabled={sectionIndex === 0}
                      className="icon-btn h-7 w-7"
                    >
                      <IconChevronUp width={14} height={14} />
                    </button>
                    <button
                      type="button"
                      title="Mover abajo"
                      onClick={() => moveSection(section.id, 1)}
                      disabled={sectionIndex === sections.length - 1}
                      className="icon-btn h-7 w-7"
                    >
                      <IconChevronDown width={14} height={14} />
                    </button>
                    <button
                      type="button"
                      title={
                        section.hidden
                          ? "Incluir en el PDF"
                          : "Ocultar del PDF"
                      }
                      onClick={() =>
                        updateSection(section.id, { hidden: !section.hidden })
                      }
                      className={cn(
                        "icon-btn h-7 w-7",
                        section.hidden && "text-amber-600",
                      )}
                    >
                      {section.hidden ? (
                        <IconEyeOff width={14} height={14} />
                      ) : (
                        <IconEye width={14} height={14} />
                      )}
                    </button>
                    <button
                      type="button"
                      title="Eliminar apartado"
                      onClick={() => removeSection(section.id)}
                      className="icon-btn h-7 w-7 hover:border-red-200 hover:text-red-600"
                    >
                      <IconTrash width={14} height={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 px-3.5 py-3">
                  {section.rows.map((row) => (
                    <div
                      key={row.id}
                      className="flex flex-col gap-1.5 sm:flex-row sm:items-center"
                    >
                      <input
                        value={row.label}
                        onChange={(event) =>
                          updateRow(section.id, row.id, {
                            label: event.target.value,
                          })
                        }
                        className={cn(
                          "min-w-0 flex-1 rounded-md border border-transparent px-2 py-1.5 text-[13px] outline-none hover:border-slate-200 focus:border-brand-400 focus:bg-white",
                          row.kind === "heading" && "font-semibold text-slate-900",
                          row.kind === "note" && "italic text-slate-500",
                          row.kind === "row" && "text-slate-700",
                        )}
                        placeholder="Etiqueta"
                      />
                      {row.kind === "row" ? (
                        <input
                          value={row.value ?? ""}
                          onChange={(event) =>
                            updateRow(section.id, row.id, {
                              value: event.target.value,
                            })
                          }
                          className="w-full rounded-md border border-transparent px-2 py-1.5 text-right text-[13px] font-semibold text-slate-900 outline-none hover:border-slate-200 focus:border-brand-400 focus:bg-white sm:w-44"
                          placeholder="Valor"
                        />
                      ) : null}
                      <select
                        value={row.kind}
                        onChange={(event) =>
                          updateRow(section.id, row.id, {
                            kind: event.target.value as PerfRow["kind"],
                          })
                        }
                        className="w-full cursor-pointer rounded-md border border-transparent bg-transparent px-1 py-1 text-[11px] text-slate-500 outline-none hover:border-slate-200 focus:border-brand-400 sm:w-28"
                        title="Tipo de fila"
                      >
                        <option value="row">Dato</option>
                        <option value="note">Nota</option>
                        <option value="heading">Encabezado</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeRow(section.id, row.id)}
                        className="icon-btn h-7 w-7 shrink-0 self-end sm:self-auto"
                        title="Eliminar fila"
                      >
                        <IconTrash width={13} height={13} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addRow(section.id)}
                    className="mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-brand-600 hover:bg-brand-100/60"
                  >
                    <IconPlus width={12} height={12} />
                    Añadir fila
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>

      {/* Panel lateral */}
      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <section className="card card-pad">
          <h2 className="h-section">Resumen</h2>
          <dl className="mt-3 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500">Referencia</dt>
              <dd className="max-w-[150px] truncate font-semibold text-slate-900">
                {reference || "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500">Proyecto</dt>
              <dd className="max-w-[150px] truncate text-slate-700">
                {selectedProject?.name ?? "Sin asignar"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500">Cliente</dt>
              <dd className="max-w-[150px] truncate text-slate-700">
                {selectedProject?.clientName ?? "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500">Apartados</dt>
              <dd className="font-semibold text-slate-900">
                {sections.filter((s) => !s.hidden).length}/{sections.length}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500">Valores</dt>
              <dd className="font-semibold text-slate-900">{totalRows}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500">Espesor</dt>
              <dd className="font-semibold text-slate-900">{thickness}</dd>
            </div>
          </dl>

          {["TL", "SHGC", "Ug", "Rw"].some((key) => keyValue(key)) ? (
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
              {[
                { label: "TL", needle: "luminosa" },
                { label: "SHGC", needle: "shgc" },
                { label: "Ug", needle: "ug " },
                { label: "Rw", needle: "rw" },
              ].map((item) => {
                const value = keyValue(item.needle);
                if (!value) return null;
                return (
                  <div key={item.label} className="rounded-lg bg-slate-50 px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-slate-800">
                      {value}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="card card-pad space-y-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full"
          >
            <IconSave width={16} height={16} />
            {saving ? "Guardando…" : specId ? "Guardar cambios" : "Guardar ficha"}
          </button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewLoading}
            className="btn-secondary w-full"
          >
            <IconEye width={16} height={16} />
            {previewLoading ? "Generando…" : "Vista previa PDF"}
          </button>
          {specId ? (
            <a
              href={`/api/specs/${specId}/pdf?download=1`}
              className="btn-ghost w-full"
            >
              <IconDownload width={16} height={16} />
              Descargar PDF guardado
            </a>
          ) : null}
          <p className="pt-1 text-center text-[11px] text-slate-400">
            El PDF se genera con los datos que ves en pantalla.
          </p>
        </section>

        <section className="card p-4">
          <div className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <IconSparkles width={16} height={16} />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-800">
                Asistente IA
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                Consulta fichas guardadas, analiza normas y pide sugerencias de
                composición o nombres.
              </p>
            </div>
          </div>
          <a
            href={specId ? `/asistente?specId=${specId}` : "/asistente"}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary btn-sm mt-3 w-full"
          >
            Abrir asistente
          </a>
          <p className="mt-2 text-[10px] text-slate-400">
            {specId
              ? "Se consulta la última versión guardada."
              : "Guarda la ficha para incluirla en el catálogo."}
          </p>
        </section>

        <section className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Buenas prácticas
          </p>
          <ul className="mt-2 space-y-2 text-[11px] leading-relaxed text-slate-500">
            <li>• Verifica el folio interno y el nombre comercial del vidrio.</li>
            <li>• Revisa el orden de las capas antes de emitir.</li>
            <li>• Marca la ficha como «Emitida» al entregarla al cliente.</li>
            <li>• Usa «Duplicar» para generar revisiones sin perder el historial.</li>
          </ul>
        </section>
      </aside>

      {dragActive ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border-2 border-dashed border-brand-300 bg-white p-8 text-center shadow-2xl">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-200">
              <IconUpload width={24} height={24} />
            </span>
            <p className="mt-4 text-lg font-semibold tracking-tight text-slate-900">
              {specId ? "Suelta para reemplazar los datos" : "Suelta para crear la ficha"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              PDF de Calumen o HTML del configurador
            </p>
            <p className="mt-3 text-[11px] text-slate-400">
              Los datos se cargarán en el editor y {providerName} propondrá el nombre y los campos.
            </p>
          </div>
        </div>
      ) : null}

      {previewUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-3 sm:p-6">
          <div className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Vista previa · {glassName.trim() || reference || "Ficha técnica"}
                </p>
                <p className="text-[11px] text-slate-500">
                  Los cambios aún no guardados se incluyen en esta vista.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  download={pdfFileName(glassName.trim() || reference)}
                  className="btn-secondary btn-sm"
                >
                  <IconDownload width={14} height={14} />
                  Descargar
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewUrl(null)}
                  className="icon-btn"
                  title="Cerrar"
                >
                  <IconX width={16} height={16} />
                </button>
              </div>
            </div>
            <iframe
              src={previewUrl}
              title="Vista previa del PDF"
              className="h-full w-full flex-1 bg-slate-100"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
