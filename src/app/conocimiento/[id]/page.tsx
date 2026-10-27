import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  ExternalLink,
  Trash2,
  FileText,
  Calendar,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
  Download,
} from "lucide-react";
import { AiMarkdown } from "@/lib/ai-markdown";
import {
  getKnowledgeDocMeta,
  getKnowledgeDocument,
  parseFrontmatter,
} from "@/lib/ai-knowledge";
import { PageHeader } from "@/components/ui";
import { SpectrumCard } from "@/components/spectrum/card";
import { ConfirmButton } from "@/components/SubmitButton";
import { deleteKnowledgeArticleAction } from "@/app/actions";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function KnowledgeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creado?: string; guardado?: string }>;
}) {
  const { id } = await params;
  const { creado, guardado } = await searchParams;
  const decodedId = decodeURIComponent(id);

  const meta = getKnowledgeDocMeta(decodedId);
  if (!meta) {
    notFound();
  }

  const rawContent = getKnowledgeDocument(meta.file);
  const { body } = parseFrontmatter(rawContent);
  const fileSizeKb = (meta.size / 1024).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/conocimiento"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a la base de conocimiento
        </Link>

        <div className="flex items-center gap-2">
          {meta.isDefault ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Norma Oficial Mexicana (Base)
            </span>
          ) : (
            <span className="badge badge-blue">{meta.category}</span>
          )}
        </div>
      </div>

      {creado ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ¡Artículo creado exitosamente! Ya está disponible en el repositorio y activo para consultas en el Asistente IA.
        </div>
      ) : null}

      {guardado ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          Cambios guardados con éxito en el archivo .md.
        </div>
      ) : null}

      <PageHeader
        eyebrow={`Base de conocimiento · ${meta.category}`}
        title={meta.title}
        subtitle={meta.subtitle || `Archivo técnico ${meta.file}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/knowledge/${encodeURIComponent(meta.id)}/pdf?download=1`}
              className="btn-secondary text-xs inline-flex items-center gap-1.5 border-brand-300 text-brand-700 hover:bg-brand-50"
              title="Descargar documento técnico en formato PDF"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar PDF
            </a>

            <Link
              href={`/conocimiento/${encodeURIComponent(meta.id)}/editar`}
              className="btn-secondary text-xs inline-flex items-center gap-1.5"
            >
              <Edit className="h-3.5 w-3.5" />
              Editar artículo
            </Link>

            <Link
              href={`/knowledge/${meta.file}`}
              className="btn-secondary text-xs inline-flex items-center gap-1.5"
              target="_blank"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver archivo .md
            </Link>

            {!meta.isDefault ? (
              <form action={deleteKnowledgeArticleAction} className="inline">
                <input type="hidden" name="fileName" value={meta.file} />
                <ConfirmButton
                  message={`¿Estás seguro de que deseas eliminar el artículo "${meta.title}" (${meta.file})?`}
                  className="btn-danger text-xs inline-flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </ConfirmButton>
              </form>
            ) : null}
          </div>
        }
      />

      {/* Barra de Ficha Técnica / Metadatos */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-800">
            <FileText className="h-3.5 w-3.5 text-brand-600" />
            {meta.file}
          </span>
          <span className="text-slate-300">·</span>
          <span className="inline-flex items-center gap-1.5">
            <HardDrive className="h-3.5 w-3.5 text-slate-400" />
            {fileSizeKb} KB
          </span>
          <span className="hidden sm:inline-flex text-slate-300">·</span>
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            Actualizado {formatDate(meta.updatedAt)}
          </span>
        </div>

        {/* Chips de Familias de Vidrio */}
        {meta.families && meta.families.length > 0 ? (
          <div className="hidden sm:flex flex-wrap items-center gap-1.5">
            {meta.families.map((f) => (
              <span key={f} className="chip text-[10px]">
                {f}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Contenido Renderizado */}
      <SpectrumCard padding="md">
        <div className="prose prose-slate max-w-none">
          <AiMarkdown
            content={body}
            className="text-[13px] text-slate-700 leading-relaxed"
          />
        </div>
      </SpectrumCard>
    </div>
  );
}
