import { PrismaClient } from "@prisma/client";
import { productToProfile } from "../src/lib/products";

const BASE = "https://calumen.skydeck.com.mx";
const password = (process.env.APP_PASSWORD ?? "").trim();
const prisma = new PrismaClient();

type Json = Record<string, any>;
let cookie = "";

async function api(path: string, init: RequestInit = {}): Promise<any> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} -> ${response.status}: ${text.slice(0, 500)}`);
  }
  return payload;
}

async function pause(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!login.ok) throw new Error(`Login falló: ${login.status}`);
  cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
  if (!cookie) throw new Error("No se recibió la cookie de sesión.");

  const [clients, agents, projects, specs, products] = await Promise.all([
    prisma.client.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.salesAgent.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.project.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.specification.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.product.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  // Copia nueva primero: si algo falla, los datos remotos anteriores siguen intactos.
  const agentMap = new Map<string, string>();
  for (const agent of agents) {
    const result = await api("/api/agents", {
      method: "POST",
      body: JSON.stringify({
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        region: agent.region,
        active: agent.active,
      }),
    });
    agentMap.set(agent.id, result.data.id);
    await pause(80);
  }

  const clientMap = new Map<string, string>();
  for (const client of clients) {
    const result = await api("/api/clients", {
      method: "POST",
      body: JSON.stringify({
        name: client.name,
        company: client.company,
        email: client.email,
        phone: client.phone,
        address: client.address,
        notes: client.notes,
      }),
    });
    clientMap.set(client.id, result.data.id);
    await pause(80);
  }

  const projectMap = new Map<string, string>();
  for (const project of projects) {
    const clientId = clientMap.get(project.clientId);
    if (!clientId) continue;
    const result = await api("/api/projects", {
      method: "POST",
      body: JSON.stringify({
        name: project.name,
        code: project.code,
        location: project.location,
        clientId,
        agentId: project.agentId ? agentMap.get(project.agentId) : undefined,
        status: project.status,
        notes: project.notes,
      }),
    });
    projectMap.set(project.id, result.data.id);
    await pause(80);
  }

  for (const spec of specs) {
    const projectId = projectMap.get(spec.projectId);
    if (!projectId) continue;
    let stored: any = {};
    try {
      stored = spec.data ? JSON.parse(spec.data) : {};
    } catch {
      stored = {};
    }
    let layers: unknown = [];
    try {
      layers = JSON.parse(spec.glassLayers || "[]");
    } catch {
      layers = [];
    }
    await api("/api/specs", {
      method: "POST",
      body: JSON.stringify({
        reference: spec.reference,
        projectId,
        agentId: spec.agentId ? agentMap.get(spec.agentId) : undefined,
        glassName: spec.glassName,
        layers,
        rawHtml: spec.rawHtml,
        sections: stored.sections ?? [],
        pinned: stored.pinned ?? [],
        branding: stored.branding,
        catalog: spec.catalog,
        standard: spec.standard,
        calculatedBy: spec.calculatedBy,
        calculatedAt: spec.calculatedAt?.toISOString().slice(0, 10),
        status: spec.status,
        notes: spec.notes,
      }),
    });
    await pause(120);
  }

  for (const product of products) {
    const profile = productToProfile(product);
    await api("/api/products", {
      method: "POST",
      body: JSON.stringify({
        profile,
        sourceName: product.sourceName,
        sourceType: product.sourceType,
        rawText: product.rawText,
      }),
    });
    await pause(120);
  }

  console.log(JSON.stringify({
    copied: {
      agents: agentMap.size,
      clients: clientMap.size,
      projects: projectMap.size,
      specs: specs.length,
      products: products.length,
    },
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
