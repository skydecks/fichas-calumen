import Link from "next/link";
import { IconFile, IconPlus, IconSearch } from "@/components/icons";
import SpecsTable from "@/components/SpecsTable";
import { EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { SPEC_STATUSES, STATUS_LABEL, STATUS_STYLE } from "@/lib/types";
import { SpectrumButton } from "@/components/spectrum/button";
import { SpectrumCard } from "@/components/spectrum/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SpecsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const query = (q ?? "").trim();
  const statusFilter =
    status && (SPEC_STATUSES as string[]).includes(status) ? status : undefined;

  const [specs, grouped] = await Promise.all([
    prisma.specification.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(query
          ? {
              OR: [
                { reference: { contains: query } },
                { project: { name: { contains: query } } },
                { project: { client: { name: { contains: query } } } },
              ],
            }
          : {}),
      },
      include: {
        project: { include: { client: true } },
        agent: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.specification.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const counts = grouped.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = item._count._all;
    return acc;
  }, {});
  const total = Object.values(counts).reduce((acc, value) => acc + value, 0);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
            Documentos emitidos
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Fichas técnicas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Historial completo de especificaciones, con su cliente, proyecto,
            agente y estado de emisión.
          </p>
        </div>
        <SpectrumButton
          href="/fichas/nueva"
          variant="primary"
          leftIcon={<IconPlus width={16} height={16} />}
        >
          Nueva ficha
        </SpectrumButton>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <span className={cn("chip bg-white")}>
          Todas: <strong className="ml-1 text-slate-900">{total}</strong>
        </span>
        {SPEC_STATUSES.map((value) => (
          <span key={value} className={STATUS_STYLE[value]}>
            {STATUS_LABEL[value]}: {counts[value] ?? 0}
          </span>
        ))}
      </div>

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/fichas">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <IconSearch
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            name="q"
            defaultValue={query}
            className="input pl-9"
            placeholder="Buscar por referencia, proyecto o cliente"
          />
        </div>
        <select name="status" defaultValue={statusFilter ?? ""} className="select w-auto">
          <option value="">Todos los estados</option>
          {SPEC_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABEL[value]}
            </option>
          ))}
        </select>
        <SpectrumButton type="submit" variant="secondary" size="sm">
          Filtrar
        </SpectrumButton>
        {query || statusFilter ? (
          <Link href="/fichas" className="btn-ghost btn-sm">
            Limpiar
          </Link>
        ) : null}
        <span className="ml-auto text-xs text-slate-500">
          {specs.length} {specs.length === 1 ? "ficha" : "fichas"}
        </span>
      </form>

      {specs.length === 0 ? (
        <EmptyState
          title={query || statusFilter ? "Sin resultados" : "Todavía no hay fichas"}
          description={
            query || statusFilter
              ? "Ajusta los filtros para encontrar la ficha."
              : "Pega los datos de Calumen y genera tu primera ficha técnica en minutos."
          }
          icon={<IconFile width={22} height={22} />}
          action={
            <SpectrumButton
              href="/fichas/nueva"
              variant="primary"
              size="sm"
              leftIcon={<IconPlus width={14} height={14} />}
            >
              Nueva ficha
            </SpectrumButton>
          }
        />
      ) : (
        <SpectrumCard padding="none">
          <div className="overflow-hidden">
            <SpecsTable specs={specs} />
          </div>
        </SpectrumCard>
      )}
    </div>
  );
}
