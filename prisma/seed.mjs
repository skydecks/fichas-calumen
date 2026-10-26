import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const sections = [
  {
    id: "sec-luminosos",
    key: "luminosos",
    title: "Factores Luminosos",
    standard: "CIE015:2018",
    icon: "icon-luminosos.png",
    rows: [
      { id: "l1", label: "Transmisión Luminosa (TL)", value: "82%", kind: "row" },
      { id: "l2", label: "Reflexión exterior (RLe)", value: "8%", kind: "row" },
      { id: "l3", label: "Reflexión interior (RLi)", value: "8%", kind: "row" },
    ],
  },
  {
    id: "sec-energeticos",
    key: "energeticos",
    title: "Factores Energéticos",
    standard: "NFRC",
    icon: "icon-energeticos.png",
    rows: [
      { id: "e1", label: "Transmisión energética (TE)", value: "55%", kind: "row" },
      { id: "e2", label: "UV (Tuv)", value: "0%", kind: "row" },
      { id: "e3", label: "Refl. energ. exterior (Ree)", value: "6%", kind: "row" },
      { id: "e4", label: "Refl. energ. interior (Rei)", value: "6%", kind: "row" },
      { id: "e5", label: "Absorción energ. A1 (AE1)", value: "39%", kind: "row" },
      { id: "e6", label: "Tdw-ISO", value: "0.54", kind: "row" },
    ],
  },
  {
    id: "sec-solares",
    key: "solares",
    title: "Factores Solares",
    standard: "NFRC",
    icon: "icon-solares.png",
    rows: [
      { id: "s1", label: "SHGC", value: "0.67", kind: "row" },
      { id: "s2", label: "Coeficiente de Sombra (SC)", value: "0.77", kind: "row" },
    ],
  },
  {
    id: "sec-termica",
    key: "termica",
    title: "Transmitancia Térmica",
    standard: "ANSI/NFRC 100-2020",
    icon: "icon-termica.png",
    rows: [
      {
        id: "t1",
        label: "Ángulo respecto a posición vertical",
        value: "0°",
        kind: "row",
      },
      { id: "t2", label: "Ug Verano", value: "4.6 W/(m2.K)", kind: "row" },
      { id: "t3", label: "Ug Invierno", value: "5.0 W/(m2.K)", kind: "row" },
    ],
  },
  {
    id: "sec-acustica",
    key: "acustica",
    title: "Acústica",
    standard: "EN 12758",
    icon: "icon-acustica.png",
    rows: [
      {
        id: "a0",
        label: "Valores acústicos calculados",
        kind: "note",
      },
      { id: "a1", label: "Rw (C;Ctr)", value: "42 (-1; -4) dB", kind: "row" },
      { id: "a2", label: "Ra", value: "41 dB", kind: "row" },
      { id: "a3", label: "Ra,tr", value: "38 dB", kind: "row" },
      { id: "a4", label: "STC (ASTM E413)", value: "42", kind: "row" },
      { id: "a5", label: "OITC (ASTM E1332)", value: "36", kind: "row" },
    ],
  },
  {
    id: "sec-color",
    key: "color",
    title: "Índice de reproducción de color",
    standard: "CIE015:2018",
    icon: "icon-color.png",
    rows: [
      { id: "c1", label: "Transmisión (Ra)", value: "94.2", kind: "row" },
      { id: "c2", label: "Reflexión (Ra)", value: "94.6", kind: "row" },
    ],
  },
  {
    id: "sec-impacto",
    key: "impacto",
    title: "Resistencia a impacto pendular",
    standard: "EN12600",
    icon: "icon-impacto.png",
    rows: [
      {
        id: "i1",
        label: "Resistencia a Impacto de Cuerpo Pendular",
        value: "1B1",
        kind: "row",
      },
    ],
  },
  {
    id: "sec-antiagresion",
    key: "antiagresion",
    title: "Resistencia antiagresión",
    standard: "EN356",
    icon: "icon-antiagresion.png",
    rows: [
      {
        id: "ag1",
        label: "Nivel de Resistencia Antiagresión",
        value: "P4A",
        kind: "row",
      },
    ],
  },
  {
    id: "sec-dimensiones",
    key: "dimensiones",
    title: "Dimensiones de fabricación",
    standard: "",
    icon: "icon-dimensiones.png",
    rows: [
      { id: "d1", label: "Espesor nominal", value: "25.5 mm", kind: "row" },
      { id: "d2", label: "Peso", value: "62 kg/m²", kind: "row" },
    ],
  },
  {
    id: "sec-sostenibilidad",
    key: "sostenibilidad",
    title: "Sostenibilidad",
    standard: "",
    icon: "icon-sostenibilidad.png",
    rows: [
      { id: "su1", label: "Huella de carbono", kind: "heading" },
      {
        id: "su2",
        label:
          "El valor se estima en función de la composición y se calcula según la norma EN 15804+A2",
        kind: "note",
      },
      {
        id: "su3",
        label:
          "Potencial de calentamiento global (GWP) – A1-A3 (kg CO₂ eq/m²) Media Europea (A1-A3)",
        value: "—",
        kind: "row",
      },
      {
        id: "su4",
        label: "Declaración ambiental de producto",
        value: "EN 15804+A2",
        kind: "row",
      },
    ],
  },
];

