import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteClientAction, updateClientAction } from "@/app/actions";
import {
  IconArrowLeft,
  IconCheck,
  IconFile,
  IconFolder,
  IconPlus,
} from "@/components/icons";
import { ConfirmButton } from "@/components/SubmitButton";
import SpecsTable from "@/components/SpecsTable";
import { FormCard, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUSES,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";
import ClientForm from "../ClientForm";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  const [client, clientSpecs] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          include: {
            agent: true,
            _count: { select: { specs: true } },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    }),
    prisma.specification.findMany({
      where: { project: { clientId: id } },
      include: {
        project: { include: { client: true } },
        agent: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (!client) notFound();

  const specCount = client.projects.reduce(
    (acc, project) => acc + project._count.specs,
    0,
  );
  const projectLabel =
    client.projects.length === 1 ? "proyecto" : "proyectos";
  const specLabel = specCount === 1 ? "ficha" : "fichas";

  return (
    <div>
      <Link
        href="/clientes"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <IconArrowLeft width={14} height={14} />
        Volver a clientes
      </Link>

      <PageHeader
        eyebrow={client.company ?? "Cliente"}
        title={client.name}
        subtitle={`Registrado el ${formatDate(client.createdAt)} · ${client.projects.length} ${projectLabel} · ${specCount} ${specLabel}`}
        actions={
          <>
            <Link
              href={`/proyectos/nuevo?clientId=${client.id}`}
              className="btn-secondary"
            >
              <IconPlus width={16} height={16} />
              Nuevo proyecto
            </Link>
            <Link href="/fichas/nueva" className="btn-primary">
              <IconFile width={16} height={16} />
              Nueva ficha
            </Link>
          </>
        }
      />

      {saved ? (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <IconCheck width={16} height={16} />
          Los datos del cliente se guardaron correctamente.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <FormCard
          title="Datos del cliente"
          description="La información de contacto se usa para identificar al destinatario de las fichas."
        >
          <ClientForm
            action={updateClientAction}
            values={{
              id: client.id,
              name: client.name,
              company: client.company ?? "",
              email: client.email ?? "",
              phone: client.phone ?? "",
              address: client.address ?? "",
              notes: client.notes ?? "",
            }}
            submitLabel="Guardar cambios"
            cancelHref={`/clientes/${client.id}`}
          />
        </FormCard>

        <div className="space-y-6">
          <section className="card card-pad">
            <h2 className="h-section">Resumen</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Proyectos</dt>
                <dd className="font-semibold text-slate-900">
                  {client.projects.length}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Fichas técnicas</dt>
                <dd className="font-semibold text-slate-900">{specCount}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Correo</dt>
                <dd className="truncate text-right text-slate-700">
                  {client.email ?? "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Teléfono</dt>
                <dd className="text-slate-700">{client.phone ?? "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="card card-pad border-red-100">
            <h2 className="h-section text-red-700">Eliminar cliente</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Se eliminarán también sus proyectos y todas las fichas asociadas.
              Esta acción no se puede deshacer.
            </p>
            <form action={deleteClientAction} className="mt-4">
              <input type="hidden" name="id" value={client.id} />
              <ConfirmButton
                message={`¿Eliminar a ${client.name} junto con sus proyectos y fichas?`}
                className="btn-danger w-full"
              >
                Eliminar cliente
              </ConfirmButton>
            </form>
          </section>
        </div>
      </div>

      <section className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="h-section">Proyectos del cliente</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Obras y oportunidades vinculadas
            </p>
          </div>
          <Link
            href={`/proyectos/nuevo?clientId=${client.id}`}
            className="btn-secondary btn-sm"
          >
            <IconPlus width={14} height={14} />
            Añadir
          </Link>
        </div>

        {client.projects.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <IconFolder width={24} height={24} className="text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">
              Este cliente aún no tiene proyectos
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Crea un proyecto para empezar a emitir fichas técnicas.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th>Agente</th>
                  <th>Estado</th>
                  <th>Fichas</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {client.projects.map((project) => (
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
                    <td className="text-xs">{project.agent?.name ?? "—"}</td>
                    <td>
                      <span
                        className={
                          project.status === "ADJUDICADO"
                            ? "badge badge-green"
                            : project.status === "CERRADO"
                              ? "badge badge-slate"
                              : "badge badge-blue"
                        }
                      >
                        {PROJECT_STATUS_LABEL[project.status] ?? project.status}
                      </span>
                    </td>
                    <td className="text-sm">{project._count.specs}</td>
                    <td className="text-right">
                      <Link
                        href={`/proyectos/${project.id}`}
                        className="btn-secondary btn-sm"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-6 text-[11px] text-slate-400">
        Estados de proyecto disponibles:{" "}
        {PROJECT_STATUSES.map((s) => PROJECT_STATUS_LABEL[s]).join(" · ")}
      </p>

      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="h-section">Fichas emitidas al cliente</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Historial de especificaciones de todos sus proyectos
          </p>
        </div>
        {clientSpecs.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <IconFile width={24} height={24} className="text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">
              Sin fichas emitidas
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Las fichas creadas para sus proyectos aparecerán aquí.
            </p>
          </div>
        ) : (
          <SpecsTable specs={clientSpecs} />
        )}
      </section>
    </div>
  );
}
