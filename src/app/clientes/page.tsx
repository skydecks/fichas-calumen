import Link from "next/link";
import { deleteClientAction } from "@/app/actions";
import { ConfirmButton } from "@/components/SubmitButton";
import { IconPlus, IconSearch, IconTrash, IconUsers } from "@/components/icons";
import { EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { SpectrumButton } from "@/components/spectrum/button";
import { SpectrumCard } from "@/components/spectrum/card";
import { SpectrumInput } from "@/components/spectrum/input";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const clients = await prisma.client.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query } },
            { company: { contains: query } },
            { email: { contains: query } },
          ],
        }
      : undefined,
    include: {
      _count: { select: { projects: true } },
      projects: {
        select: { id: true, name: true, _count: { select: { specs: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
            Cartera comercial
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Clientes
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Empresas y contactos a los que pertenecen los proyectos y las
            fichas emitidas.
          </p>
        </div>
        <SpectrumButton
          href="/clientes/nuevo"
          variant="primary"
          leftIcon={<IconPlus width={16} height={16} />}
        >
          Nuevo cliente
        </SpectrumButton>
      </div>

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/clientes">
        <SpectrumInput
          name="q"
          defaultValue={query}
          placeholder="Buscar por nombre, empresa o correo"
          className="min-w-[220px] flex-1 sm:max-w-sm pl-9"
        />
        <SpectrumButton type="submit" variant="secondary" size="sm">
          Buscar
        </SpectrumButton>
        {query ? (
          <Link href="/clientes" className="btn-ghost btn-sm">
            Limpiar
          </Link>
        ) : null}
        <span className="ml-auto text-xs text-slate-500">
          {clients.length} {clients.length === 1 ? "cliente" : "clientes"}
        </span>
      </form>

      {clients.length === 0 ? (
        <EmptyState
          title={query ? "Sin resultados" : "Todavía no hay clientes"}
          description={
            query
              ? "Prueba con otro término de búsqueda."
              : "Registra el primer cliente para empezar a asociar proyectos y fichas técnicas."
          }
          icon={<IconUsers width={22} height={22} />}
          action={
            <SpectrumButton
              href="/clientes/nuevo"
              variant="primary"
              size="sm"
              leftIcon={<IconPlus width={14} height={14} />}
            >
              Nuevo cliente
            </SpectrumButton>
          }
        />
      ) : (
        <SpectrumCard padding="none">
          <div className="overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Proyectos</th>
                  <th>Fichas</th>
                  <th>Alta</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const specCount = client.projects.reduce(
                    (acc, p) => acc + p._count.specs,
                    0,
                  );
                  return (
                    <tr key={client.id}>
                      <td>
                        <Link
                          href={`/clientes/${client.id}`}
                          className="font-semibold text-slate-900 hover:text-brand-600"
                        >
                          {client.name}
                        </Link>
                        <p className="text-[11px] text-slate-500">
                          {client.company ?? "Sin empresa"}
                        </p>
                      </td>
                      <td className="text-xs">
                        {client.email ?? "—"}
                        <p className="text-[11px] text-slate-500">
                          {client.phone ?? ""}
                        </p>
                      </td>
                      <td className="text-sm">{client._count.projects}</td>
                      <td className="text-sm">{specCount}</td>
                      <td className="text-xs text-slate-500">
                        {formatDate(client.createdAt)}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/clientes/${client.id}`}
                            className="btn-secondary btn-sm"
                          >
                            Editar
                          </Link>
                          <form action={deleteClientAction}>
                            <input type="hidden" name="id" value={client.id} />
                            <ConfirmButton
                              message={`¿Eliminar a ${client.name}? También se eliminarán sus proyectos y fichas.`}
                              title="Eliminar cliente"
                              className="icon-btn text-slate-400 hover:border-red-200 hover:text-red-600"
                            >
                              <IconTrash width={14} height={14} />
                            </ConfirmButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SpectrumCard>
      )}
    </div>
  );
}
