"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SPEC_STATUSES, type SpecStatus } from "@/lib/types";

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullable(value: string): string | null {
  return value.length > 0 ? value : null;
}

/* ------------------------------- Clientes ------------------------------- */

export async function createClientAction(form: FormData) {
  const name = text(form, "name");
  if (!name) redirect("/clientes/nuevo?error=nombre");

  const client = await prisma.client.create({
    data: {
      name,
      company: nullable(text(form, "company")),
      email: nullable(text(form, "email")),
      phone: nullable(text(form, "phone")),
      address: nullable(text(form, "address")),
      notes: nullable(text(form, "notes")),
    },
    select: { id: true },
  });

  revalidatePath("/clientes");
  revalidatePath("/");
  redirect(`/clientes/${client.id}`);
}

export async function updateClientAction(form: FormData) {
  const id = text(form, "id");
  const name = text(form, "name");
  if (!id || !name) redirect("/clientes");

  await prisma.client.update({
    where: { id },
    data: {
      name,
      company: nullable(text(form, "company")),
      email: nullable(text(form, "email")),
      phone: nullable(text(form, "phone")),
      address: nullable(text(form, "address")),
      notes: nullable(text(form, "notes")),
    },
  });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/");
  redirect(`/clientes/${id}?saved=1`);
}

export async function deleteClientAction(form: FormData) {
  const id = text(form, "id");
  if (id) {
    await prisma.client.delete({ where: { id } });
    revalidatePath("/clientes");
    revalidatePath("/proyectos");
    revalidatePath("/fichas");
    revalidatePath("/");
  }
  redirect("/clientes");
}

/* -------------------------------- Agentes ------------------------------- */

export async function createAgentAction(form: FormData) {
  const name = text(form, "name");
  if (!name) redirect("/agentes/nuevo?error=nombre");

  const agent = await prisma.salesAgent.create({
    data: {
      name,
      email: nullable(text(form, "email")),
      phone: nullable(text(form, "phone")),
      region: nullable(text(form, "region")),
      active: form.get("active") !== null,
    },
    select: { id: true },
  });

  revalidatePath("/agentes");
  revalidatePath("/");
  redirect(`/agentes/${agent.id}`);
}

export async function updateAgentAction(form: FormData) {
  const id = text(form, "id");
  const name = text(form, "name");
  if (!id || !name) redirect("/agentes");

  await prisma.salesAgent.update({
    where: { id },
    data: {
      name,
      email: nullable(text(form, "email")),
      phone: nullable(text(form, "phone")),
      region: nullable(text(form, "region")),
      active: form.get("active") !== null,
    },
  });

  revalidatePath("/agentes");
  revalidatePath(`/agentes/${id}`);
  revalidatePath("/");
  redirect(`/agentes/${id}?saved=1`);
}

export async function deleteAgentAction(form: FormData) {
  const id = text(form, "id");
  if (id) {
    await prisma.salesAgent.delete({ where: { id } });
    revalidatePath("/agentes");
    revalidatePath("/proyectos");
    revalidatePath("/fichas");
    revalidatePath("/");
  }
  redirect("/agentes");
}

/* ------------------------------- Proyectos ------------------------------ */

const PROJECT_STATUS_VALUES = [
  "PROSPECTO",
  "EN_DISENO",
  "COTIZADO",
  "ADJUDICADO",
  "CERRADO",
];

export async function createProjectAction(form: FormData) {
  const name = text(form, "name");
  const clientId = text(form, "clientId");
  if (!name) redirect("/proyectos/nuevo?error=nombre");
  if (!clientId) redirect("/proyectos/nuevo?error=cliente");

  const statusRaw = text(form, "status");
  const status = PROJECT_STATUS_VALUES.includes(statusRaw)
    ? statusRaw
    : "PROSPECTO";

  const project = await prisma.project.create({
    data: {
      name,
      code: nullable(text(form, "code")),
      location: nullable(text(form, "location")),
      clientId,
      agentId: nullable(text(form, "agentId")),
      status,
      notes: nullable(text(form, "notes")),
    },
    select: { id: true },
  });

  revalidatePath("/proyectos");
  revalidatePath("/clientes");
  revalidatePath("/");
  redirect(`/proyectos/${project.id}`);
}

export async function updateProjectAction(form: FormData) {
  const id = text(form, "id");
  const name = text(form, "name");
  if (!id || !name) redirect("/proyectos");

  const statusRaw = text(form, "status");
  const status = PROJECT_STATUS_VALUES.includes(statusRaw)
    ? statusRaw
    : "PROSPECTO";

  const clientId = text(form, "clientId");

  await prisma.project.update({
    where: { id },
    data: {
      name,
      code: nullable(text(form, "code")),
      location: nullable(text(form, "location")),
      ...(clientId ? { clientId } : {}),
      agentId: nullable(text(form, "agentId")),
      status,
      notes: nullable(text(form, "notes")),
    },
  });

  revalidatePath("/proyectos");
  revalidatePath(`/proyectos/${id}`);
  revalidatePath("/");
  redirect(`/proyectos/${id}?saved=1`);
}

export async function deleteProjectAction(form: FormData) {
  const id = text(form, "id");
  if (id) {
    await prisma.project.delete({ where: { id } });
    revalidatePath("/proyectos");
    revalidatePath("/fichas");
    revalidatePath("/");
  }
  redirect("/proyectos");
}

/* ----------------------------- Especificaciones ------------------------- */

export async function updateSpecStatusAction(form: FormData) {
  const id = text(form, "id");
  const statusRaw = text(form, "status") as SpecStatus;
  if (!id || !SPEC_STATUSES.includes(statusRaw)) redirect("/fichas");

  await prisma.specification.update({
    where: { id },
    data: {
      status: statusRaw,
      ...(statusRaw === "EMITIDA" ? { issuedAt: new Date() } : {}),
    },
  });

  revalidatePath("/fichas");
  revalidatePath(`/fichas/${id}`);
  revalidatePath("/");
}

export async function deleteSpecAction(form: FormData) {
  const id = text(form, "id");
  if (id) {
    await prisma.specification.delete({ where: { id } });
    revalidatePath("/fichas");
    revalidatePath("/proyectos");
    revalidatePath("/");
  }
  redirect("/fichas");
}

export async function duplicateSpecAction(form: FormData) {
  const id = text(form, "id");
  if (!id) redirect("/fichas");

  const original = await prisma.specification.findUnique({ where: { id } });
  if (!original) redirect("/fichas");

  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    issuedAt: _issuedAt,
    ...rest
  } = original;

  const copy = await prisma.specification.create({
    data: {
      ...rest,
      reference: `${original.reference} (copia)`,
      status: "BORRADOR",
    },
    select: { id: true },
  });

  revalidatePath("/fichas");
  redirect(`/fichas/${copy.id}`);
}

/* -------------------------------- Productos ------------------------------ */

export async function deleteProductAction(form: FormData) {
  const id = text(form, "id");
  if (id) {
    await prisma.product.delete({ where: { id } });
    revalidatePath("/productos");
    revalidatePath("/");
  }
  redirect("/productos");
}
