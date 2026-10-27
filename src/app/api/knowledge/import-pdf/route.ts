import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { extractText } from "unpdf";
import { resolveAiConfig } from "@/lib/ai-config";
import { sanitizeFileName } from "@/lib/ai-knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_PDF_BYTES = 16 * 1024 * 1024;

export async function POST(req: Request): Promise<NextResponse> {
  const limited = enforceRateLimit(req, "knowledge-import-pdf", 10, 60000);
  if (limited) return limited;

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Se espera multipart/form-data con el archivo PDF." },
        { status: 400 },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    const aiConfigRaw = form.get("ai");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo PDF." },
        { status: 400 },
      );
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "El archivo cargado debe ser un documento PDF." },
        { status: 400 },
      );
    }

    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: "El PDF supera el límite de 16 MB." },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const extraction = await extractText(bytes);
    const rawText = Array.isArray(extraction.text)
      ? extraction.text.join("\n\n")
      : extraction.text || "";

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "No se pudo extraer texto legible del PDF. Es posible que sea un PDF escaneado sólo con imágenes." },
        { status: 400 },
      );
    }

    const baseName = file.name.replace(/\.pdf$/i, "").trim();

    // Intentar estructuración con IA si hay configuración disponible
    let aiConfig = null;
    if (typeof aiConfigRaw === "string" && aiConfigRaw.trim()) {
      try {
        aiConfig = resolveAiConfig(JSON.parse(aiConfigRaw));
      } catch {
        // continuar con heurística
      }
    } else {
      try {
        aiConfig = resolveAiConfig(undefined);
      } catch {
        // continuar con heurística
      }
    }

    if (aiConfig && aiConfig.apiKey) {
      try {
        const prompt = `Analiza el siguiente texto extraído de un documento técnico o norma en PDF ("${file.name}") y transfórmalo en un artículo estructurado para la base de conocimiento:

TEXTO DEL PDF (primeros 25,000 caracteres):
${rawText.slice(0, 25000)}

Responde ÚNICAMENTE con un JSON con este formato exacto:
{
  "title": "Título oficial o técnico del documento",
  "subtitle": "Subtítulo, alcance o resumen breve",
  "category": "Norma Oficial" o "Guía de Producto" o "Criterio de Instalación" o "Procedimiento Interno",
  "families": ["Vidrio Templado", "Vidrio Laminado", etc.],
  "standards": ["NOM-146-SCFI-2016", "EN 410", etc.],
  "content": "Cuerpo completo en Markdown GFM con ## Encabezados, tablas | GFM |, listas y citas, sin incluir frontmatter."
}`;

        const aiResponse = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${aiConfig.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: aiConfig.model,
            messages: [
              {
                role: "system",
                content:
                  "Eres un especialista en extracción técnica y estructuración en Markdown GFM de documentos de vidrio arquitectónico y normas.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
            max_tokens: 4000,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const contentStr = aiData.choices?.[0]?.message?.content || "";
          const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return NextResponse.json({
              success: true,
              title: parsed.title || baseName,
              subtitle: parsed.subtitle || "",
              category: parsed.category || "Guía de Producto",
              families: Array.isArray(parsed.families) ? parsed.families : [],
              standards: Array.isArray(parsed.standards) ? parsed.standards : [],
              content: parsed.content || rawText.slice(0, 10000),
              suggestedFileName: sanitizeFileName(parsed.title || baseName),
            });
          }
        }
      } catch (aiErr) {
        console.warn("Fallo estructuración IA de PDF, usando heurística", aiErr);
      }
    }

    // Heurística de respaldo (sin IA o si la IA no está disponible)
    const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
    const title = lines[0]?.slice(0, 100) || baseName;
    const subtitle = lines[1]?.slice(0, 150) || `Importado desde ${file.name}`;
    const category = /nom|norma|iso|en\s*\d/i.test(title) ? "Norma Oficial" : "Guía de Producto";

    const formattedContent = [
      `## Resumen del documento`,
      `Documento importado automáticamente a partir del archivo original **${file.name}** (${(file.size / 1024).toFixed(1)} KB).`,
      "",
      `## Contenido técnico`,
      ...lines.slice(2, 200).map((line) => {
        if (/^[0-9]+(\.[0-9]+)*\s+[A-ZÁÉÍÓÚ]/i.test(line)) {
          return `\n### ${line}\n`;
        }
        return line;
      }),
    ].join("\n\n");

    return NextResponse.json({
      success: true,
      title,
      subtitle,
      category,
      families: ["Vidrio Templado"],
      standards: [],
      content: formattedContent,
      suggestedFileName: sanitizeFileName(title),
    });
  } catch (error: any) {
    console.error("Error importando PDF a conocimiento:", error);
    return NextResponse.json(
      { error: `Error procesando el PDF: ${error.message || ""}` },
      { status: 500 },
    );
  }
}
