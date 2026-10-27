"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Loader2, CheckCircle2 } from "lucide-react";

export function KnowledgeDropzone({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      const next = prev - 1;
      if (next <= 0) {
        setIsDragging(false);
        return 0;
      }
      return next;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );

    if (files.length === 0) return;

    setIsProcessing(true);

    try {
      if (files.length === 1) {
        // Carga individual: importar y abrir en el editor
        setProgressText("Procesando ficha técnica con IA...");
        const formData = new FormData();
        formData.append("file", files[0]);

        const res = await fetch("/api/knowledge/import-pdf", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          alert(data.error || "No se pudo procesar el PDF.");
          return;
        }

        sessionStorage.setItem("calumen_imported_pdf", JSON.stringify(data));
        router.push("/conocimiento/nuevo?imported=1");
      } else {
        // Carga por lote: procesar cada archivo
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setProgressText(`Procesando (${i + 1}/${files.length}): ${file.name}...`);

          const formData = new FormData();
          formData.append("file", file);

          await fetch("/api/knowledge/import-pdf", {
            method: "POST",
            body: formData,
          });
        }
        setProgressText("¡Archivos procesados con éxito!");
        setTimeout(() => {
          router.refresh();
        }, 1000);
      }
    } catch (err: any) {
      alert(`Error en la carga: ${err.message || ""}`);
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative min-h-[60vh]"
    >
      {/* Superposición minimalista al arrastrar */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-xs transition">
          <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-white/80 bg-white/95 px-8 py-10 shadow-2xl text-center max-w-sm mx-4">
            <UploadCloud className="h-12 w-12 text-brand-600 animate-bounce mb-3" />
            <p className="text-base font-semibold text-slate-900">
              Suelta los archivos PDF aquí
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Se extraerán y estructurarán como artículos Markdown (.md).
            </p>
          </div>
        </div>
      )}

      {/* Indicador flotante sutil de procesamiento en segundo plano */}
      {isProcessing && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-xl border border-brand-200 bg-white px-4 py-3 shadow-lg text-xs font-medium text-slate-800 animate-in slide-in-from-bottom">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          <span>{progressText}</span>
        </div>
      )}

      {children}
    </div>
  );
}
