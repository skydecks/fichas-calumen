import { NextResponse } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 80);
  return (
    request.headers.get("x-real-ip")?.trim().slice(0, 80) || "local"
  );
}

/**
 * Límite en memoria por proceso. Suficiente para una instancia interna;
 * en un despliegue horizontal debe sustituirse por Redis u otro almacén.
 */
export function enforceRateLimit(
  request: Request,
  name: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const now = Date.now();
  const key = `${name}:${getClientIp(request)}`;
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  if (buckets.size > 5000) {
    for (const [bucketKey, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  if (bucket.count <= limit) return null;

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  const response = NextResponse.json(
    {
      error: "Demasiadas solicitudes. Inténtalo de nuevo en unos segundos.",
    },
    { status: 429 },
  );
  response.headers.set("Retry-After", String(retryAfter));
  return response;
}
