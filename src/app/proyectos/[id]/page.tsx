import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteProjectAction,
  updateProjectAction,
} from "@/app/actions";
import {
  IconArrowLeft,
  IconCheck,
  IconFile,
  IconPlus,
} from "@/components/icons";
import { ConfirmButton } from "@/components/SubmitButton";
import SpecsTable from "@/components/SpecsTable";
import { EmptyState, FormCard, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUSES,
  STATUS_LABEL,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";
import ProjectForm from "../ProjectForm";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  const [project, clients, agents] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        agent: true,
        specs: {
          include: {
            project: { include: { client: true } },
            agent: true,
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    }),
    prisma.client.findMany({
      select: { id: true, name: true, company: true },
      orderBy: { name: "asc" },
    }),
    prisma.salesAgent.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!project) notFound();

  const byStatus = project.specs.reduce<Record<string, number>>((acc, spec) => {
    acc[spec.status] = (acc[spec.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <Link
        href="/proyectos"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <IconArrowLeft width={14} height={14} />
        Volver a proyectos
      </Link>

      <PageHeader
        eyebrow={`${project.client.name}${project.code ? ` · ${project.code}` : ""}`}
        title={project.name}
        subtitle={`${project.location ?? "Sin ubicación"} · ${project.specs.length} ${
          project.specs.length === 1 ? "ficha técnica" : "fichas técnicas"
        }`}
        actions={
          <>
            <Link
              href={`/clientes/${project.clientId}`}
              className="btn-secondary"
            >
              Ver cliente
            </Link>
            <Link
              href={`/fichas/nueva?projectId=${project.id}`}
              className="btn-primary"
            >
              <IconPlus width={16} height={16} />
              Nueva ficha
            </Link>
          </>
        }
      />

      {saved ? (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <IconCheck width={16} height={16} />
          Los datos del proyecto se guardaron correctamente.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <FormCard
          title="Datos del proyecto"
          description="La ficha técnica hereda el proyecto, el cliente y el agente asignado."
        >
          <ProjectForm
            action={updateProjectAction}
            clients={clients}
            agents={agents}
            values={{
              id: project.id,
              name: project.name,
              code: project.code ?? "",
              location: project.location ?? "",
              clientId: project.clientId,
              agentId: project.agentId ?? "",
              status: project.status,
              notes: project.notes ?? "",
            }}
            submitLabel="Guardar cambios"
            cancelHref={`/proyectos/${project.id}`}
          />
        </FormCard>

        <div className="space-y-6">
          <section className="card card-pad">
            <h2 className="h-section">Resumen</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Estado</dt>
                <dd>
                  <span className="badge badge-blue">
                    {PROJECT_STATUS_LABEL[project.status] ?? project.status}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Cliente</dt>
                <dd className="truncate text-right font-medium text-slate-800">
                  {project.client.name}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Agente</dt>
                <dd className="text-right text-slate-700">
                  {project.agent?.name ?? "Sin asignar"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Fichas</dt>
                <dd className="font-semibold text-slate-900">
                  {project.specs.length}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Creado</dt>
                <dd className="text-slate-700">
                  {formatDate(project.createdAt)}
                </dd>
              </div>
            </dl>

            {project.specs.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3.5">
                {Object.entries(byStatus).map(([status, count]) => (
                  <span key={status} className="chip">
                    {STATUS_LABEL[status] ?? status}: {count}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section className="card card-pad border-red-100">
            <h2 className="h-section text-red-700">Eliminar proyecto</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Se eliminarán también las {project.specs.length} fichas asociadas.
              Esta acción no se puede deshacer.
            </p>
            <form action={deleteProjectAction} className="mt-4">
              <input type="hidden" name="id" value={project.id} />
              <ConfirmButton
                message={`¿Eliminar el proyecto ${project.name} y sus ${project.specs.length} fichas?`}
                className="btn-danger w-full"
              >
                Eliminar proyecto
              </ConfirmButton>
            </form>
          </section>

          <p className="px-1 text-[11px] leading-relaxed text-slate-400">
            Estados disponibles:{" "}
            {PROJECT_STATUSES.map((s) => PROJECT_STATUS_LABEL[s]).join(" · ")}
          </p>
        </div>
      </div>

      <section className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="h-section">Fichas técnicas del proyecto</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Especificaciones emitidas para este proyecto
            </p>
          </div>
          <Link
            href={`/fichas/nueva?projectId=${project.id}`}
            className="btn-secondary btn-sm"
          >
            <IconPlus width={14} height={14} />
            Nueva ficha
          </Link>
        </div>

        {project.specs.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Sin fichas todavía"
              description="Genera la primera ficha técnica de este proyecto a partir del HTML de Calumen."
              icon={<IconFile width={22} height={22} />}
              action={
                <Link
                  href={`/fichas/nueva?projectId=${project.id}`}
                  className="btn-primary btn-sm"
                >
                  Crear ficha
                </Link>
              }
            />
          </div>
        ) : (
          <SpecsTable specs={project.specs} showProject={false} />
        )}
      </section>
    </div>
  );
}
