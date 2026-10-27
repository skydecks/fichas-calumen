"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";

export function KnowledgeUploadButton({
  className = "btn-secondary",
  variant = "secondary",
  buttonText = "Subir ficha (PDF)",
}: {
  className?: string;
  variant?: "primary" | "secondary";
  buttonText?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMessage("Procesando y estructurando PDF...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/knowledge/import-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || "No se pudo procesar el archivo PDF.");
        return;
      }

      // Guardar en sessionStorage para que la página de edición lo cargue al instante
      sessionStorage.setItem("calumen_imported_pdf", JSON.stringify(data));
      router.push("/conocimiento/nuevo?imported=1");
    } catch (err: any) {
      alert(`Error al procesar la ficha: ${err.message || ""}`);
    } finally {
      setIsProcessing(false);
      setStatusMessage("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className={`${className} inline-flex items-center gap-1.5`}
        title="Subir una ficha técnica o norma en PDF para convertirla en artículo .md"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
            <span className="text-xs">{statusMessage || "Procesando..."}</span>
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 shrink-0" />
            <span>{buttonText}</span>
          </>
        )}
      </button>
    </>
  );
}
