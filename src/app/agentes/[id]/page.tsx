import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteAgentAction, updateAgentAction } from "@/app/actions";
import {
  IconArrowLeft,
  IconCheck,
  IconFile,
  IconGlobe,
  IconUsers,
} from "@/components/icons";
import { ConfirmButton } from "@/components/SubmitButton";
import { FormCard, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import AgentForm from "../AgentForm";

export const dynamic = "force-dynamic";

export default async function AgentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  const agent = await prisma.salesAgent.findUnique({
    where: { id },
    include: {
      projects: {
        include: { client: true, _count: { select: { specs: true } } },
        orderBy: { updatedAt: "desc" },
      },
      specs: {
        include: { project: { include: { client: true } } },
        orderBy: { updatedAt: "desc" },
        take: 10,
      },
    },
  });

  if (!agent) notFound();

  const specCount = agent.projects.reduce(
    (acc, project) => acc + project._count.specs,
    0,
  );
  const projectLabel =
    agent.projects.length === 1 ? "proyecto" : "proyectos";
  const specLabel = specCount === 1 ? "ficha" : "fichas";

  return (
    <div>
      <Link
        href="/agentes"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <IconArrowLeft width={14} height={14} />
        Volver a agentes
      </Link>

      <PageHeader
        eyebrow="Equipo comercial"
        title={agent.name}
        subtitle={`${agent.region ?? "Sin región"} · ${agent.projects.length} ${projectLabel} · ${specCount} ${specLabel}`}
        actions={
          <Link href="/fichas/nueva" className="btn-primary">
            <IconFile width={16} height={16} />
            Nueva ficha
          </Link>
        }
      />

      {saved ? (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <IconCheck width={16} height={16} />
          Los datos del agente se guardaron correctamente.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <FormCard
          title="Datos del agente"
          description="El agente asignado aparece en el seguimiento interno de la ficha; puedes cambiarlo por proyecto."
        >
          <AgentForm
            action={updateAgentAction}
            values={{
              id: agent.id,
              name: agent.name,
              email: agent.email ?? "",
              phone: agent.phone ?? "",
              region: agent.region ?? "",
              active: agent.active,
            }}
            submitLabel="Guardar cambios"
            cancelHref={`/agentes/${agent.id}`}
          />
        </FormCard>

        <div className="space-y-6">
          <section className="card card-pad">
            <h2 className="h-section">Resumen</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Estado</dt>
                <dd>
                  <span
                    className={
                      agent.active ? "badge badge-green" : "badge badge-slate"
                    }
                  >
                    {agent.active ? "Activo" : "Inactivo"}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Proyectos</dt>
                <dd className="font-semibold text-slate-900">
                  {agent.projects.length}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Fichas</dt>
                <dd className="font-semibold text-slate-900">{specCount}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Correo</dt>
                <dd className="truncate text-right text-slate-700">
                  {agent.email ?? "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Teléfono</dt>
                <dd className="text-slate-700">{agent.phone ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Alta</dt>
                <dd className="text-slate-700">{formatDate(agent.createdAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="card card-pad border-red-100">
            <h2 className="h-section text-red-700">Eliminar agente</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Los proyectos y fichas se conservarán, pero quedarán sin agente
              asignado.
            </p>
            <form action={deleteAgentAction} className="mt-4">
              <input type="hidden" name="id" value={agent.id} />
              <ConfirmButton
                message={`¿Eliminar al agente ${agent.name}?`}
                className="btn-danger w-full"
              >
                Eliminar agente
              </ConfirmButton>
            </form>
          </section>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="h-section">Proyectos asignados</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Cartera bajo su responsabilidad
            </p>
          </div>
          {agent.projects.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <IconGlobe width={24} height={24} className="text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-700">
                Sin proyectos asignados
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {agent.projects.map((project) => (
                <li
                  key={project.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/proyectos/${project.id}`}
                      className="block truncate text-sm font-semibold text-slate-800 hover:text-brand-600"
                    >
                      {project.name}
                    </Link>
                    <p className="truncate text-[11px] text-slate-500">
                      {project.client.name} · {project._count.specs} fichas
                    </p>
                  </div>
                  <Link
                    href={`/proyectos/${project.id}`}
                    className="btn-secondary btn-sm shrink-0"
                  >
                    Abrir
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="h-section">Fichas recientes</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Últimas especificaciones asignadas
            </p>
          </div>
          {agent.specs.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <IconUsers width={24} height={24} className="text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-700">
                Sin fichas emitidas
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {agent.specs.map((spec) => (
                <li
                  key={spec.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/fichas/${spec.id}`}
                      className="block truncate text-sm font-semibold text-slate-800 hover:text-brand-600"
                    >
                      {spec.reference}
                    </Link>
                    <p className="truncate text-[11px] text-slate-500">
                      {spec.project.client.name} · {spec.project.name}
                    </p>
                  </div>
                  <span className={STATUS_STYLE[spec.status]}>
                    {STATUS_LABEL[spec.status] ?? spec.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
