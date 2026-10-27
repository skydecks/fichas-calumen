import { NextResponse } from "next/server";
import { getKnowledgeDocMeta, getKnowledgeDocument } from "@/lib/ai-knowledge";
import { renderKnowledgePdf } from "@/lib/pdf/knowledge-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  const meta = getKnowledgeDocMeta(decodedId);
  if (!meta) {
    return NextResponse.json(
      { error: "El artículo de conocimiento no existe." },
      { status: 404 },
    );
  }

  try {
    const content = getKnowledgeDocument(meta.file);
    const pdfBuffer = await renderKnowledgePdf(meta, content);

    const url = new URL(request.url);
    const isDownload = url.searchParams.get("download") === "1";
    const disposition = isDownload ? "attachment" : "inline";

    return new Response(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${meta.id}.pdf"`,
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error: any) {
    console.error("Error generando PDF del artículo de conocimiento:", error);
    return NextResponse.json(
      { error: "No se pudo generar el PDF del artículo." },
      { status: 500 },
    );
  }
}
