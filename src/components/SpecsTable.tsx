import Link from "next/link";
import { deleteSpecAction, updateSpecStatusAction } from "@/app/actions";
import { IconDownload, IconTrash } from "@/components/icons";
import { ConfirmButton } from "@/components/SubmitButton";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export type SpecTableRow = {
  id: string;
  reference: string;
  status: string;
  version: number;
  issuedAt: Date;
  updatedAt: Date;
  project: { id: string; name: string; client: { name: string } };
  agent: { name: string } | null;
};

export default function SpecsTable({
  specs,
  showProject = true,
}: {
  specs: SpecTableRow[];
  showProject?: boolean;
}) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Referencia</th>
            {showProject ? <th>Proyecto / cliente</th> : null}
            <th>Agente</th>
            <th>Estado</th>
            <th>Versión</th>
            <th>Emitida</th>
            <th className="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {specs.map((spec) => (
            <tr key={spec.id}>
              <td>
                <Link
                  href={`/fichas/${spec.id}`}
                  className="font-semibold text-slate-900 hover:text-brand-600"
                >
                  {spec.reference}
                </Link>
                <p className="text-[11px] text-slate-500">
                  Actualizada {formatDate(spec.updatedAt)}
                </p>
              </td>
              {showProject ? (
                <td className="text-xs">
                  <Link
                    href={`/proyectos/${spec.project.id}`}
                    className="font-medium text-slate-700 hover:text-brand-600"
                  >
                    {spec.project.name}
                  </Link>
                  <p className="text-[11px] text-slate-500">
                    {spec.project.client.name}
                  </p>
                </td>
              ) : null}
              <td className="text-xs">{spec.agent?.name ?? "—"}</td>
              <td>
                <span className={STATUS_STYLE[spec.status]}>
                  {STATUS_LABEL[spec.status] ?? spec.status}
                </span>
              </td>
              <td className="text-xs text-slate-500">v{spec.version}</td>
              <td className="text-xs text-slate-500">
                {spec.status === "EMITIDA" ? formatDate(spec.issuedAt) : "—"}
              </td>
              <td>
                <div className="flex items-center justify-end gap-1.5">
                  <Link
                    href={`/fichas/${spec.id}`}
                    className="btn-secondary btn-sm"
                  >
                    Editar
                  </Link>
                  <a
                    href={`/api/specs/${spec.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost btn-sm"
                    title="Ver PDF"
                  >
                    <IconDownload width={14} height={14} />
                    PDF
                  </a>
                  {spec.status !== "EMITIDA" ? (
                    <form action={updateSpecStatusAction}>
                      <input type="hidden" name="id" value={spec.id} />
                      <input type="hidden" name="status" value="EMITIDA" />
                      <button
                        type="submit"
                        className="btn-ghost btn-sm text-emerald-700 hover:bg-emerald-50"
                        title="Marcar como emitida"
                      >
                        Emitir
                      </button>
                    </form>
                  ) : null}
                  <form action={deleteSpecAction}>
                    <input type="hidden" name="id" value={spec.id} />
                    <ConfirmButton
                      message={`¿Eliminar la ficha ${spec.reference}?`}
                      title="Eliminar ficha"
                      className="icon-btn text-slate-400 hover:border-red-200 hover:text-red-600"
                    >
                      <IconTrash width={14} height={14} />
                    </ConfirmButton>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
