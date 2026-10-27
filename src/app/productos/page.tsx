import Link from "next/link";
import { IconSparkles } from "@/components/icons";
import ProductImport from "@/components/ProductImport";
import ProductTable from "@/components/ProductTable";
import { SpectrumCard } from "@/components/spectrum/card";
import { SpectrumPageHeader } from "@/components/spectrum/page-header";
import { prisma } from "@/lib/db";
import { productToProfile } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, total, active] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    }),
    prisma.product.count(),
    prisma.product.count({ where: { active: true } }),
  ]);

  const records = products.map(productToProfile);

  return (
    <div>
      <SpectrumPageHeader
        eyebrow="Catálogo comercial"
        title="Productos"
        subtitle="Sube la ficha técnica de cada producto. La IA extrae su composición y prestaciones para usarlas en fichas y predicciones."
        actions={
          <>
            <Link href="/asistente" className="btn-secondary hidden sm:inline-flex">
              <IconSparkles width={16} height={16} />
              Consultar IA
            </Link>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SpectrumCard padding="sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Productos
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{total}</p>
        </SpectrumCard>
        <SpectrumCard padding="sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Activos
          </p>
          <p className="mt-1 text-2xl font-semibold text-brand-600">{active}</p>
        </SpectrumCard>
        <SpectrumCard padding="sm" className="hidden sm:block">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Fuente
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Fichas técnicas en PDF o imágenes procesadas con IA.
          </p>
        </SpectrumCard>
      </div>

      <div className="mb-5">
        <ProductImport />
      </div>

      <ProductTable products={records} />
    </div>
  );
}
