import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteSpecAction,
  duplicateSpecAction,
} from "@/app/actions";
import {
  IconArrowLeft,
  IconCopy,
  IconDownload,
  IconTrash,
} from "@/components/icons";
import { ConfirmButton } from "@/components/SubmitButton";
import SpecWorkbench from "@/components/SpecWorkbench";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { specToData } from "@/lib/specs";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SpecDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [spec, projects, agents] = await Promise.all([
    prisma.specification.findUnique({
      where: { id },
      include: {
        project: { include: { client: true } },
        agent: true,
      },
    }),
    prisma.project.findMany({
      include: { client: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.salesAgent.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!spec) notFound();

  const data = specToData(spec);

  return (
    <div>
      <Link
        href="/fichas"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <IconArrowLeft width={14} height={14} />
        Volver a fichas
      </Link>

      <PageHeader
        eyebrow={`${spec.project.client.name} · ${spec.project.name}`}
        title={spec.reference}
        subtitle={`Agente: ${spec.agent?.name ?? "sin asignar"} · Actualizada ${formatDateTime(spec.updatedAt)}`}
        actions={
          <>
            <a
              href={`/api/specs/${spec.id}/pdf?download=1`}
              className="btn-secondary"
            >
              <IconDownload width={16} height={16} />
              Descargar PDF
            </a>
            <form action={duplicateSpecAction}>
              <input type="hidden" name="id" value={spec.id} />
              <button type="submit" className="btn-secondary">
                <IconCopy width={16} height={16} />
                Duplicar
              </button>
            </form>
            <form action={deleteSpecAction}>
              <input type="hidden" name="id" value={spec.id} />
              <ConfirmButton
                message={`¿Eliminar la ficha ${spec.reference}?`}
                className="btn-danger"
              >
                <IconTrash width={16} height={16} />
                Eliminar
              </ConfirmButton>
            </form>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className={STATUS_STYLE[spec.status]}>
          {STATUS_LABEL[spec.status] ?? spec.status}
        </span>
        <span className="chip">Versión {spec.version}</span>
        <span className="chip">
          {spec.status === "EMITIDA"
            ? `Emitida: ${formatDate(spec.issuedAt)}`
            : `Creada: ${formatDate(spec.issuedAt)}`}
        </span>
        <a
          href={`/api/specs/${spec.id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost btn-sm text-brand-700"
        >
          Ver PDF guardado
        </a>
      </div>

      <SpecWorkbench
        specId={spec.id}
        initial={data}
        initialMeta={{
          projectId: spec.projectId,
          agentId: spec.agentId ?? "",
          status: spec.status,
          notes: spec.notes ?? "",
          glassName: spec.glassName,
          rawHtml: spec.rawHtml,
        }}
        projects={projects.map((project) => ({
          id: project.id,
          name: project.name,
          clientName: project.client.name,
          agentId: project.agentId,
        }))}
        agents={agents.map((agent) => ({
          id: agent.id,
          name: agent.name,
          active: agent.active,
        }))}
      />
    </div>
  );
}
