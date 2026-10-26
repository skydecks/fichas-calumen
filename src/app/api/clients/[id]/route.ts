import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  apiError,
  asRecord,
  badRequest,
  has,
  notFound,
  optionalText,
  text,
} from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          include: {
            agent: true,
            _count: { select: { specs: true } },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });
    if (!client) return notFound("Cliente");
    return NextResponse.json({ data: client });
  } catch (error) {
    return apiError(error, "clientes");
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const body = asRecord(await request.json().catch(() => ({})));
    const data: Prisma.ClientUpdateInput = {};

    if (has(body, "name")) {
      const name = text(body.name, 200);
      if (!name) return badRequest("El nombre del cliente es obligatorio.");
      data.name = name;
    }
    if (has(body, "company")) data.company = optionalText(body.company, 200);
    if (has(body, "email")) data.email = optionalText(body.email, 200);
    if (has(body, "phone")) data.phone = optionalText(body.phone, 60);
    if (has(body, "address")) data.address = optionalText(body.address, 500);
    if (has(body, "notes")) data.notes = optionalText(body.notes, 4000);

    if (Object.keys(data).length === 0) {
      return badRequest("No se enviaron campos para actualizar.");
    }

    const client = await prisma.client.update({ where: { id }, data });
    return NextResponse.json({ data: client });
  } catch (error) {
    return apiError(error, "clientes");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    await prisma.client.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiError(error, "clientes");
  }
}
