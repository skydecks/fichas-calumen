import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { AiConfigError, resolveAiConfig } from "@/lib/ai-config";
import { AiEndpointError, assertSafeAiEndpoint } from "@/lib/ai-endpoint-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function upstreamMessage(payload: unknown, fallback: string): string {
  if (typeof payload !== "object" || payload === null) return fallback;
  const body = payload as Record<string, unknown>;
  const error = body.error;
  if (typeof error === "string" && error.trim()) {
    return error.trim().slice(0, 500);
  }
  if (typeof error === "object" && error !== null) {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === "string" && message.trim()) {
      return message.trim().slice(0, 500);
    }
  }
  if (typeof body.detail === "string" && body.detail.trim()) {
    return body.detail.trim().slice(0, 500);
  }
  return fallback;
}

export async function POST(request: Request): Promise<NextResponse> {
  const limited = enforceRateLimit(
    request,
    "ai-test",
    10,
    60000,
  );
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "La solicitud de prueba no es válida." },
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

  try {
    await assertSafeAiEndpoint(ai.baseUrl);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AiEndpointError
            ? error.message
            : "El endpoint de IA no es seguro.",
      },
      { status: 400 },
    );
  }

  const startedAt = Date.now();

  try {
    const response = await fetch(`${ai.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ai.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: ai.model,
        messages: [
          {
            role: "user",
            content: "Responde únicamente con la palabra OK.",
          },
        ],
        temperature: 0,
        max_tokens: 8,
        stream: false,
      }),
      signal: AbortSignal.timeout(45000),
      cache: "no-store",
    });

    if (!response.ok) {
      const raw = await response.text().catch(() => "");
      let payload: unknown = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        payload = null;
      }
      const message = upstreamMessage(
        payload,
        `${ai.providerName} respondió con el código ${response.status}.`,
      );
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const payload = (await response.json().catch(() => null)) as
      | {
          choices?: Array<{
            message?: { content?: string };
          }>;
        }
      | null;
    const sample =
      payload?.choices?.[0]?.message?.content?.trim().slice(0, 80) ?? "";

    return NextResponse.json({
      ok: true,
      providerName: ai.providerName,
      model: ai.model,
      latencyMs: Date.now() - startedAt,
      sample,
    });
  } catch (error) {
    console.error("Error probando la configuración de IA", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.name === "TimeoutError"
            ? `${ai.providerName} no respondió a tiempo. Revisa el endpoint.`
            : `No se pudo conectar con ${ai.providerName}. Revisa el endpoint y la clave.`,
      },
      { status: 502 },
    );
  }
}
