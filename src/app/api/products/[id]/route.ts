import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeProductLayers, productToProfile } from "@/lib/products";
import { normalizeLayerColors } from "@/lib/types";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function optionalText(
  value: unknown,
  current: string | null,
  max: number,
): string | null {
  if (value === undefined) return current;
  return text(value, max) || null;
}

export async function GET(request: Request, { params }: Params) {
  const limited = enforceRateLimit(request, "products-get", 120, 60_000);
  if (limited) return limited;
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
  }
  return NextResponse.json({ product: productToProfile(product) });
}

export async function PATCH(request: Request, { params }: Params) {
  const limited = enforceRateLimit(request, "products-update", 60, 60_000);
  if (limited) return limited;
  const { id } = await params;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const current = await prisma.product.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json(
        { error: "Producto no encontrado." },
        { status: 404 },
      );
    }

    const name = text(body.name, 240) || current.name;
    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        code: optionalText(body.code, current.code, 120) ?? "",
        category: optionalText(body.category, current.category, 160),
        manufacturer: optionalText(body.manufacturer, current.manufacturer, 160),
        description: optionalText(body.description, current.description, 4000),
        summary: optionalText(body.summary, current.summary, 2000),
        ...(body.colors
          ? { colors: JSON.stringify(normalizeLayerColors(body.colors)) }
          : {}),
        ...(Array.isArray(body.layers)
          ? { layers: JSON.stringify(normalizeProductLayers(body.layers)) }
          : {}),
        active:
          typeof body.active === "boolean" ? body.active : current.active,
      },
    });

    return NextResponse.json({ product: productToProfile(product) });
  } catch (error) {
    console.error("Error actualizando producto", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el producto." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const limited = enforceRateLimit(request, "products-delete", 30, 60_000);
  if (limited) return limited;
  const { id } = await params;
  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo eliminar el producto." },
      { status: 404 },
    );
  }
}
