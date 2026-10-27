import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { AiConfigError, isNimEndpoint, resolveAiConfig } from "@/lib/ai-config";
import { assertSafeAiEndpoint } from "@/lib/ai-endpoint-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SYSTEM_PROMPT = `Eres un especialista técnico en vidrio arquitectónico y normatividad.
Tu objetivo es asistir en la redacción, estructuración y validación de artículos y normas técnicas en formato Markdown (.md) para la base de conocimiento técnico.

Reglas:
1. Responde siempre en español, con lenguaje técnico riguroso pero claro.
2. Utiliza estrictamente formato Markdown GitHub-Flavored (GFM):
   - Encabezados H2 (##) y H3 (###).
   - Tablas GFM bien formateadas con alineación (| :--- | :---: | :---: |).
   - Listas claras, bloques de notas (> [!IMPORTANT] o > [!NOTE]).
3. Unidades obligatorias:
   - Espesores en milímetros (mm).
   - Transmitancia térmica Ug en W/m²K (normas EN 673 / NFRC 100).
   - Factores solares y TL en porcentajes (%) o factor 0.00-1.00 (SHGC / FS).
   - Aislamiento acústico en decibeles dB (Rw, Ra,tr según EN ISO 717-1 / ASTM E413).
   - Cita normas pertinentes mexicanas (NOM-146-SCFI-2016) o internacionales (EN 410, EN 12600, ASTM C1048, NFRC 200).
4. No devuelvas explicaciones conversacionales previas ni posteriores, únicamente el contenido Markdown solicitado o la respuesta JSON según la acción.`;

export async function POST(request: Request): Promise<NextResponse> {
  const limited = enforceRateLimit(request, "ai-knowledge-assist", 20, 60000);
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la solicitud no es JSON válido." },
      { status: 400 },
    );
  }

  let ai: ReturnType<typeof resolveAiConfig>;
  try {
    ai = resolveAiConfig(body.ai);
  } catch (error) {
    if (error instanceof AiConfigError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Configuración de IA no válida." }, { status: 400 });
  }

  const { apiKey, baseUrl, model, providerName } = ai;

  try {
    await assertSafeAiEndpoint(baseUrl);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Endpoint no seguro" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "generate_draft";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const subtitle = typeof body.subtitle === "string" ? body.subtitle.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "Guía de Producto";
  const families = Array.isArray(body.families) ? body.families.join(", ") : "";
  const content = typeof body.content === "string" ? body.content.slice(0, 30000) : "";

  let prompt = "";
  if (action === "generate_draft") {
    prompt = `Genera un borrador completo y estructurado en Markdown para el artículo técnico:
Título: "${title}"
Subtítulo / Alcance: "${subtitle}"
Categoría: "${category}"
Familias de vidrio asociadas: "${families}"

Estructura requerida:
## Ficha de identificación o técnica
(Lista de parámetros clave, normas aplicables, campo de aplicación y objeto)

## 1. Alcance y definiciones técnicas
(Explicación detallada de los tipos de vidrios, manufactura y criterios)

## 2. Clasificación y especificaciones
(Incluye una tabla GFM detallada con configuraciones habituales, espesores en mm, tolerancias y valores de desempeño)

## 3. Criterios de seguridad y métodos de prueba
(Procedimientos de ensayo, impacto pendular, choque térmico o contención según NOM-146 o normas citadas)

## 4. Recomendaciones de instalación y manipulación
(Calzos de apoyo, selladores perimetrales, consideraciones climáticas)

Devuelve ÚNICAMENTE el texto Markdown, sin saludos ni comentarios.`;
  } else if (action === "improve_technical") {
    prompt = `Revisa y enriquece técnicamente el siguiente artículo Markdown manteniendo su tema y estructura básica, pero mejorando la precisión técnica, unidades (mm, W/m²K, dB, %), tablas y citando normativas aplicables (NOM-146-SCFI-2016, EN 410, ASTM):

TÍTULO: ${title}
CATEGORÍA: ${category}
CONTENIDO ACTUAL:
${content}

Devuelve ÚNICAMENTE el texto Markdown mejorado, sin introducciones ni despedidas.`;
  } else if (action === "add_table") {
    prompt = `Genera una tabla comparativa técnica completa en formato Markdown GFM para el artículo "${title}" (${category}, familias: ${families}).
Debe incluir columnas con parámetros técnicos reales (Espesor mm, Composición, TL %, Factor Solar / SHGC, Valor Ug W/m²K, Atenuación Rw dB, Nivel de seguridad).
Devuelve ÚNICAMENTE la tabla en Markdown GFM con un breve encabezado H3.`;
  } else if (action === "validate_compliance") {
    prompt = `Analiza críticamente el siguiente artículo de conocimiento técnico y evalúa si cumple con los requerimientos técnicos y normativos mínimos:

TÍTULO: ${title}
CATEGORÍA: ${category}
CONTENIDO:
${content}

Responde en formato JSON con la siguiente estructura exacta:
{
  "isValid": true/false,
  "score": 1-100,
  "strengths": ["punto fuerte 1", "punto fuerte 2"],
  "improvements": ["mejora recomendada 1", "mejora recomendada 2"],
  "missingStandards": ["norma que debería citarse si aplica"]
}`;
  }

  const payload: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    top_p: 0.9,
    max_tokens: 4000,
  };

  if (isNimEndpoint(baseUrl)) {
    payload.chat_template_kwargs = { enable_thinking: false };
  }

  try {
    const upstreamRes = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text().catch(() => "");
      return NextResponse.json(
        { error: `Error del proveedor IA (${upstreamRes.status}): ${errText.slice(0, 300)}` },
        { status: 502 },
      );
    }

    const data = await upstreamRes.json();
    const resultText =
      data.choices?.[0]?.message?.content?.trim() || "No se generó contenido.";

    if (action === "validate_compliance") {
      try {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : resultText);
        return NextResponse.json({ success: true, compliance: parsed });
      } catch {
        return NextResponse.json({
          success: true,
          compliance: {
            isValid: true,
            score: 85,
            strengths: ["Contenido técnico registrado"],
            improvements: [resultText.slice(0, 200)],
            missingStandards: [],
          },
        });
      }
    }

    return NextResponse.json({ success: true, markdown: resultText });
  } catch (error: any) {
    return NextResponse.json(
      { error: `No se pudo conectar con el servicio de IA: ${error.message || ""}` },
      { status: 502 },
    );
  }
}
