import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getDocumentProxy } from "unpdf";
import { parseCalumenPdfText } from "@/lib/pdf-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_PDF_BYTES = 12 * 1024 * 1024;

async function bufferFromFile(file: File): Promise<Uint8Array> {
  const ab = await file.arrayBuffer();
  return new Uint8Array(ab);
}

export async function POST(req: Request): Promise<NextResponse> {
  const limited = enforceRateLimit(
    req,
    "pdf-import",
    10,
    60000,
  );
  if (limited) return limited;

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Se espera multipart/form-data." },
        { status: 400 },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No se recibió el archivo PDF." },
        { status: 400 },
      );
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "El archivo debe ser un PDF." },
        { status: 400 },
      );
    }
    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: "El PDF supera los 12 MB." },
        { status: 400 },
      );
    }

    const bytes = await bufferFromFile(file);
    const pdf = await getDocumentProxy(bytes);
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();

    const items: { s: string; x: number; y: number; w: number }[] = [];
    for (const raw of content.items) {
      if ("str" in raw && typeof raw.str === "string" && raw.str.trim()) {
        const t = raw.transform;
        items.push({
          s: raw.str,
          x: Math.round(t[4] * 10) / 10,
          y: Math.round(t[5] * 10) / 10,
          w: Math.round(raw.width * 10) / 10,
        });
      }
    }

    const meta: {
      calculatedBy?: string;
      calculatedAt?: string;
      catalog?: string;
      standard?: string;
    } = {};

    const result = parseCalumenPdfText(items, meta);

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      sections: result.sections,
      layers: result.layers,
      glassName: result.glassName,
      warnings: result.warnings,
      documentTitle: result.documentTitle,
      rawText: result.rawText,
      meta: {
        calculatedBy: meta.calculatedBy,
        calculatedAt: meta.calculatedAt,
        catalog: meta.catalog,
        standard: meta.standard,
      },
    });
  } catch (error) {
    console.error("pdf-import error:", error);
    return NextResponse.json(
      {
        error: "No se pudo leer el PDF. Asegúrate de que es un informe de Calumen con texto seleccionable.",
      },
      { status: 500 },
    );
  }
}
