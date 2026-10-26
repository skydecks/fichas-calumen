import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeProductProfile, productToProfile } from "@/lib/products";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, "products-list", 120, 60_000);
  if (limited) return limited;

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const active = url.searchParams.get("active");

  try {
    const products = await prisma.product.findMany({
      where: {
        ...(active === "1" ? { active: true } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { code: { contains: q } },
                { category: { contains: q } },
                { manufacturer: { contains: q } },
                { description: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({
      data: products.map(productToProfile),
      total: products.length,
    });
  } catch (error) {
    console.error("Error listando productos", error);
    return NextResponse.json(
      { error: "No se pudo listar el catálogo de productos." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "products-create", 30, 60_000);
  if (limited) return limited;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const profile = normalizeProductProfile(body.profile ?? body);
    if (!profile) {
      return NextResponse.json(
        { error: "El producto necesita al menos un nombre." },
        { status: 400 },
      );
    }

    const product = await prisma.product.create({
      data: {
        name: profile.name,
        code: profile.code,
        category: profile.category || null,
        manufacturer: profile.manufacturer || null,
        description: profile.description || null,
        summary: profile.summary || null,
        layers: JSON.stringify(profile.layers),
        sections: JSON.stringify(profile.sections),
        keyValues: JSON.stringify(profile.keyValues),
        colors: JSON.stringify(profile.colors),
        sourceName: text(body.sourceName, 240) || null,
        sourceType: text(body.sourceType, 30) || null,
        rawText: text(body.rawText, 50000) || null,
      },
    });

    return NextResponse.json({ id: product.id }, { status: 201 });
  } catch (error) {
    console.error("Error creando producto", error);
    return NextResponse.json(
      { error: "No se pudo guardar el producto." },
      { status: 500 },
    );
  }
}
