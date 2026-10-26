import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { Field } from "@/components/ui";

export type ClientValues = {
  id?: string;
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
};

export default function ClientForm({
  action,
  values = {},
  submitLabel = "Guardar cliente",
  cancelHref = "/clientes",
}: {
  action: (formData: FormData) => void | Promise<void>;
  values?: ClientValues;
  submitLabel?: string;
  cancelHref?: string;
}) {
  return (
    <form action={action} className="space-y-5">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Nombre del contacto *"
          htmlFor="name"
          className="sm:col-span-1"
        >
          <input
            id="name"
            name="name"
            required
            defaultValue={values.name}
            className="input"
            placeholder="Ej. Laura Méndez"
          />
        </Field>
        <Field label="Empresa" htmlFor="company">
          <input
            id="company"
            name="company"
            defaultValue={values.company ?? ""}
            className="input"
            placeholder="Ej. Constructora del Bajío"
          />
        </Field>
        <Field label="Correo electrónico" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={values.email ?? ""}
            className="input"
            placeholder="contacto@empresa.com"
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
        <Field label="Dirección" htmlFor="address" className="sm:col-span-2">
          <input
            id="address"
            name="address"
            defaultValue={values.address ?? ""}
            className="input"
            placeholder="Calle, número, ciudad, estado"
          />
        </Field>
        <Field label="Notas" htmlFor="notes" className="sm:col-span-2">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={values.notes ?? ""}
            className="textarea"
            placeholder="Condiciones comerciales, preferencias de contacto, etc."
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
