import Link from "next/link";
import { IconArrowLeft } from "@/components/icons";
import { FormCard, PageHeader } from "@/components/ui";
import { createClientAction } from "@/app/actions";
import ClientForm from "../ClientForm";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/clientes"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <IconArrowLeft width={14} height={14} />
        Volver a clientes
      </Link>
      <PageHeader
        eyebrow="Cartera comercial"
        title="Nuevo cliente"
        subtitle="Registra la empresa y el contacto principal para vincular proyectos y fichas."
      />
      <FormCard>
        <ClientForm
          action={createClientAction}
          submitLabel="Crear cliente"
          cancelHref="/clientes"
        />
      </FormCard>
    </div>
  );
}
