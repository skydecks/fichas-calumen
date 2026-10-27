"use client";

import { useEffect, useState } from "react";
import {
  List,
  Maximize2,
  Minimize2,
  Type,
  X,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { AiMarkdown } from "@/lib/ai-markdown";
import { SpectrumCard } from "@/components/spectrum/card";

export type TocItem = {
  id: string;
  title: string;
  level: number;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractToc(markdown: string): TocItem[] {
  const lines = markdown.split("\n");
  const items: TocItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      const title = trimmed.replace(/^##\s+/, "").trim();
      items.push({ id: slugify(title), title, level: 2 });
    } else if (trimmed.startsWith("### ")) {
      const title = trimmed.replace(/^###\s+/, "").trim();
      items.push({ id: slugify(title), title, level: 3 });
    }
  }

  return items;
}

export function KnowledgeArticleViewer({
  content,
  title,
  subtitle,
}: {
  content: string;
  title: string;
  subtitle?: string;
}) {
  const [isZenMode, setIsZenMode] = useState(false);
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("normal");
  const [showToc, setShowToc] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState("");

  const toc = extractToc(content);

  // Escucha tecla Escape para salir de Modo Zen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isZenMode) {
        setIsZenMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZenMode]);

  const scrollToHeading = (headingTitle: string) => {
    // Buscar elemento en el DOM con el texto
    const elements = document.querySelectorAll("h2, h3");
    for (const el of Array.from(elements)) {
      if (el.textContent?.trim().toLowerCase() === headingTitle.toLowerCase()) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveHeadingId(slugify(headingTitle));
        setShowToc(false);
        break;
      }
    }
  };

  const textSizeClass =
    fontSize === "xlarge"
      ? "text-base sm:text-lg leading-relaxed"
      : fontSize === "large"
        ? "text-sm sm:text-base leading-relaxed"
        : "text-[13px] sm:text-sm leading-relaxed";

  return (
    <>
      {/* Barra de Controles Minimalistas de Lectura */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          {toc.length > 0 && (
            <button
              type="button"
              onClick={() => setShowToc(!showToc)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium inline-flex items-center gap-1.5 transition ${
                showToc
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              title="Mostrar u ocultar índice de secciones"
            >
              <List className="h-3.5 w-3.5" />
              <span>Índice ({toc.length})</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-xs text-slate-600">
            <button
              type="button"
              onClick={() => setFontSize("normal")}
              className={`px-2 py-0.5 rounded ${fontSize === "normal" ? "bg-slate-100 font-bold text-slate-900" : ""}`}
              title="Tamaño normal"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontSize("large")}
              className={`px-2 py-0.5 rounded text-sm ${fontSize === "large" ? "bg-slate-100 font-bold text-slate-900" : ""}`}
              title="Tamaño grande"
            >
              A+
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsZenMode(true)}
          className="btn-ghost text-xs px-2.5 py-1 text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 border border-slate-200 rounded-lg"
          title="Activar lectura limpia sin distracciones"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span>Modo Zen</span>
        </button>
      </div>

      {/* Contenedor Principal con Índice Opcional */}
      <div className="grid gap-6 lg:grid-cols-[1fr_260px] items-start">
        {/* Cuerpo del Artículo */}
        <SpectrumCard padding="md">
          <div className={`prose prose-slate max-w-none text-slate-800 ${textSizeClass}`}>
            <AiMarkdown content={content} />
          </div>
        </SpectrumCard>

        {/* Panel Lateral de Índice (Desktop o desplegado) */}
        {toc.length > 0 && (
          <div
            className={`${
              showToc ? "block" : "hidden lg:block"
            } sticky top-20 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs`}
          >
            <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-brand-600" />
                Índice del documento
              </span>
              <button
                type="button"
                onClick={() => setShowToc(false)}
                className="lg:hidden text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
              {toc.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToHeading(item.title)}
                  className={`w-full text-left rounded px-2 py-1 transition truncate flex items-center gap-1 ${
                    item.level === 3 ? "pl-5 text-slate-500 text-[11px]" : "font-medium text-slate-700"
                  } hover:bg-slate-200 hover:text-slate-900`}
                  title={item.title}
                >
                  <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
                  <span className="truncate">{item.title}</span>
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* MODO ZEN (Pantalla Completa Ultra-Minimalista) */}
      {isZenMode && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto px-4 py-8 sm:px-12 sm:py-16">
          {/* Barra Flotante Zen */}
          <div className="mx-auto max-w-3xl mb-8 flex items-center justify-between border-b border-slate-100 pb-4 text-xs text-slate-500">
            <div>
              <p className="font-semibold text-slate-900 text-sm truncate max-w-sm sm:max-w-md">
                {title}
              </p>
              {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5">
                <button
                  type="button"
                  onClick={() => setFontSize("normal")}
                  className={`px-2 py-0.5 rounded ${fontSize === "normal" ? "bg-slate-100 font-bold text-slate-900" : ""}`}
                >
                  A
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize("large")}
                  className={`px-2 py-0.5 rounded text-sm ${fontSize === "large" ? "bg-slate-100 font-bold text-slate-900" : ""}`}
                >
                  A+
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsZenMode(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition flex items-center gap-1"
                title="Salir del Modo Zen (Esc)"
              >
                <Minimize2 className="h-4 w-4" />
                <span className="hidden sm:inline">Salir (Esc)</span>
              </button>
            </div>
          </div>

          {/* Lectura Enfocada */}
          <main className={`mx-auto max-w-3xl prose prose-slate text-slate-800 ${textSizeClass}`}>
            <AiMarkdown content={content} />
          </main>
        </div>
      )}
    </>
  );
}
