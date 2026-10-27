import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listKnowledgeDocuments } from "@/lib/ai-knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  if (!q || q.length < 2) {
    return NextResponse.json({
      knowledge: [],
      specs: [],
      products: [],
      clients: [],
    });
  }

  try {
    // 1. Conocimiento (.md)
    const allDocs = listKnowledgeDocuments();
    const knowledgeMatches = allDocs
      .filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.file.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          (d.subtitle && d.subtitle.toLowerCase().includes(q)),
      )
      .slice(0, 5)
      .map((d) => ({
        id: d.id,
        title: d.title,
        subtitle: `${d.category} · ${d.file}`,
        href: `/conocimiento/${encodeURIComponent(d.id)}`,
        type: "knowledge" as const,
      }));

    // 2. Fichas de especificación
    const specs = await prisma.specification.findMany({
      where: {
        OR: [
          { reference: { contains: q } },
          { glassName: { contains: q } },
          { project: { name: { contains: q } } },
          { project: { client: { name: { contains: q } } } },
        ],
      },
      include: { project: { include: { client: true } } },
      take: 5,
      orderBy: { updatedAt: "desc" },
    });

    const specMatches = specs.map((s) => ({
      id: s.id,
      title: s.reference,
      subtitle: `${s.project.name} · ${s.project.client.name} (${s.status})`,
      href: `/fichas/${s.id}`,
      type: "spec" as const,
    }));

    // 3. Productos de catálogo
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { code: { contains: q } },
          { category: { contains: q } },
        ],
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
    });

    const productMatches = products.map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: `${p.code || "Sin código"} · ${p.category || "Catálogo"}`,
      href: `/productos/${p.id}`,
      type: "product" as const,
    }));

    // 4. Clientes
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { company: { contains: q } },
        ],
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
    });

    const clientMatches = clients.map((c) => ({
      id: c.id,
      title: c.name,
      subtitle: c.company || "Contacto directo",
      href: `/clientes/${c.id}`,
      type: "client" as const,
    }));

    return NextResponse.json({
      knowledge: knowledgeMatches,
      specs: specMatches,
      products: productMatches,
      clients: clientMatches,
    });
  } catch (error: any) {
    console.error("Error en búsqueda global:", error);
    return NextResponse.json(
      { error: "Error en la búsqueda." },
      { status: 500 },
    );
  }
}
