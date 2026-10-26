import { prisma } from "@/lib/db";
import { renderSpecPdf } from "@/lib/pdf/spec-document";
import { specToData } from "@/lib/specs";
import { pdfFileName } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const spec = await prisma.specification.findUnique({
    where: { id },
    include: { project: { include: { client: true } }, agent: true },
  });

  if (!spec) {
    return new Response("Especificación no encontrada", { status: 404 });
  }

  const data = specToData(spec);
  const buffer = await renderSpecPdf(data);
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";
  const disposition = download ? "attachment" : "inline";

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${pdfFileName(data.glassName || data.reference)}"`,
      "Cache-Control": "no-store",
    },
  });
}
