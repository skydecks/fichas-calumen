import { NextResponse } from "next/server";
import { getDocumentProxy } from "unpdf";
import { resolveAiConfig, AiConfigError } from "@/lib/ai-config";
import { ProductExtractionError, extractProductProfile } from "@/lib/ai-product";
import { enforceRateLimit } from "@/lib/rate-limit";
import { parseCalumenPdfText } from "@/lib/pdf-parser";
import type { ProductProfile } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const MAX_PDF_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

async function pdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const chunks: string[] = [];
  const pages = Math.min(pdf.numPages, 8);
  for (let index = 1; index <= pages; index += 1) {
    const page = await pdf.getPage(index);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) chunks.push(text);
    if (chunks.join(" ").length > 35000) break;
  }
  return chunks.join("\n\n").slice(0, 35000);
}

export async function POST(request: Request): Promise<NextResponse> {
  const limited = enforceRateLimit(request, "products-import", 10, 60_000);
  if (limited) return limited;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Selecciona una ficha técnica." },
        { status: 400 },
      );
    }

    const aiRaw = form.get("ai");
    let aiOverride: unknown = {};
    if (typeof aiRaw === "string" && aiRaw.trim()) {
      try {
        aiOverride = JSON.parse(aiRaw);
      } catch {
        return NextResponse.json(
          { error: "La configuración de IA no es válida." },
          { status: 400 },
        );
      }
    }

    let ai: ReturnType<typeof resolveAiConfig> | null = null;
    try {
      ai = resolveAiConfig(aiOverride);
    } catch {
      // Continuar; si es un PDF de Calumen se extraerá determinísticamente
    }

    const name = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
    const isImage = ["image/png", "image/jpeg", "image/webp"].includes(
      file.type,
    );

    let rawText = "";
    let imageDataUrl: string | undefined;
    let sourceType = "pdf";
    let calumenProfile: ProductProfile | null = null;

    if (isPdf) {
      if (file.size > MAX_PDF_BYTES) {
        return NextResponse.json(
          { error: "El PDF supera los 12 MB." },
          { status: 400 },
        );
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      rawText = await pdfText(bytes);
      if (rawText.length < 40) {
        return NextResponse.json(
          {
            error:
              "El PDF no contiene texto seleccionable. Sube una imagen de la ficha para usar visión de IA.",
          },
          { status: 400 },
        );
      }

      // Pre-extracción determinística si el PDF proviene de Calumen
      if (rawText.includes("Calumen") || rawText.includes("Tipo de acristalamiento")) {
        try {
          const pdfProxy = await getDocumentProxy(bytes);
          const page1 = await pdfProxy.getPage(1);
          const textContent = await page1.getTextContent();
          const items: { s: string; x: number; y: number; w: number }[] = [];
          for (const raw of textContent.items) {
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
          const calumenResult = parseCalumenPdfText(items, {});
          if (calumenResult.layers.length > 0) {
            const isInsulated = calumenResult.layers.some(
              (l) => l.kind === "air" || l.kind === "cavity",
            );
            const isLaminated = calumenResult.layers.some(
              (l) => l.kind === "interlayer" || l.laminated,
            );
            const hasCoating = calumenResult.layers.some((l) => l.kind === "coating");
            const category = isInsulated
              ? "Doble acristalamiento"
              : isLaminated
                ? "Seguridad"
                : hasCoating
                  ? "Control solar"
                  : "Vidrio flotado";

            const keyValues: Record<string, string> = {};
            for (const s of calumenResult.sections) {
              for (const r of s.rows) {
                if (r.kind === "row" && r.value) {
                  keyValues[r.label] = r.value;
                }
              }
            }

            calumenProfile = {
              name:
                calumenResult.glassName ||
                calumenResult.documentTitle ||
                file.name.replace(/\.pdf$/i, ""),
              code: calumenResult.documentTitle || "",
              category,
              manufacturer: "Saint-Gobain",
              description: `Acristalamiento ${calumenResult.glassName || calumenResult.documentTitle} analizado en Calumen.`,
              summary: `Composición: ${calumenResult.layers
                .map((l) => `${l.material}${l.thickness ? ` (${l.thickness})` : ""}`)
                .join(" + ")}`,
              layers: calumenResult.layers,
              sections: calumenResult.sections,
              keyValues,
              colors: {},
            };
          }
        } catch (err) {
          console.warn("Fallo en pre-extracción de Calumen:", err);
        }
      }
    } else if (isImage) {
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "La imagen supera los 8 MB." },
          { status: 400 },
        );
      }
      sourceType = "image";
      const buffer = Buffer.from(await file.arrayBuffer());
      imageDataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
    } else {
      return NextResponse.json(
        { error: "Sube un PDF, PNG, JPG o WebP." },
        { status: 400 },
      );
    }

    let profile: ProductProfile;
    if (ai) {
      try {
        profile = await extractProductProfile(
          { fileName: file.name, rawText, imageDataUrl },
          ai,
        );
        // Si la IA omitió las capas pero el parser nativo de Calumen detectó la composición insulada:
        if (
          calumenProfile &&
          calumenProfile.layers.length > profile.layers.length &&
          calumenProfile.layers.some((l) => l.kind === "air" || l.kind === "cavity")
        ) {
          profile.layers = calumenProfile.layers;
          if (!profile.name || profile.name === "Producto sin nombre") {
            profile.name = calumenProfile.name;
          }
        }
      } catch (error) {
        if (calumenProfile) {
          profile = calumenProfile;
        } else {
          throw error;
        }
      }
    } else if (calumenProfile) {
      profile = calumenProfile;
    } else {
      return NextResponse.json(
        { error: "No hay un proveedor de IA configurado para procesar esta ficha." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      profile,
      sourceName: file.name,
      sourceType,
      rawText: rawText || null,
    });
  } catch (error) {
    if (error instanceof ProductExtractionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Error importando ficha de producto", error);
    return NextResponse.json(
      { error: "No se pudo procesar la ficha del producto." },
      { status: 500 },
    );
  }
}
