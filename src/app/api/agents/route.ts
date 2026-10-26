import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  apiError,
  asRecord,
  badRequest,
  optionalBoolean,
  optionalText,
  text,
} from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const agents = await prisma.salesAgent.findMany({
      include: { _count: { select: { projects: true, specs: true } } },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });
    return NextResponse.json({ data: agents });
  } catch (error) {
    return apiError(error, "agentes");
  }
}

export async function POST(request: Request) {
  try {
    const body = asRecord(await request.json().catch(() => ({})));
    const name = text(body.name, 200);
    if (!name) return badRequest("El nombre del agente es obligatorio.");

    const agent = await prisma.salesAgent.create({
      data: {
        name,
        email: optionalText(body.email, 200),
        phone: optionalText(body.phone, 60),
        region: optionalText(body.region, 200),
        active: optionalBoolean(body.active) ?? true,
      },
    });

    return NextResponse.json({ data: agent }, { status: 201 });
  } catch (error) {
    return apiError(error, "agentes");
  }
}
