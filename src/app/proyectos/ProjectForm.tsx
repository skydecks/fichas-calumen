import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { Field } from "@/components/ui";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUSES,
} from "@/lib/types";

export type ProjectValues = {
  id?: string;
  name?: string;
  code?: string;
  location?: string;
  clientId?: string;
  agentId?: string;
  status?: string;
  notes?: string;
};

export default function ProjectForm({
  action,
  values = {},
  clients,
  agents,
  submitLabel = "Guardar proyecto",
  cancelHref = "/proyectos",
}: {
  action: (formData: FormData) => void | Promise<void>;
  values?: ProjectValues;
  clients: { id: string; name: string; company: string | null }[];
  agents: { id: string; name: string }[];
  submitLabel?: string;
  cancelHref?: string;
}) {
  return (
    <form action={action} className="space-y-5">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Nombre del proyecto *"
          htmlFor="name"
          className="sm:col-span-2"
        >
          <input
            id="name"
            name="name"
            required
            defaultValue={values.name}
            className="input"
            placeholder="Ej. Torre Corporativa Norte"
          />
        </Field>
        <Field label="Cliente *" htmlFor="clientId">
          <select
            id="clientId"
            name="clientId"
            required
            defaultValue={values.clientId ?? ""}
            className="select"
          >
            <option value="" disabled>
              Selecciona un cliente
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
                {client.company ? ` · ${client.company}` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Agente de ventas" htmlFor="agentId">
          <select
            id="agentId"
            name="agentId"
            defaultValue={values.agentId ?? ""}
            className="select"
          >
            <option value="">Sin asignar</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Código interno" htmlFor="code">
          <input
            id="code"
            name="code"
            defaultValue={values.code ?? ""}
            className="input"
            placeholder="Ej. PRY-2026-014"
          />
        </Field>
        <Field label="Ubicación" htmlFor="location">
          <input
            id="location"
            name="location"
            defaultValue={values.location ?? ""}
            className="input"
            placeholder="Ciudad, estado"
          />
        </Field>
        <Field label="Estado del proyecto" htmlFor="status">
          <select
            id="status"
            name="status"
            defaultValue={values.status ?? "PROSPECTO"}
            className="select"
          >
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PROJECT_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notas" htmlFor="notes" className="sm:col-span-2">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={values.notes ?? ""}
            className="textarea"
            placeholder="Alcance, condiciones o requerimientos del proyecto"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <Link href={cancelHref} className="btn-ghost">
          Cancelar
        </Link>
        <SubmitButton className="btn-primary">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
