import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  apiError,
  asRecord,
  badRequest,
  optionalText,
  text,
} from "@/lib/http";
import { PROJECT_STATUSES } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const statusParam = url.searchParams.get("status") ?? "";
    const clientId = url.searchParams.get("clientId") ?? "";
    const agentId = url.searchParams.get("agentId") ?? "";
    const status = PROJECT_STATUSES.includes(statusParam)
      ? statusParam
      : undefined;

    const projects = await prisma.project.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(clientId ? { clientId } : {}),
        ...(agentId ? { agentId } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { code: { contains: q } },
                { location: { contains: q } },
                { client: { name: { contains: q } } },
              ],
            }
          : {}),
      },
      include: {
        client: true,
        agent: true,
        _count: { select: { specs: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ data: projects });
  } catch (error) {
    return apiError(error, "proyectos");
  }
}

export async function POST(request: Request) {
  try {
    const body = asRecord(await request.json().catch(() => ({})));
    const name = text(body.name, 300);
    const clientId = text(body.clientId, 80);
    if (!name) return badRequest("El nombre del proyecto es obligatorio.");
    if (!clientId) return badRequest("El cliente del proyecto es obligatorio.");

    const statusParam = text(body.status, 40);
    if (statusParam && !PROJECT_STATUSES.includes(statusParam)) {
      return badRequest("El estado del proyecto no es válido.");
    }

    const project = await prisma.project.create({
      data: {
        name,
        clientId,
        agentId: optionalText(body.agentId, 80),
        code: optionalText(body.code, 120),
        location: optionalText(body.location, 200),
        status: statusParam || "PROSPECTO",
        notes: optionalText(body.notes, 4000),
      },
      include: { client: true, agent: true },
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    return apiError(error, "proyectos");
  }
}
