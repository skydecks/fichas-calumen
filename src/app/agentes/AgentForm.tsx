import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { Field } from "@/components/ui";

export type AgentValues = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  region?: string;
  active?: boolean;
};

export default function AgentForm({
  action,
  values = {},
  submitLabel = "Guardar agente",
  cancelHref = "/agentes",
}: {
  action: (formData: FormData) => void | Promise<void>;
  values?: AgentValues;
  submitLabel?: string;
  cancelHref?: string;
}) {
  return (
    <form action={action} className="space-y-5">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombre completo *" htmlFor="name">
          <input
            id="name"
            name="name"
            required
            defaultValue={values.name}
            className="input"
            placeholder="Ej. Carlos Ramírez"
          />
        </Field>
        <Field label="Zona o región" htmlFor="region">
          <input
            id="region"
            name="region"
            defaultValue={values.region ?? ""}
            className="input"
            placeholder="Ej. Bajío / CDMX"
          />
        </Field>
        <Field label="Correo electrónico" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={values.email ?? ""}
            className="input"
            placeholder="agente@ceyco.com"
          />
        </Field>
        <Field label="Teléfono" htmlFor="phone">
          <input
            id="phone"
            name="phone"
            defaultValue={values.phone ?? ""}
            className="input"
            placeholder="Ej. +52 55 1234 5678"
          />
        </Field>
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
        <input
          type="checkbox"
          name="active"
          defaultChecked={values.active ?? true}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-600"
        />
        <span>
          <span className="block text-sm font-semibold text-slate-800">
            Agente activo
          </span>
          <span className="block text-xs text-slate-500">
            Los agentes inactivos no aparecen en el selector al crear proyectos o
            fichas.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <Link href={cancelHref} className="btn-ghost">
          Cancelar
        </Link>
        <SubmitButton className="btn-primary">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
