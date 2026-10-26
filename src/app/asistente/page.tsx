import Link from "next/link";
import AiAssistantSpectrum from "@/components/AiAssistantSpectrum";
import {
  IconAgent,
  IconFile,
  IconFolder,
  IconSparkles,
  IconUsers,
} from "@/components/icons";
import { PageHeader } from "@/components/ui";
import { buildAIContextFromProduct, buildAIContextFromSections } from "@/lib/ai-context";
import { prisma } from "@/lib/db";
import { specToData } from "@/lib/specs";
import { productToProfile } from "@/lib/products";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ specId?: string; productId?: string }>;
}) {
  const { specId, productId } = await searchParams;

  const [
    specCount,
    emittedCount,
    productCount,
    clients,
    projects,
    agents,
    recent,
    spec,
    product,
  ] =
    await Promise.all([
      prisma.specification.count(),
      prisma.specification.count({ where: { status: "EMITIDA" } }),
      prisma.product.count({ where: { active: true } }),
      prisma.client.count(),
      prisma.project.count(),
      prisma.salesAgent.count({ where: { active: true } }),
      prisma.specification.findMany({
        take: 6,
        orderBy: { updatedAt: "desc" },
        include: {
          project: { include: { client: true } },
          agent: true,
        },
      }),
      specId
        ? prisma.specification.findUnique({
            where: { id: specId },
            include: {
              project: { include: { client: true } },
              agent: true,
            },
          })
        : Promise.resolve(null),
      productId
        ? prisma.product.findUnique({ where: { id: productId } })
        : Promise.resolve(null),
    ]);

  const data = spec ? specToData(spec) : null;
  const productData = product ? productToProfile(product) : null;
  const context =
    productData
      ? buildAIContextFromProduct(productData, product?.rawText)
      : spec && data
      ? buildAIContextFromSections({
          fichaId: spec.id,
          reference: spec.reference,
          glassName: spec.glassName,
          status: STATUS_LABEL[spec.status] ?? spec.status,
          projectName: spec.project.name,
          clientName: spec.project.client.name,
          agentName: spec.agent?.name,
          calculatedBy: spec.calculatedBy ?? "",
          calculatedAt: data.calculatedAt,
          catalog: spec.catalog ?? "",
          standard: spec.standard ?? "",
          layers: data.layers,
          sections: data.sections,
        })
      : null;

  const stats = [
    {
      label: "Fichas",
      value: specCount,
      icon: <IconFile width={15} height={15} />,
    },
    {
      label: "Productos",
      value: productCount,
      icon: <IconSparkles width={15} height={15} />,
    },
    {
      label: "Clientes",
      value: clients,
      icon: <IconUsers width={15} height={15} />,
    },
    {
      label: "Proyectos",
      value: projects,
      icon: <IconFolder width={15} height={15} />,
    },
    {
      label: "Agentes",
      value: agents,
      icon: <IconAgent width={15} height={15} />,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Inteligencia artificial"
        title="Asistente técnico"
        subtitle="Consulta fichas y productos, recomienda soluciones con base en fichas emitidas, analiza su coherencia frente a las normas y predice resultados con IA."
        actions={
          product ? (
            <Link href={`/productos/${product.id}`} className="btn-secondary">
              <IconSparkles width={16} height={16} />
              Ver producto
            </Link>
          ) : (
            <Link href="/fichas" className="btn-secondary">
              <IconFile width={16} height={16} />
              Ver fichas
            </Link>
          )
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <AiAssistantSpectrum context={context} />
        </div>

        <aside className="space-y-4">
          <section className="card card-pad">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                <IconSparkles width={16} height={16} />
              </span>
              <div>
                <h2 className="h-section">Catálogo consultable</h2>
                <p className="text-[10px] text-slate-500">
                  Datos guardados disponibles para la IA
                </p>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2"
                >
                  <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {stat.icon}
                    {stat.label}
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-slate-900">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-3 text-[11px] text-slate-500">
              {emittedCount} de {specCount}{" "}
              {specCount === 1 ? "ficha emitida" : "fichas emitidas"}.
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
              La IA consulta las fichas guardadas y las fichas técnicas de los
              productos. Para recomendar composiciones usa únicamente fichas
              con estado EMITIDA.
            </p>
          </section>

          {spec && context ? (
            <section className="card card-pad">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                Contexto cargado
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {spec.glassName || spec.reference}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {spec.reference} · {spec.project.client.name}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {spec.project.name} · {spec.agent?.name ?? "Sin agente"}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className={STATUS_STYLE[spec.status]}>
                  {STATUS_LABEL[spec.status] ?? spec.status}
                </span>
                <span className="chip">
                  {formatDate(spec.updatedAt)}
                </span>
              </div>
              <Link
                href={`/fichas/${spec.id}`}
                className="btn-secondary btn-sm mt-3 w-full"
              >
                Abrir ficha
              </Link>
              <p className="mt-2 text-[10px] text-slate-400">
                Se consulta la última versión guardada.
              </p>
            </section>
          ) : null}

          <section className="card card-pad">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">
              Base de conocimiento
            </p>
            <h2 className="mt-1 text-sm font-semibold text-slate-900">
              NOM-146-SCFI-2016
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Vidrio de seguridad y/o contención usado en la construcción.
              Incluye definiciones, clases, niveles, tablas y métodos de prueba.
            </p>
            <Link
              href="/conocimiento"
              className="btn-secondary btn-sm mt-3 w-full"
            >
              Abrir norma
            </Link>
          </section>

          <section className="card card-pad">
            <h2 className="h-section">Qué puede hacer</h2>
            <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-slate-600">
              <li>• Consultar y comparar fichas guardadas.</li>
              <li>
                • Recomendar un producto específico o una composición usando
                fichas emitidas.
              </li>
              <li>
                • Detectar valores faltantes o incoherentes frente a la norma
                declarada.
              </li>
              <li>• Sugerir nombres comerciales y composiciones.</li>
              <li>• Analizar capturas del configurador o imágenes de vidrio.</li>
            </ul>
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="h-section">Fichas recientes</h2>
            </div>
            {recent.length === 0 ? (
              <p className="px-4 py-6 text-xs text-slate-500">
                Aún no hay fichas guardadas.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((item) => (
                  <li key={item.id} className="px-4 py-2.5">
                    <Link
                      href={`/fichas/${item.id}`}
                      className="block truncate text-xs font-semibold text-slate-800 hover:text-brand-600"
                    >
                      {item.glassName || item.reference}
                    </Link>
                    <p className="truncate text-[10px] text-slate-500">
                      {item.reference} · {item.project.client.name}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
