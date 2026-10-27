import { NextResponse } from "next/server";
import { copyFileSync, existsSync, readFileSync, statSync, writeFileSync, constants, accessSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dbPath(): string {
  const raw = (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "");
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

function inspect() {
  const file = dbPath();
  let writable = false;
  let size = 0;
  let sqlite = false;
  try {
    accessSync(file, constants.R_OK | constants.W_OK);
    writable = true;
  } catch {}
  try {
    size = statSync(file).size;
    sqlite = readFileSync(file).subarray(0, 16).toString("utf8") === "SQLite format 3\u0000";
  } catch {}
  return { cwd: process.cwd(), databaseUrl: process.env.DATABASE_URL ?? null, file, exists: existsSync(file), writable, size, sqlite };
}

export async function GET() {
  return NextResponse.json(inspect());
}

export async function POST(request: Request) {
  const file = dbPath();
  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length < 100 || bytes.subarray(0, 16).toString("utf8") !== "SQLite format 3\u0000") {
    return NextResponse.json({ error: "El archivo no es una base SQLite válida." }, { status: 400 });
  }
  if (bytes.length > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "La base supera 10 MB." }, { status: 400 });
  }
  try {
    await prisma.$disconnect();
    const backup = `${file}.backup-${Date.now()}`;
    if (existsSync(file)) copyFileSync(file, backup);
    writeFileSync(file, bytes);
    return NextResponse.json({ ok: true, backup, ...inspect() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
