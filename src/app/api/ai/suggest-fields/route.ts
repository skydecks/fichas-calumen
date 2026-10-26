import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  generateFieldSuggestions,
  SuggestError,
  type SuggestInput,
} from "@/lib/ai-suggest";
import { AiConfigError, resolveAiConfig } from "@/lib/ai-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_INPUT_CHARS = 70000;

export async function POST(request: Request): Promise<NextResponse> {
  const limited = enforceRateLimit(
    request,
    "ai-suggest",
    15,
    60000,
  );
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
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "La configuración de IA no es válida." },
      { status: 400 },
    );
  }

  const data = body?.data;
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return NextResponse.json(
      { error: "Faltan los datos extraídos del PDF." },
      { status: 400 },
    );
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(data);
  } catch {
    return NextResponse.json(
      { error: "Los datos enviados no se pueden procesar." },
      { status: 400 },
    );
  }

  if (serialized.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: "Los datos del PDF son demasiado grandes para analizarlos." },
      { status: 413 },
    );
  }

  try {
    const result = await generateFieldSuggestions(data as SuggestInput, ai);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const status = error instanceof SuggestError ? error.status : 502;
    const message =
      error instanceof SuggestError
        ? error.message
        : `No se pudieron generar las sugerencias con ${ai.providerName}.`;
    console.error("ai/suggest-fields error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
