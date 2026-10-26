import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  apiError,
  asRecord,
  badRequest,
  has,
  notFound,
  optionalBoolean,
  optionalText,
  text,
} from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const agent = await prisma.salesAgent.findUnique({
      where: { id },
      include: {
        projects: {
          include: { client: true, _count: { select: { specs: true } } },
          orderBy: { updatedAt: "desc" },
        },
        specs: {
          include: { project: { include: { client: true } } },
          orderBy: { updatedAt: "desc" },
          take: 20,
        },
      },
    });
    if (!agent) return notFound("Agente");
    return NextResponse.json({ data: agent });
  } catch (error) {
    return apiError(error, "agentes");
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const body = asRecord(await request.json().catch(() => ({})));
    const data: Prisma.SalesAgentUpdateInput = {};

    if (has(body, "name")) {
      const name = text(body.name, 200);
      if (!name) return badRequest("El nombre del agente es obligatorio.");
      data.name = name;
    }
    if (has(body, "email")) data.email = optionalText(body.email, 200);
    if (has(body, "phone")) data.phone = optionalText(body.phone, 60);
    if (has(body, "region")) data.region = optionalText(body.region, 200);
    if (has(body, "active")) {
      const active = optionalBoolean(body.active);
      if (active === undefined) {
        return badRequest("El campo active debe ser booleano.");
      }
      data.active = active;
    }

    if (Object.keys(data).length === 0) {
      return badRequest("No se enviaron campos para actualizar.");
    }

    const agent = await prisma.salesAgent.update({ where: { id }, data });
    return NextResponse.json({ data: agent });
  } catch (error) {
    return apiError(error, "agentes");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    await prisma.salesAgent.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiError(error, "agentes");
  }
}
