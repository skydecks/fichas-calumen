import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  apiError,
  asRecord,
  badRequest,
  notFound,
  optionalText,
  text,
} from "@/lib/http";
import { PROJECT_STATUSES } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        agent: true,
        specs: {
          include: { agent: true },
          orderBy: { updatedAt: "desc" },
        },
      },
    });
    if (!project) return notFound("Proyecto");
    return NextResponse.json({ data: project });
  } catch (error) {
    return apiError(error, "proyectos");
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const body = asRecord(await request.json().catch(() => ({})));
    const data: Prisma.ProjectUncheckedUpdateInput = {};

    if (body.name !== undefined) {
      const name = text(body.name, 300);
      if (!name) return badRequest("El nombre del proyecto es obligatorio.");
      data.name = name;
    }
    if (body.clientId !== undefined) {
      const clientId = text(body.clientId, 80);
      if (!clientId) return badRequest("El cliente es obligatorio.");
      data.clientId = clientId;
    }
    if (body.agentId !== undefined) {
      data.agentId = optionalText(body.agentId, 80);
    }
    if (body.code !== undefined) data.code = optionalText(body.code, 120);
    if (body.location !== undefined) {
      data.location = optionalText(body.location, 200);
    }
    if (body.status !== undefined) {
      const status = text(body.status, 40);
      if (!PROJECT_STATUSES.includes(status)) {
        return badRequest("El estado del proyecto no es válido.");
      }
      data.status = status;
    }
    if (body.notes !== undefined) data.notes = optionalText(body.notes, 4000);

    if (Object.keys(data).length === 0) {
      return badRequest("No se enviaron campos para actualizar.");
    }

    const project = await prisma.project.update({
      where: { id },
      data,
      include: { client: true, agent: true },
    });
    return NextResponse.json({ data: project });
  } catch (error) {
    return apiError(error, "proyectos");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    await prisma.project.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiError(error, "proyectos");
  }
}
