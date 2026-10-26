import Link from "next/link";
import { IconArrowLeft } from "@/components/icons";
import { FormCard, PageHeader } from "@/components/ui";
import { createAgentAction } from "@/app/actions";
import AgentForm from "../AgentForm";

export default function NewAgentPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/agentes"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <IconArrowLeft width={14} height={14} />
        Volver a agentes
      </Link>
      <PageHeader
        eyebrow="Equipo comercial"
        title="Nuevo agente de ventas"
        subtitle="Asigna un responsable a los proyectos y fichas que se emitan."
      />
      <FormCard>
        <AgentForm
          action={createAgentAction}
          submitLabel="Crear agente"
          cancelHref="/agentes"
        />
      </FormCard>
    </div>
  );
}