const pinned = [
  { id: "p1", label: "Transmisión Luminosa (TL)", value: "82%", kind: "row" },
  { id: "p2", label: "Reflexión exterior (RLe)", value: "8%", kind: "row" },
  { id: "p3", label: "SHGC", value: "0.67", kind: "row" },
  {
    id: "p4",
    label: "Ángulo respecto a posición vertical",
    value: "0°",
    kind: "row",
  },
  { id: "p5", label: "Ug Verano", value: "4.6 W/(m2.K)", kind: "row" },
  { id: "p6", label: "Ug Invierno", value: "5.0 W/(m2.K)", kind: "row" },
  { id: "p7", label: "Rw", value: "42 (-1; -4) dB", kind: "row" },
];

const layers = [
  { material: "PLANILUX", thickness: "12mm", treatment: "Termoendurecido" },
  { material: "PVB STANDARD", thickness: "1.52mm", treatment: undefined },
  { material: "PLANILUX", thickness: "12mm", treatment: "Termoendurecido" },
];

async function main() {
  const agentA = await prisma.salesAgent.upsert({
    where: { id: "seed-agent-1" },
    update: {},
    create: {
      id: "seed-agent-1",
      name: "Carlos Ramírez",
      email: "carlos.ramirez@ceyco.mx",
      phone: "+52 55 1400 2210",
      region: "Bajío",
      active: true,
    },
  });

  const agentB = await prisma.salesAgent.upsert({
    where: { id: "seed-agent-2" },
    update: {},
    create: {
      id: "seed-agent-2",
      name: "Mariana Ortega",
      email: "mariana.ortega@ceyco.mx",
      phone: "+52 55 1400 2233",
      region: "CDMX",
      active: true,
    },
  });

  const clientA = await prisma.client.upsert({
    where: { id: "seed-client-1" },
    update: {},
    create: {
      id: "seed-client-1",
      name: "Laura Méndez",
      company: "Constructora del Bajío",
      email: "laura.mendez@cbajio.mx",
      phone: "+52 442 118 9040",
      address: "Av. Constituyentes 145, Querétaro, QRO",
      notes: "Cliente recurrente en proyectos de acristalamiento acústico.",
    },
  });

  const clientB = await prisma.client.upsert({
    where: { id: "seed-client-2" },
    update: {},
    create: {
      id: "seed-client-2",
      name: "Jorge Salinas",
      company: "Grupo Inmobiliario Altura",
      email: "jsalinas@altura.mx",
      phone: "+52 55 8890 3312",
      address: "Paseo de la Reforma 505, CDMX",
    },
  });

  const projectA = await prisma.project.upsert({
    where: { id: "seed-project-1" },
    update: {},
    create: {
      id: "seed-project-1",
      name: "Torre Corporativa Norte",
      code: "PRY-2026-014",
      location: "Querétaro, QRO",
      clientId: clientA.id,
      agentId: agentA.id,
      status: "ADJUDICADO",
      notes: "Fachada de doble altura con requerimiento acústico Rw 42 dB.",
    },
  });

  await prisma.project.upsert({
    where: { id: "seed-project-2" },
    update: {},
    create: {
      id: "seed-project-2",
      name: "Residencial Alba",
      code: "PRY-2026-021",
      location: "Ciudad de México",
      clientId: clientB.id,
      agentId: agentB.id,
      status: "COTIZADO",
      notes: "Ventanería residencial con control solar.",
    },
  });

  const calculatedAt = new Date("2026-10-23T12:00:00.000Z");
  const issuedAt = new Date("2026-10-23T12:00:00.000Z");

  await prisma.specification.upsert({
    where: { id: "seed-spec-1" },
    update: {},
    create: {
      id: "seed-spec-1",
      reference: "1212.4 HT",
      projectId: projectA.id,
      agentId: agentA.id,
      glassName: "Acristalamiento acústico laminado",
      glassLayers: JSON.stringify(layers),
      data: JSON.stringify({ sections, pinned, glassName: "Acristalamiento acústico laminado" }),
      catalog: "México",
      standard: "NFRC",
      calculatedBy: "Soporte Técnico CEYCO",
      calculatedAt,
      issuedAt,
      status: "EMITIDA",
      notes: "Ficha de ejemplo generada a partir de los valores del PDF de referencia.",
    },
  });

  console.log("Datos de ejemplo listos.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
