import Link from "next/link";
import { IconArrowLeft, IconFolder } from "@/components/icons";
import SpecWorkbench from "@/components/SpecWorkbench";
import { EmptyState, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { emptyData } from "@/lib/types";
import { toDateInput } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewSpecPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { projectId } = await searchParams;

  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));

  const [projects, agents, specsThisYear] = await Promise.all([
    prisma.project.findMany({
      include: { client: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.salesAgent.findMany({ orderBy: { name: "asc" } }),
    prisma.specification.count({
      where: { createdAt: { gte: startOfYear } },
    }),
  ]);

  const projectOptions = projects.map((project) => ({
    id: project.id,
    name: project.name,
    clientName: project.client.name,
    agentId: project.agentId,
  }));

  const preselected = projects.find((project) => project.id === projectId);

  const initial = {
    ...emptyData(),
    reference: `FT-${year}-${String(specsThisYear + 1).padStart(3, "0")}`,
    calculatedBy: "Soporte Técnico CEYCO",
    calculatedAt: toDateInput(now),
    catalog: "México",
    standard: "NFRC",
  };

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
        eyebrow="Generador de fichas"
        title="Nueva ficha técnica"
        subtitle="Pega el HTML de Calumen, revisa los valores y genera el PDF con el formato oficial."
      />

      {projects.length === 0 ? (
        <EmptyState
          title="Necesitas un proyecto antes de emitir"
          description="Toda ficha se asocia a un proyecto y a su cliente. Crea el proyecto y vuelve a esta pantalla."
          icon={<IconFolder width={22} height={22} />}
          action={
            <Link href="/proyectos/nuevo" className="btn-primary btn-sm">
              Nuevo proyecto
            </Link>
          }
        />
      ) : (
        <SpecWorkbench
          initial={initial}
          initialMeta={{
            projectId: preselected?.id ?? "",
            agentId: preselected?.agentId ?? "",
            status: "BORRADOR",
            notes: "",
            glassName: "",
            rawHtml: null,
          }}
          projects={projectOptions}
          agents={agents.map((agent) => ({
            id: agent.id,
            name: agent.name,
            active: agent.active,
          }))}
        />
      )}
    </div>
  );
}
