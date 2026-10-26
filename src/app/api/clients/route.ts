import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  apiError,
  asRecord,
  badRequest,
  optionalText,
  text,
} from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      include: { _count: { select: { projects: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: clients });
  } catch (error) {
    return apiError(error, "clientes");
  }
}

export async function POST(request: Request) {
  try {
    const body = asRecord(await request.json().catch(() => ({})));
    const name = text(body.name, 200);
    if (!name) return badRequest("El nombre del cliente es obligatorio.");

    const client = await prisma.client.create({
      data: {
        name,
        company: optionalText(body.company, 200),
        email: optionalText(body.email, 200),
        phone: optionalText(body.phone, 60),
        address: optionalText(body.address, 500),
        notes: optionalText(body.notes, 4000),
      },
    });

    return NextResponse.json({ data: client }, { status: 201 });
  } catch (error) {
    return apiError(error, "clientes");
  }
}
