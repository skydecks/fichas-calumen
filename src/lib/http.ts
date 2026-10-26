import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function text(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function optionalText(value: unknown, max = 4000): string | null {
  const result = text(value, max);
  return result.length > 0 ? result : null;
}

export function has(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

export function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(entity: string) {
  return NextResponse.json(
    { error: `${entity} no encontrado.` },
    { status: 404 },
  );
}

export function apiError(error: unknown, entity: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return notFound(entity);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un registro con esos datos." },
        { status: 409 },
      );
    }
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "La referencia indicada no existe o no es válida." },
        { status: 400 },
      );
    }
  }
  console.error(`Error en ${entity}`, error);
  return NextResponse.json(
    { error: `No se pudo procesar la solicitud de ${entity}.` },
    { status: 500 },
  );
}
