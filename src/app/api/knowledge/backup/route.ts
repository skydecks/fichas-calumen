import { NextResponse } from "next/server";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createZipArchive, type ZipFileEntry } from "@/lib/zip-builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KNOWLEDGE_DIR = path.join(process.cwd(), "public", "knowledge");

export async function GET(): Promise<Response> {
  try {
    if (!existsSync(KNOWLEDGE_DIR)) {
      return NextResponse.json(
        { error: "No existe el directorio de conocimiento." },
        { status: 404 },
      );
    }

    const files = readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".md"));
    if (files.length === 0) {
      return NextResponse.json(
        { error: "No hay archivos en la base de conocimiento para respaldar." },
        { status: 404 },
      );
    }

    const entries: ZipFileEntry[] = [];
    for (const fileName of files) {
      const fullPath = path.join(KNOWLEDGE_DIR, fileName);
      try {
        const data = readFileSync(fullPath);
        entries.push({ name: fileName, data });
      } catch {
        // ignorar fallo en un archivo individual
      }
    }

    const zipBuffer = createZipArchive(entries);
    const dateStr = new Date().toISOString().slice(0, 10);
    const outputName = `conocimiento-respaldo-${dateStr}.zip`;

    return new Response(zipBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${outputName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Error generando respaldo ZIP:", error);
    return NextResponse.json(
      { error: "No se pudo generar el archivo ZIP de respaldo." },
      { status: 500 },
    );
  }
}
