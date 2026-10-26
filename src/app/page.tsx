import Link from "next/link";
import {
  IconAgent,
  IconFile,
  IconFolder,
  IconGlobe,
  IconPlus,
  IconSparkles,
  IconUsers,
} from "@/components/icons";
import { EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { SpectrumButton } from "@/components/spectrum/button";
import { SpectrumCard } from "@/components/spectrum/card";
import { SpectrumStatCard } from "@/components/spectrum/stat-card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [clients, projects, agents, specs, issued, recent] = await Promise.all([
    prisma.client.count(),
    prisma.project.count(),
    prisma.salesAgent.count({ where: { active: true } }),
    prisma.specification.count(),
    prisma.specification.count({ where: { status: "EMITIDA" } }),
    prisma.specification.findMany({
      take: 6,
      orderBy: { updatedAt: "desc" },
      include: { project: { include: { client: true } }, agent: true },
    }),
  ]);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
            Panel de operación
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Fichas técnicas de vidrio
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Convierte los datos de Calumen en fichas listas para entregar y
            mantén el control comercial de cada especificación.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SpectrumButton
            href="/fichas/nueva"
            variant="primary"
            leftIcon={<IconPlus width={16} height={16} />}
          >
            Nueva ficha
          </SpectrumButton>
          <SpectrumButton
            href="/proyectos/nuevo"
            variant="secondary"
            leftIcon={<IconFolder width={16} height={16} />}
          >
            Nuevo proyecto
          </SpectrumButton>
        </div>
      </div>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SpectrumStatCard
          label="Fichas emitidas"
          value={issued}
          hint={`${specs} ${specs === 1 ? "especificación" : "especificaciones"} en total`}
          icon={<IconFile width={18} height={18} />}
          variant="default"
        />
        <SpectrumStatCard
          label="Proyectos"
          value={projects}
          hint="Cartera comercial activa"
          icon={<IconFolder width={18} height={18} />}
          variant="brand"
        />
        <SpectrumStatCard
          label="Clientes"
          value={clients}
          hint="Empresas y contactos registrados"
          icon={<IconUsers width={18} height={18} />}
          variant="default"
        />
        <SpectrumStatCard
          label="Agentes activos"
          value={agents}
          hint="Responsables de venta"
          icon={<IconAgent width={18} height={18} />}
          variant="brand"
        />
      </section>

      <section className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-brand-700 px-6 py-6 text-white shadow-lg shadow-navy-900/10 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Flujo de generación
            </p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight">
              Pega el HTML de Calumen y obtén el PDF en segundos
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              El analizador reconoce los apartados de prestaciones, la
              composición del vidrio y los valores simulados. Después puedes
              revisar, ajustar y emitir la ficha vinculada a su cliente y
              proyecto.
            </p>
            <ol className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold">
                  1
                </span>
                Pega el bloque de prestaciones
              </li>
              <li className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold">
                  2
                </span>
                Revisa y ajusta valores
              </li>
              <li className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold">
                  3
                </span>
                Emite y descarga el PDF
              </li>
            </ol>
          </div>
          <SpectrumButton
            href="/fichas/nueva"
            variant="primary"
            size="lg"
            leftIcon={<IconSparkles width={16} height={16} />}
            fullWidth
          >
            Comenzar ficha
          </SpectrumButton>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[1.55fr_1fr]">
        <SpectrumCard padding="none">
          <div className="overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="h-section">Actividad reciente</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Últimas especificaciones modificadas
                  </p>
                </div>
                <Link href="/fichas" className="text-xs font-semibold text-brand-600 hover:underline">
                  Ver todas
                </Link>
              </div>
            </div>

            {recent.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="Aún no hay fichas"
                  description="Crea tu primera ficha técnica a partir de los datos de Calumen."
                  icon={<IconFile width={22} height={22} />}
                  action={
                    <SpectrumButton
                      href="/fichas/nueva"
                      variant="primary"
                      size="sm"
                      leftIcon={<IconPlus width={14} height={14} />}
                    >
                      Nueva ficha
                    </SpectrumButton>
                  }
                />
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Referencia</th>
                      <th>Proyecto</th>
                      <th>Estado</th>
                      <th>Actualizada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((spec) => (
                      <tr key={spec.id}>
                        <td>
                          <Link
                            href={`/fichas/${spec.id}`}
                            className="font-semibold text-slate-900 hover:text-brand-600"
                          >
                            {spec.reference}
                          </Link>
                          <p className="text-[11px] text-slate-500">
                            {spec.project.client.name}
                          </p>
                        </td>
                        <td className="text-xs">
                          <Link
                            href={`/proyectos/${spec.project.id}`}
                            className="font-medium text-slate-700 hover:text-brand-600"
                          >
                            {spec.project.name}
                          </Link>
                          <p className="text-[11px] text-slate-500">
                            {spec.agent?.name ?? "Sin agente"}
                          </p>
                        </td>
                        <td>
                          <span className={STATUS_STYLE[spec.status]}>
                            {STATUS_LABEL[spec.status] ?? spec.status}
                          </span>
                        </td>
                        <td className="text-xs text-slate-500">
                          {formatDate(spec.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </SpectrumCard>

        <SpectrumCard padding="md">
          <h2 className="h-section mb-4">Accesos rápidos</h2>
          <p className="mt-0.5 text-xs text-slate-500 mb-4">
            Administración comercial
          </p>
          <div className="grid gap-2">
            {[
              {
                href: "/clientes",
                label: "Clientes",
                description: "Contactos y empresas",
                icon: <IconUsers width={17} height={17} />,
              },
              {
                href: "/proyectos",
                label: "Proyectos",
                description: "Obras y oportunidades",
                icon: <IconFolder width={17} height={17} />,
              },
              {
                href: "/agentes",
                label: "Agentes de venta",
                description: "Equipo comercial",
                icon: <IconAgent width={17} height={17} />,
              },
              {
                href: "/fichas",
                label: "Fichas emitidas",
                description: "Historial y descargas",
                icon: <IconFile width={17} height={17} />,
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 transition hover:border-brand-200 hover:bg-brand-100/40"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-white group-hover:text-brand-600">
                  {item.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800">
                    {item.label}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {item.description}
                  </span>
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-slate-50 p-3.5 border border-slate-200">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <IconGlobe width={13} height={13} />
              Normas soportadas
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              NFRC · EN 410 · EN 673 · ISO 9050 · EN 12758 · EN 12600 · EN 356 ·
              EN 15804+A2
            </p>
          </div>
        </SpectrumCard>
      </div>
    </div>
  );
}
