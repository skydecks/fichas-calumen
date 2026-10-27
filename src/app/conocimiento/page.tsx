import Link from "next/link";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Download,
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
  GLASS_FAMILIES,
  KNOWLEDGE_CATEGORIES,
  getKnowledgeDocument,
  listKnowledgeDocuments,
  parseFrontmatter,
} from "@/lib/ai-knowledge";
import { AiMarkdown } from "@/lib/ai-markdown";
import { PageHeader, EmptyState } from "@/components/ui";
import { SpectrumButton } from "@/components/spectrum/button";
import { SpectrumCard } from "@/components/spectrum/card";
import { ConfirmButton } from "@/components/SubmitButton";
import { deleteKnowledgeArticleAction } from "@/app/actions";
import { formatDate } from "@/lib/utils";
import { KnowledgeUploadButton } from "@/components/KnowledgeUploadButton";

export const dynamic = "force-dynamic";

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    cat?: string;
    fam?: string;
    doc?: string;
    eliminado?: string;
  }>;
}) {
  const { q, cat, fam, doc, eliminado } = await searchParams;
  const allDocs = listKnowledgeDocuments();

  const query = (q ?? "").trim().toLowerCase();
  const selectedCat = cat ? cat.trim() : "";
  const selectedFam = fam ? fam.trim() : "";

  // Filtro Híbrido: texto, categoría y familia de vidrio
  const filteredDocs = allDocs.filter((d) => {
    if (selectedCat && d.category !== selectedCat) return false;
    if (selectedFam && !d.families.includes(selectedFam)) return false;

    if (!query) return true;

    const inTitle = d.title.toLowerCase().includes(query);
    const inSubtitle = d.subtitle?.toLowerCase().includes(query) ?? false;
    const inFile = d.file.toLowerCase().includes(query);
    const inFamilies = d.families.some((f) => f.toLowerCase().includes(query));
    const inStandards = d.standards.some((s) => s.toLowerCase().includes(query));

    return inTitle || inSubtitle || inFile || inFamilies || inStandards;
  });

  // Documento activo para lectura rápida (solo desktop)
  const activeDocId = doc ? doc.trim() : (filteredDocs[0]?.file ?? allDocs[0]?.file ?? "");
  let activeContent = "";
  let activeMeta =
    allDocs.find((d) => d.file === activeDocId || d.id === activeDocId) ??
    filteredDocs[0] ??
    allDocs[0];

  if (activeMeta) {
    try {
      const raw = getKnowledgeDocument(activeMeta.file);
      const parsed = parseFrontmatter(raw);
      activeContent = parsed.body;
    } catch {
      activeContent = "# No se pudo cargar el documento seleccionado.";
    }
  }

  const totalSizeKb = (
    allDocs.reduce((acc, curr) => acc + curr.size, 0) / 1024
  ).toFixed(1);

  return (
    <div className="space-y-5 sm:space-y-8">
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
        title="Artículos Técnicos y Normas"
        subtitle="Repositorio central de documentos normativos, especificaciones y manuales en Markdown."
        actions={
          <div className="flex items-center gap-2">
            <KnowledgeUploadButton className="btn-secondary text-xs sm:text-sm" />
            <SpectrumButton
              href="/conocimiento/nuevo"
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Nuevo artículo
            </SpectrumButton>
          </div>
        }
      />

      {/* Tarjetas de estadísticas (Ocultas en móvil para máxima limpieza) */}
      <div className="hidden sm:grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              Sincronizado
            </p>
          </div>
        </SpectrumCard>
      </div>

      {/* Barra de Filtros y Buscador */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Categorías (Scroll horizontal limpio en móvil) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0">
            <Link
              href={`/conocimiento${query ? `?q=${encodeURIComponent(query)}` : ""}`}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                !selectedCat
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todas ({allDocs.length})
            </Link>
            {KNOWLEDGE_CATEGORIES.map((category) => {
              const active = selectedCat === category;
              const count = allDocs.filter((d) => d.category === category).length;
              return (
                <Link
                  key={category}
                  href={`/conocimiento?cat=${encodeURIComponent(category)}${
                    query ? `&q=${encodeURIComponent(query)}` : ""
                  }`}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "bg-brand-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {category} ({count})
                </Link>
              );
            })}
          </div>

          {/* Formulario Buscador */}
          <form method="GET" action="/conocimiento" className="relative w-full sm:max-w-xs">
            {selectedCat ? <input type="hidden" name="cat" value={selectedCat} /> : null}
            {selectedFam ? <input type="hidden" name="fam" value={selectedFam} /> : null}
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Buscar normas o temas..."
              className="input pl-9 text-xs w-full"
            />
          </form>
        </div>

        {/* Filtros por Familia de Vidrio (Solo en escritorio para mantener el móvil minimalista) */}
        <div className="hidden sm:flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">
            Familias:
          </span>
          {GLASS_FAMILIES.map((family) => {
            const active = selectedFam === family;
            return (
              <Link
                key={family}
                href={`/conocimiento?${selectedCat ? `cat=${encodeURIComponent(selectedCat)}&` : ""}${
                  active ? "" : `fam=${encodeURIComponent(family)}`
                }${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                className={`rounded-full px-2.5 py-0.5 text-[11px] transition ${
                  active
                    ? "bg-brand-100 text-brand-800 font-semibold"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {family}
              </Link>
            );
          })}
          {(selectedCat || selectedFam || query) && (
            <Link
              href="/conocimiento"
              className="text-[11px] text-brand-600 hover:text-brand-800 ml-auto"
            >
              Restablecer
            </Link>
          )}
        </div>
      </div>

      {/* Grid de Artículos */}
      {filteredDocs.length === 0 ? (
        <EmptyState
          title="No se encontraron artículos"
          description={`No hay ningún documento que coincida con los filtros seleccionados.`}
          action={
            <div className="flex items-center gap-2">
              <KnowledgeUploadButton className="btn-secondary" />
              <SpectrumButton href="/conocimiento/nuevo" variant="primary">
                Crear artículo (.md)
              </SpectrumButton>
            </div>
          }
        />
      ) : (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocs.map((docItem) => {
            const isSelected = activeMeta?.file === docItem.file;
            const sizeKb = (docItem.size / 1024).toFixed(1);

            return (
              <div
                key={docItem.file}
                className={`relative flex flex-col justify-between rounded-xl border bg-white p-4 sm:p-5 transition shadow-xs hover:shadow-md ${
                  isSelected
                    ? "border-brand-500 ring-2 ring-brand-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      {docItem.isDefault ? (
                        <ShieldCheck className="h-3 w-3" />
                      ) : (
                        <FileCode className="h-3 w-3 text-slate-500" />
                      )}
                      {docItem.category}
                    </span>

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
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 leading-relaxed">
                      {docItem.subtitle}
                    </p>
                  ) : null}

                  {/* Badges de Familias (Ocultos en móvil para minimalismo) */}
                  {docItem.families && docItem.families.length > 0 ? (
                    <div className="mt-2.5 hidden sm:flex flex-wrap gap-1">
                      {docItem.families.slice(0, 3).map((f) => (
                        <span key={f} className="chip text-[9.5px] py-0 px-1.5">
                          {f}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 sm:mt-4 border-t border-slate-100 pt-2.5 sm:pt-3">
                  <div className="mb-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="truncate max-w-[150px] sm:max-w-[170px]" title={docItem.file}>
                      {docItem.file}
                    </span>
                    <span>{formatDate(docItem.updatedAt)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/conocimiento/${encodeURIComponent(docItem.id)}`}
                        className="btn-secondary text-xs px-2.5 py-1"
                      >
                        Leer
                      </Link>

                      <a
                        href={`/api/knowledge/${encodeURIComponent(docItem.id)}/pdf?download=1`}
                        className="btn-ghost text-xs p-1 text-slate-600 hover:text-slate-900"
                        title="Descargar documento en PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>

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
                        className="btn-ghost text-xs p-1 text-slate-500 hover:text-slate-800 hidden sm:inline-flex"
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
                        Base
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visor Rápido Integrado del Documento Activo (Oculto en móvil, activo solo en desktop grande) */}
      {activeMeta ? (
        <div className="hidden lg:block space-y-4 pt-4 border-t border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">
                Lectura Rápida · {activeMeta.category}
              </p>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                {activeMeta.title}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/api/knowledge/${encodeURIComponent(activeMeta.id)}/pdf?download=1`}
                className="btn-secondary text-xs inline-flex items-center gap-1.5"
                title="Descargar documento en PDF"
              >
                <Download className="h-3.5 w-3.5" />
                Descargar PDF
              </a>
              <Link
                href={`/conocimiento/${encodeURIComponent(activeMeta.id)}`}
                className="btn-secondary text-xs inline-flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                Página completa
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
              <span className="badge badge-blue">{activeMeta.category}</span>
              <span className="badge badge-gray">{activeMeta.file}</span>
              {activeMeta.families.map((f) => (
                <span key={f} className="chip">{f}</span>
              ))}
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
