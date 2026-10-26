import Link from "next/link";
import { deleteProjectAction } from "@/app/actions";
import { ConfirmButton } from "@/components/SubmitButton";
import { IconFolder, IconPlus, IconSearch, IconTrash } from "@/components/icons";
import { EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUSES,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { SpectrumButton } from "@/components/spectrum/button";
import { SpectrumCard } from "@/components/spectrum/card";
import { SpectrumInput } from "@/components/spectrum/input";

const STATUS_BADGE: Record<string, string> = {
  PROSPECTO: "badge badge-slate",
  EN_DISENO: "badge badge-blue",
  COTIZADO: "badge badge-amber",
  ADJUDICADO: "badge badge-green",
  CERRADO: "badge badge-slate",
};

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const query = (q ?? "").trim();
  const statusFilter =
    status && PROJECT_STATUSES.includes(status) ? status : undefined;

  const projects = await prisma.project.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { code: { contains: query } },
              { location: { contains: query } },
              { client: { name: { contains: query } } },
            ],
          }
        : {}),
    },
    include: {
      client: true,
      agent: true,
      _count: { select: { specs: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
            Cartera comercial
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Proyectos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Obras y oportunidades agrupadas por cliente, con sus fichas
            técnicas asociadas.
          </p>
        </div>
        <SpectrumButton
          href="/proyectos/nuevo"
          variant="primary"
          leftIcon={<IconPlus width={16} height={16} />}
        >
          Nuevo proyecto
        </SpectrumButton>
      </div>

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/proyectos">
        <SpectrumInput
          name="q"
          defaultValue={query}
          placeholder="Buscar por proyecto, código o cliente"
          className="min-w-[220px] flex-1 sm:max-w-sm pl-9"
        />
        <select name="status" defaultValue={statusFilter ?? ""} className="select w-auto">
          <option value="">Todos los estados</option>
          {PROJECT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {PROJECT_STATUS_LABEL[value]}
            </option>
          ))}
        </select>
        <SpectrumButton type="submit" variant="secondary" size="sm">
          Filtrar
        </SpectrumButton>
        {query || statusFilter ? (
          <Link href="/proyectos" className="btn-ghost btn-sm">
            Limpiar
          </Link>
        ) : null}
        <span className="ml-auto text-xs text-slate-500">
          {projects.length} {projects.length === 1 ? "proyecto" : "proyectos"}
        </span>
      </form>

      {projects.length === 0 ? (
        <EmptyState
          title={
            query || statusFilter
              ? "Sin resultados"
              : "Todavía no hay proyectos"
          }
          description={
            query || statusFilter
              ? "Ajusta los filtros para encontrar el proyecto."
              : "Crea un proyecto vinculado a un cliente para empezar a emitir fichas."
          }
          icon={<IconFolder width={22} height={22} />}
          action={
            <SpectrumButton
              href="/proyectos/nuevo"
              variant="primary"
              size="sm"
              leftIcon={<IconPlus width={14} height={14} />}
            >
              Nuevo proyecto
            </SpectrumButton>
          }
        />
      ) : (
        <SpectrumCard padding="none">
          <div className="overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th>Cliente</th>
                  <th>Agente</th>
                  <th>Estado</th>
                  <th>Fichas</th>
                  <th>Actualizado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <Link
                        href={`/proyectos/${project.id}`}
                        className="font-semibold text-slate-900 hover:text-brand-600"
                      >
                        {project.name}
                      </Link>
                      <p className="text-[11px] text-slate-500">
                        {project.code ?? "Sin código"} ·{" "}
                        {project.location ?? "Sin ubicación"}
                      </p>
                    </td>
                    <td className="text-xs">
                      <Link
                        href={`/clientes/${project.clientId}`}
                        className="font-medium text-slate-700 hover:text-brand-600"
                      >
                        {project.client.name}
                      </Link>
                    </td>
                    <td className="text-xs">{project.agent?.name ?? "—"}</td>
                    <td>
                      <span
                        className={
                          STATUS_BADGE[project.status] ?? "badge badge-slate"
                        }
                      >
                        {PROJECT_STATUS_LABEL[project.status] ?? project.status}
                      </span>
                    </td>
                    <td className="text-sm">{project._count.specs}</td>
                    <td className="text-xs text-slate-500">
                      {formatDate(project.updatedAt)}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/proyectos/${project.id}`}
                          className="btn-secondary btn-sm"
                        >
                          Editar
                        </Link>
                        <form action={deleteProjectAction}>
                          <input type="hidden" name="id" value={project.id} />
                          <ConfirmButton
                            message={`¿Eliminar el proyecto ${project.name} y sus fichas?`}
                            title="Eliminar proyecto"
                            className="icon-btn text-slate-400 hover:border-red-200 hover:text-red-600"
                          >
                            <IconTrash width={14} height={14} />
                          </ConfirmButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SpectrumCard>
      )}
    </div>
  );
}
