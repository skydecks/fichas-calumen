import Link from "next/link";
import { deleteAgentAction } from "@/app/actions";
import { ConfirmButton } from "@/components/SubmitButton";
import { IconAgent, IconPlus, IconSearch, IconTrash } from "@/components/icons";
import { EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { SpectrumButton } from "@/components/spectrum/button";
import { SpectrumCard } from "@/components/spectrum/card";
import { SpectrumInput } from "@/components/spectrum/input";

export const dynamic = "force-dynamic";

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const agents = await prisma.salesAgent.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query } },
            { email: { contains: query } },
            { region: { contains: query } },
          ],
        }
      : undefined,
    include: {
      _count: { select: { projects: true, specs: true } },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
            Equipo comercial
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Agentes de venta
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Responsables de cada proyecto y de las fichas técnicas emitidas.
          </p>
        </div>
        <SpectrumButton
          href="/agentes/nuevo"
          variant="primary"
          leftIcon={<IconPlus width={16} height={16} />}
        >
          Nuevo agente
        </SpectrumButton>
      </div>

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/agentes">
        <SpectrumInput
          name="q"
          defaultValue={query}
          placeholder="Buscar por nombre, correo o región"
          className="min-w-[220px] flex-1 sm:max-w-sm pl-9"
        />
        <SpectrumButton type="submit" variant="secondary" size="sm">
          Buscar
        </SpectrumButton>
        {query ? (
          <Link href="/agentes" className="btn-ghost btn-sm">
            Limpiar
          </Link>
        ) : null}
        <span className="ml-auto text-xs text-slate-500">
          {agents.length} {agents.length === 1 ? "agente" : "agentes"}
        </span>
      </form>

      {agents.length === 0 ? (
        <EmptyState
          title={query ? "Sin resultados" : "Todavía no hay agentes"}
          description={
            query
              ? "Prueba con otro término de búsqueda."
              : "Registra a los responsables comerciales para asignarlos a proyectos y fichas."
          }
          icon={<IconAgent width={22} height={22} />}
          action={
            <SpectrumButton
              href="/agentes/nuevo"
              variant="primary"
              size="sm"
              leftIcon={<IconPlus width={14} height={14} />}
            >
              Nuevo agente
            </SpectrumButton>
          }
        />
      ) : (
        <SpectrumCard padding="none">
          <div className="overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th>Agente</th>
                  <th>Región</th>
                  <th>Proyectos</th>
                  <th>Fichas</th>
                  <th>Estado</th>
                  <th>Alta</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id}>
                    <td>
                      <Link
                        href={`/agentes/${agent.id}`}
                        className="font-semibold text-slate-900 hover:text-brand-600"
                      >
                        {agent.name}
                      </Link>
                      <p className="text-[11px] text-slate-500">
                        {agent.email ?? "Sin correo"}
                      </p>
                    </td>
                    <td className="text-xs">{agent.region ?? "—"}</td>
                    <td className="text-sm">{agent._count.projects}</td>
                    <td className="text-sm">{agent._count.specs}</td>
                    <td>
                      <span
                        className={
                          agent.active ? "badge badge-green" : "badge badge-slate"
                        }
                      >
                        {agent.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">
                      {formatDate(agent.createdAt)}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/agentes/${agent.id}`}
                          className="btn-secondary btn-sm"
                        >
                          Editar
                        </Link>
                        <form action={deleteAgentAction}>
                          <input type="hidden" name="id" value={agent.id} />
                          <ConfirmButton
                            message={`¿Eliminar al agente ${agent.name}? Sus proyectos y fichas quedarán sin agente.`}
                            title="Eliminar agente"
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
