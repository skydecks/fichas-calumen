"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { deleteProductAction } from "@/app/actions";
import { ConfirmButton } from "@/components/SubmitButton";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/spectrumui/data-table";
import {
  IconPackage,
  IconSearch,
  IconSparkles,
  IconTrash,
} from "@/components/icons";
import { layerLabel } from "@/lib/calumen";
import type { ProductRecord } from "@/lib/products";
import { colorForLayer } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const compositionOf = (product: ProductRecord) =>
  product.layers.map(layerLabel).join(" + ") || "Sin composición";

const columns: DataTableColumn<ProductRecord>[] = [
  {
    id: "name",
    header: "Producto",
    sortable: true,
    width: 300,
    value: (product) => product.name,
    cell: (product) => (
      <span className="block min-w-0">
        <Link
          href={`/productos/${product.id}`}
          className="block truncate font-medium text-slate-900 hover:text-brand-600"
        >
          {product.name}
        </Link>
        <span className="mt-0.5 block truncate text-[11px] font-normal text-slate-500">
          {product.code || "Sin código"}
          {product.manufacturer ? ` · ${product.manufacturer}` : ""}
        </span>
      </span>
    ),
  },
  {
    id: "category",
    header: "Categoría",
    sortable: true,
    width: 112,
    value: (product) => product.category,
    cell: (product) =>
      product.category ? (
        <span className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 ring-1 ring-inset ring-brand-600/15">
          {product.category}
        </span>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    id: "composition",
    header: "Composición",
    width: 260,
    value: (product) => compositionOf(product),
    cell: (product) => (
      <span className="block max-w-[250px] text-xs leading-relaxed text-slate-600">
        <span className="line-clamp-2">{compositionOf(product)}</span>
        <span className="mt-0.5 block text-[10px] text-slate-400">
          {product.layers.length} {product.layers.length === 1 ? "capa" : "capas"}
        </span>
      </span>
    ),
  },
  {
    id: "updatedAt",
    header: "Actualizado",
    sortable: true,
    width: 104,
    value: (product) => product.updatedAt ?? "",
    hideBelow: "sm",
    cell: (product) => (
      <span className="whitespace-nowrap text-xs text-slate-500">
        {product.updatedAt ? formatDate(product.updatedAt) : "—"}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Acciones",
    align: "end",
    width: 180,
    cell: (product) => <ProductActions product={product} />,
  },
];

function ProductActions({ product }: { product: ProductRecord }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Link
        href={`/productos/${product.id}`}
        className="btn-secondary btn-sm whitespace-nowrap"
      >
        Editar
      </Link>
      <Link
        href={`/asistente?productId=${product.id}`}
        className="btn-ghost btn-sm px-2 text-brand-700"
        title="Consultar con IA"
        aria-label={`Consultar ${product.name} con IA`}
      >
        <IconSparkles width={14} height={14} />
        <span className="sr-only">IA</span>
      </Link>
      <form action={deleteProductAction}>
        <input type="hidden" name="id" value={product.id} />
        <ConfirmButton
          message={`¿Eliminar el producto ${product.name} del catálogo?`}
          title="Eliminar producto"
          className="icon-btn text-slate-400 hover:border-red-200 hover:text-red-600"
        >
          <IconTrash width={14} height={14} />
        </ConfirmButton>
      </form>
    </div>
  );
}

function MobileProductCard({ product }: { product: ProductRecord }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/productos/${product.id}`}
            className="block truncate text-sm font-semibold text-slate-900 hover:text-brand-600 dark:text-slate-100"
          >
            {product.name}
          </Link>
          <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
            {product.code || "Sin código"}
            {product.manufacturer ? ` · ${product.manufacturer}` : ""}
          </p>
        </div>
        {product.category ? (
          <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700 ring-1 ring-inset ring-brand-600/15 dark:bg-brand-600/15 dark:text-brand-200">
            {product.category}
          </span>
        ) : null}
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        {compositionOf(product)}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] text-slate-400">
          {product.layers.length} {product.layers.length === 1 ? "capa" : "capas"}
          {product.updatedAt ? ` · ${formatDate(product.updatedAt)}` : ""}
        </span>
        <ProductActions product={product} />
      </div>
    </article>
  );
}

function ProductDetail({ product }: { product: ProductRecord }) {
  const values = Object.entries(product.keyValues);

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Composición
        </p>
        {product.layers.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {product.layers.map((layer, index) => (
              <li key={`${index}-${layer.material}`} className="flex items-center gap-2 text-xs">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm border"
                  style={{
                    backgroundColor: colorForLayer(layer),
                    borderColor: colorForLayer(layer),
                  }}
                />
                <span className="text-slate-700">{layerLabel(layer)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-slate-400">Sin capas detectadas.</p>
        )}
        {product.description ? (
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            {product.description}
          </p>
        ) : null}
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Valores y prestaciones
        </p>
        {values.length > 0 ? (
          <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
            {values.slice(0, 10).map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right font-medium text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-2 text-xs text-slate-400">Sin valores capturados.</p>
        )}
        {product.sourceName ? (
          <p className="mt-3 truncate text-[10px] text-slate-400">
            Fuente: {product.sourceName}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function ProductTable({ products }: { products: ProductRecord[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const categories = useMemo(
    () => [
      "Todas",
      ...Array.from(
        new Set(products.map((product) => product.category).filter(Boolean)),
      ),
    ],
    [products],
  );
  const mobileProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory =
        category === "Todas" || product.category === category;
      if (!matchesCategory) return false;
      if (!needle) return true;
      return [
        product.name,
        product.code,
        product.category,
        product.manufacturer,
        compositionOf(product),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [products, query, category]);

  const emptyState: ReactNode = (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
        <IconPackage width={20} height={20} />
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-900">
        El catálogo está vacío
      </p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
        Sube la ficha técnica de tu primer producto para empezar a usar la tabla
        del catálogo.
      </p>
      <Link href="#producto-upload" className="btn-primary btn-sm mt-4">
        Agregar producto
      </Link>
    </div>
  );

  return (
    <div id="producto-upload">
      <div className="space-y-3 md:hidden">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Catálogo de productos
            </p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {mobileProducts.length} de {products.length}
            </span>
          </div>
          <div className="relative mt-2">
            <IconSearch
              width={15}
              height={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input h-9 pl-9 text-xs"
              placeholder="Buscar producto, código o categoría…"
              aria-label="Buscar productos"
            />
          </div>
          <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
            {categories.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCategory(option)}
                className={
                  category === option
                    ? "shrink-0 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white dark:bg-slate-100 dark:text-slate-900"
                    : "shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        {mobileProducts.length > 0 ? (
          <div className="space-y-2">
            {mobileProducts.map((product) => (
              <MobileProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Sin resultados
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Prueba con otro término o cambia la categoría.
            </p>
          </div>
        )}
      </div>

      <div className="hidden md:block">
      <DataTable
        data={products}
        columns={columns}
        rowId={(product) => product.id}
        rowLabel={(product) => `producto ${product.name}`}
        caption="Catálogo de productos con categoría, fabricante, composición, valores clave y acciones."
        variant="default"
        density="compact"
        className="product-catalog-table"
        title="Catálogo de productos"
        searchable
        searchPlaceholder="Buscar producto, código, categoría o fabricante…"
        quickFilter={{
          columnId: "category",
          label: "Filtrar por categoría",
          allLabel: "Todas",
        }}
        defaultSort={{ columnId: "updatedAt", direction: "desc" }}
        toolbar={
          <span className="text-xs text-slate-500">
            {products.length} {products.length === 1 ? "producto" : "productos"}
          </span>
        }
        
        renderDetail={(product) => <ProductDetail product={product} />}
        emptyState={emptyState}
      />
      </div>
    </div>
  );
}
