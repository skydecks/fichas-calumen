import Link from "next/link";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Edit,
  ExternalLink,
  FileCode,
  FileText,
  HardDrive,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  getKnowledgeDocument,
  listKnowledgeDocuments,
} from "@/lib/ai-knowledge";
import { AiMarkdown } from "@/lib/ai-markdown";
import { PageHeader, EmptyState } from "@/components/ui";
import { SpectrumButton } from "@/components/spectrum/button";
import { SpectrumCard } from "@/components/spectrum/card";
import { ConfirmButton } from "@/components/SubmitButton";
import { deleteKnowledgeArticleAction } from "@/app/actions";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; doc?: string; eliminado?: string }>;
}) {
  const { q, doc, eliminado } = await searchParams;
  const allDocs = listKnowledgeDocuments();
  const query = (q ?? "").trim().toLowerCase();

  const filteredDocs = query
    ? allDocs.filter(
        (d) =>
          d.title.toLowerCase().includes(query) ||
          d.file.toLowerCase().includes(query) ||
          (d.subtitle && d.subtitle.toLowerCase().includes(query)),
      )
    : allDocs;

  // Documento activo para lectura rápida en la parte inferior
  const activeDocId = doc ? doc.trim() : (allDocs[0]?.file ?? "");
  let activeContent = "";
  let activeMeta = allDocs.find(
    (d) => d.file === activeDocId || d.id === activeDocId,
  ) ?? allDocs[0];

  if (activeMeta) {
    try {
      activeContent = getKnowledgeDocument(activeMeta.file);
    } catch {
      activeContent = "# No se pudo cargar el documento seleccionado.";
    }
  }

  const totalSizeKb = (
    allDocs.reduce((acc, curr) => acc + curr.size, 0) / 1024
  ).toFixed(1);

  return (
    <div className="space-y-8">
      {/* Alerta de notificación */}
      {eliminado ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-600" />
          Artículo eliminado de la base de conocimiento.
        </div>
      ) : null}

      {/* Encabezado principal */}
      <PageHeader
        eyebrow="Base de conocimiento"
        title="Artículos Técnicos y Normas (.md)"
        subtitle="Repositorio central de documentos normativos, especificaciones y guías en Markdown. Indexados automáticamente en el Asistente IA de CEYCO."
        actions={
          <SpectrumButton
            href="/conocimiento/nuevo"
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Nuevo artículo (.md)
          </SpectrumButton>
        }
      />

      {/* Tarjetas de estadísticas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SpectrumCard padding="sm" className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Artículos .md
            </p>
            <p className="text-xl font-bold tracking-tight text-slate-900">
              {allDocs.length}
            </p>
          </div>
        </SpectrumCard>

        <SpectrumCard padding="sm" className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Norma Base
            </p>
            <p className="text-xs font-medium text-slate-900 truncate max-w-[150px]">
              NOM-146-SCFI-2016
            </p>
          </div>
        </SpectrumCard>

        <SpectrumCard padding="sm" className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Tamaño Total
            </p>
            <p className="text-xl font-bold tracking-tight text-slate-900">
              {totalSizeKb} <span className="text-xs font-normal text-slate-500">KB</span>
            </p>
          </div>
        </SpectrumCard>

        <SpectrumCard padding="sm" className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Índice IA
            </p>
            <p className="text-xs font-semibold text-purple-700">
              Sincronizado al 100%
            </p>
          </div>
        </SpectrumCard>
      </div>

      {/* Buscador */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <form method="GET" action="/conocimiento" className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por título, norma o archivo .md..."
            className="input pl-9 text-xs"
          />
        </form>
        {query ? (
          <Link
            href="/conocimiento"
            className="text-xs text-brand-600 hover:text-brand-800 self-center"
          >
            Limpiar búsqueda
          </Link>
        ) : null}
      </div>

      {/* Grid de Artículos */}
      {filteredDocs.length === 0 ? (
        <EmptyState
          title="No se encontraron artículos"
          description={`No hay ningún documento que coincida con "${query}".`}
          action={
            <SpectrumButton href="/conocimiento/nuevo" variant="primary">
              Crear artículo nuevo
            </SpectrumButton>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocs.map((docItem) => {
            const isSelected = activeMeta?.file === docItem.file;
            const sizeKb = (docItem.size / 1024).toFixed(1);

            return (
              <div
                key={docItem.file}
                className={`relative flex flex-col justify-between rounded-xl border bg-white p-5 transition shadow-xs hover:shadow-md ${
                  isSelected
                    ? "border-brand-500 ring-2 ring-brand-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    {docItem.isDefault ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        <ShieldCheck className="h-3 w-3" />
                        Norma Oficial
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        <FileCode className="h-3 w-3 text-slate-500" />
                        Artículo .md
                      </span>
                    )}

                    <span className="text-[11px] font-mono text-slate-400">
                      {sizeKb} KB
                    </span>
                  </div>

                  <h3 className="line-clamp-2 text-sm font-semibold tracking-tight text-slate-900 group-hover:text-brand-600">
                    <Link
                      href={`/conocimiento/${encodeURIComponent(docItem.id)}`}
                      className="hover:underline"
                    >
                      {docItem.title}
                    </Link>
                  </h3>

                  {docItem.subtitle ? (
                    <p className="mt-1.5 line-clamp-2 text-xs text-slate-500 leading-relaxed">
                      {docItem.subtitle}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="mb-3 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="truncate max-w-[170px]" title={docItem.file}>
                      {docItem.file}
                    </span>
                    <span>{formatDate(docItem.updatedAt)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-1">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/conocimiento/${encodeURIComponent(docItem.id)}`}
                        className="btn-secondary text-xs px-2.5 py-1"
                      >
                        Leer
                      </Link>

                      <Link
                        href={`/conocimiento/${encodeURIComponent(docItem.id)}/editar`}
                        className="btn-ghost text-xs p-1 text-slate-500 hover:text-slate-800"
                        title="Editar artículo"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Link>

                      <Link
                        href={`/knowledge/${docItem.file}`}
                        target="_blank"
                        className="btn-ghost text-xs p-1 text-slate-500 hover:text-slate-800"
                        title="Ver archivo .md crudo"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    {!docItem.isDefault ? (
                      <form action={deleteKnowledgeArticleAction} className="inline">
                        <input type="hidden" name="fileName" value={docItem.file} />
                        <ConfirmButton
                          message={`¿Deseas eliminar el artículo "${docItem.title}"?`}
                          className="btn-ghost text-xs p-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar artículo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </ConfirmButton>
                      </form>
                    ) : (
                      <span
                        className="text-[11px] font-medium text-slate-400"
                        title="Documento protegido por el sistema"
                      >
                        Protegido
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visor Rápido Integrado del Documento Activo */}
      {activeMeta ? (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">
                Lectura Rápida
              </p>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                {activeMeta.title}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/conocimiento/${encodeURIComponent(activeMeta.id)}`}
                className="btn-secondary text-xs inline-flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                Abrir en página completa
              </Link>
              <Link
                href={`/conocimiento/${encodeURIComponent(activeMeta.id)}/editar`}
                className="btn-secondary text-xs inline-flex items-center gap-1.5"
              >
                <Edit className="h-3.5 w-3.5" />
                Editar
              </Link>
            </div>
          </div>

          <SpectrumCard padding="md">
            <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
              <span className="badge badge-blue">{activeMeta.file}</span>
              <span className="chip">Actualizado: {formatDate(activeMeta.updatedAt)}</span>
              <span className="chip">{(activeMeta.size / 1024).toFixed(1)} KB</span>
            </div>
            <div className="prose prose-slate max-w-none">
              <AiMarkdown
                content={activeContent}
                className="text-[12px] text-slate-600 leading-relaxed"
              />
            </div>
          </SpectrumCard>
        </div>
      ) : null}
    </div>
  );
}
