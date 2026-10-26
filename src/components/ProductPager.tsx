import Link from "next/link";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { cn } from "@/lib/utils";

export type ProductNeighbor = { id: string; name: string } | null;

export default function ProductPager({
  previous,
  next,
  className,
}: {
  previous: ProductNeighbor;
  next: ProductNeighbor;
  className?: string;
}) {
  const buttonClass =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 disabled:pointer-events-none disabled:opacity-35";

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="navigation"
      aria-label="Navegación entre productos"
    >
      {previous ? (
        <Link
          href={`/productos/${previous.id}`}
          rel="prev"
          title={`Anterior: ${previous.name}`}
          aria-label={`Producto anterior: ${previous.name}`}
          className={buttonClass}
        >
          <IconChevronLeft width={16} height={16} />
        </Link>
      ) : (
        <span
          className={cn(buttonClass, "cursor-not-allowed opacity-35")}
          aria-disabled="true"
          title="No hay producto anterior"
        >
          <IconChevronLeft width={16} height={16} />
        </span>
      )}
      {next ? (
        <Link
          href={`/productos/${next.id}`}
          rel="next"
          title={`Siguiente: ${next.name}`}
          aria-label={`Producto siguiente: ${next.name}`}
          className={buttonClass}
        >
          <IconChevronRight width={16} height={16} />
        </Link>
      ) : (
        <span
          className={cn(buttonClass, "cursor-not-allowed opacity-35")}
          aria-disabled="true"
          title="No hay producto siguiente"
        >
          <IconChevronRight width={16} height={16} />
        </span>
      )}
    </div>
  );
}
