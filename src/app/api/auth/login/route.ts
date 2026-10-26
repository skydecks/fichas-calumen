import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
} from "@/lib/auth-session";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<NextResponse> {
  const limited = enforceRateLimit(request, "auth-login", 5, 60_000);
  if (limited) return limited;

  const password = process.env.APP_PASSWORD ?? "";
  const secret = process.env.APP_SESSION_SECRET ?? "";
  if (!password || !secret) {
    return NextResponse.json(
      { error: "La autenticación no está configurada en el servidor." },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Solicitud de acceso inválida." },
      { status: 400 },
    );
  }

  const provided =
    typeof body.password === "string" ? body.password.slice(0, 500) : "";
  if (!provided || !safeEqual(provided, password)) {
    return NextResponse.json(
      { error: "Contraseña incorrecta." },
      { status: 401 },
    );
  }

  const token = await createSessionToken(secret);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const secure =
    new URL(request.url).protocol === "https:" || forwardedProto === "https";

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
