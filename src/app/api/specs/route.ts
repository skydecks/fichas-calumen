import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseSpecInput } from "@/lib/payload";
import { storagePayload } from "@/lib/specs";
import { SPEC_STATUSES } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const statusParam = url.searchParams.get("status") ?? "";
    const projectId = url.searchParams.get("projectId") ?? "";
    const agentId = url.searchParams.get("agentId") ?? "";
    const status = (SPEC_STATUSES as string[]).includes(statusParam)
      ? statusParam
      : undefined;

    const specs = await prisma.specification.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(projectId ? { projectId } : {}),
        ...(agentId ? { agentId } : {}),
        ...(q
          ? {
              OR: [
                { reference: { contains: q } },
                { project: { name: { contains: q } } },
                { project: { client: { name: { contains: q } } } },
              ],
            }
          : {}),
      },
      include: {
        project: { include: { client: true } },
        agent: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ data: specs });
  } catch (error) {
    console.error("Error listando especificaciones", error);
    return NextResponse.json(
      { error: "No se pudieron listar las especificaciones." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = parseSpecInput(body ?? {});
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const input = parsed.value;
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { id: true, agentId: true },
    });
    if (!project) {
      return NextResponse.json(
        { error: "El proyecto seleccionado no existe." },
        { status: 404 },
      );
    }

    const spec = await prisma.specification.create({
      data: {
        reference: input.reference,
        projectId: input.projectId,
        agentId: input.agentId ?? project.agentId ?? null,
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
      },
    });

    return NextResponse.json({ id: spec.id }, { status: 201 });
  } catch (error) {
    console.error("Error creando especificación", error);
    return NextResponse.json(
      { error: "No se pudo guardar la especificación." },
      { status: 500 },
    );
  }
}
