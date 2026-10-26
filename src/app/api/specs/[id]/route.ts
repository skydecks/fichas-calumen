import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseSpecInput } from "@/lib/payload";
import { specToData, storagePayload } from "@/lib/specs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const spec = await prisma.specification.findUnique({
    where: { id },
    include: { project: { include: { client: true } }, agent: true },
  });
  if (!spec) {
    return NextResponse.json({ error: "No encontrada." }, { status: 404 });
  }
  return NextResponse.json({ spec: specToData(spec) });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = parseSpecInput(body ?? {});
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const current = await prisma.specification.findUnique({
      where: { id },
      select: { id: true, status: true, version: true },
    });
    if (!current) {
      return NextResponse.json({ error: "No encontrada." }, { status: 404 });
    }

    const input = parsed.value;
    const issuing = input.status === "EMITIDA" && current.status !== "EMITIDA";

    const updated = await prisma.specification.update({
      where: { id },
      data: {
        reference: input.reference,
        projectId: input.projectId,
        agentId: input.agentId,
        glassName: input.glassName,
        glassLayers: JSON.stringify(input.layers),
        rawHtml: input.rawHtml,
        data: storagePayload({
          sections: input.sections,
          pinned: input.pinned,
          glassName: input.glassName,
          branding: input.branding,
        }),
        catalog: input.catalog,
        standard: input.standard,
        calculatedBy: input.calculatedBy,
        calculatedAt: input.calculatedAt,
        status: input.status,
        notes: input.notes,
        ...(issuing ? { issuedAt: new Date() } : {}),
      },
      select: { id: true, reference: true, status: true },
    });

    return NextResponse.json({ spec: updated });
  } catch (error) {
    console.error("Error actualizando especificación", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la especificación." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    await prisma.specification.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "No encontrada." }, { status: 404 });
    }
    console.error("Error eliminando especificación", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la especificación." },
      { status: 500 },
    );
  }
}
