import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { updateKnowledgeArticleAction } from "@/app/actions";
import {
  getKnowledgeDocMeta,
  getKnowledgeDocument,
  parseFrontmatter,
} from "@/lib/ai-knowledge";
import { KnowledgeEditor } from "@/components/KnowledgeEditor";

export const dynamic = "force-dynamic";

export default async function EditKnowledgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  const meta = getKnowledgeDocMeta(decodedId);
  if (!meta) {
    notFound();
  }

  const rawContent = getKnowledgeDocument(meta.file);
  const { body } = parseFrontmatter(rawContent);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/conocimiento/${encodeURIComponent(meta.id)}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a {meta.title}
      </Link>

      <PageHeader
        eyebrow="Base de conocimiento"
        title={`Editar: ${meta.title}`}
        subtitle={`Modifica el contenido del archivo ${meta.file}. Los cambios se sincronizarán inmediatamente con el Asistente IA.`}
      />

      <KnowledgeEditor
        action={updateKnowledgeArticleAction}
        isEditing
        initialValues={{
          title: meta.title,
          subtitle: meta.subtitle,
          fileName: meta.file,
          originalFileName: meta.file,
          category: meta.category,
          families: meta.families,
          standards: meta.standards,
          content: body,
        }}
        cancelHref={`/conocimiento/${encodeURIComponent(meta.id)}`}
      />
    </div>
  );
}
