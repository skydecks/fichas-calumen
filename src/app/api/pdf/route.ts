import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { parseDataForPdf } from "@/lib/payload";
import { renderSpecPdf } from "@/lib/pdf/spec-document";
import { pdfFileName } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = enforceRateLimit(
    request,
    "pdf-preview",
    30,
    60000,
  );
  if (limited) return limited;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const data = parseDataForPdf(body ?? {});
    const buffer = await renderSpecPdf(data);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${pdfFileName(data.glassName || data.reference)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generando vista previa PDF", error);
    return NextResponse.json(
      { error: "No se pudo generar la vista previa del PDF." },
      { status: 400 },
    );
  }
}
