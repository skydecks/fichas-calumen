import { GlassCompositionDiagram } from "@/components/GlassCompositionDiagram";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { deleteProductAction } from "@/app/actions";
import { ConfirmButton } from "@/components/SubmitButton";
import { IconArrowLeft, IconSparkles, IconTrash } from "@/components/icons";
import ProductEditor from "@/components/ProductEditor";
import ProductPager from "@/components/ProductPager";
import { PageHeader } from "@/components/ui";
import { glassLayerBars, layerLabel } from "@/lib/calumen";
import { prisma } from "@/lib/db";
import { productToProfile } from "@/lib/products";
import { colorForLayer } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();

  const [previous, next] = await Promise.all([
    prisma.product.findFirst({
      where: {
        OR: [
          { updatedAt: { gt: product.updatedAt } },
          { updatedAt: product.updatedAt, id: { gt: product.id } },
        ],
      },
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.product.findFirst({
      where: {
        OR: [
          { updatedAt: { lt: product.updatedAt } },
          { updatedAt: product.updatedAt, id: { lt: product.id } },
        ],
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: { id: true, name: true },
    }),
  ]);

  const record = productToProfile(product);
  const bars = glassLayerBars(record.layers, { minWidth: 2 });

  return (
    <div>
      <Link
        href="/productos"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <IconArrowLeft width={14} height={14} />
        Volver a productos
      </Link>

      <PageHeader
        eyebrow={`${record.category || "Producto"} · ${record.manufacturer || "Catálogo"}`}
        title={record.name}
        subtitle={`${record.code || "Sin código"} · Actualizado ${formatDateTime(record.updatedAt)}`}
        actions={
          <>
            <ProductPager previous={previous} next={next} />
            <Link
              href={`/asistente?productId=${product.id}`}
              className="btn-secondary"
            >
              <IconSparkles width={16} height={16} />
              Consultar con IA
            </Link>
            <Link
              href={`/conocimiento/nuevo?from=product&id=${product.id}`}
              className="btn-secondary"
              title="Crear guía técnica en Markdown a partir de este producto"
            >
              <BookOpen className="h-4 w-4" />
              Documentar en Conocimiento
            </Link>
            <form action={deleteProductAction}>
              <input type="hidden" name="id" value={product.id} />
              <ConfirmButton
                message={`¿Eliminar el producto ${record.name} del catálogo?`}
                title="Eliminar producto"
                className="btn-danger"
              >
                <IconTrash width={16} height={16} />
                Eliminar
              </ConfirmButton>
            </form>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="card card-pad">
          <h2 className="h-section mb-4">Datos del producto</h2>
          <ProductEditor product={record} />
        </section>

        <div className="space-y-4">
          <section className="card card-pad">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="h-section">Composición</h2>
              <span className="chip">{record.layers.length} capas</span>
            </div>
            <GlassCompositionDiagram
              layers={record.layers}
              interactive={false}
              showSummary={true}
            />
          </section>

          <section className="card card-pad">
            <h2 className="h-section">Valores y prestaciones</h2>
            <div className="mt-3 space-y-3">
              {record.sections.length === 0 ? (
                <p className="text-xs text-slate-400">Sin prestaciones.</p>
              ) : (
                record.sections.map((section) => (
                  <div key={section.id}>
                    <p className="text-xs font-semibold text-slate-800">
                      {section.title}
                      {section.standard ? (
                        <span className="ml-2 text-[10px] font-normal text-slate-400">
                          {section.standard}
                        </span>
                      ) : null}
                    </p>
                    <div className="mt-1 space-y-0.5 text-[11px] text-slate-600">
                      {section.rows
                        .filter((row) => row.value)
                        .map((row) => (
                          <p key={row.id} className="flex justify-between gap-2">
                            <span>{row.label}</span>
                            <strong>{row.value}</strong>
                          </p>
                        ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="card card-pad">
            <h2 className="h-section">Representación de colores</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(record.colors).map(([key, value]) => (
                <span
                  key={key}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-[10px] text-slate-600"
                >
                  <span
                    className="h-3 w-3 rounded-full border"
                    style={{ backgroundColor: value, borderColor: value }}
                  />
                  {key}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-slate-400">
              Se aplican al seleccionar este producto en una ficha y al generar
              su PDF.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
