import Link from "next/link";
import { createProjectAction } from "@/app/actions";
import { IconArrowLeft, IconUsers } from "@/components/icons";
import { EmptyState, FormCard, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import ProjectForm from "../ProjectForm";

export const dynamic = "force-dynamic";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;

  const [clients, agents] = await Promise.all([
    prisma.client.findMany({
      select: { id: true, name: true, company: true },
      orderBy: { name: "asc" },
    }),
    prisma.salesAgent.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/proyectos"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <IconArrowLeft width={14} height={14} />
        Volver a proyectos
      </Link>
      <PageHeader
        eyebrow="Cartera comercial"
        title="Nuevo proyecto"
        subtitle="Agrupa las fichas técnicas de una obra u oportunidad comercial."
      />

      {clients.length === 0 ? (
        <EmptyState
          title="Primero registra un cliente"
          description="Todo proyecto debe pertenecer a un cliente. Crea el cliente y vuelve a intentarlo."
          icon={<IconUsers width={22} height={22} />}
          action={
            <Link href="/clientes/nuevo" className="btn-primary btn-sm">
              Nuevo cliente
            </Link>
          }
        />
      ) : (
        <FormCard>
          <ProjectForm
            action={createProjectAction}
            clients={clients}
            agents={agents}
            values={clientId ? { clientId } : {}}
            submitLabel="Crear proyecto"
            cancelHref="/proyectos"
          />
        </FormCard>
      )}
    </div>
  );
}
