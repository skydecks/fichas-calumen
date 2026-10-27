import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { createKnowledgeArticleAction } from "@/app/actions";
import { KnowledgeEditor } from "@/components/KnowledgeEditor";

export const dynamic = "force-dynamic";

export default function NewKnowledgePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/conocimiento"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a la base de conocimiento
      </Link>

      <PageHeader
        eyebrow="Base de conocimiento"
        title="Nuevo artículo técnico en Markdown (.md)"
        subtitle="Redacta o pega especificaciones, normas técnicas o guías de producto. El archivo .md se incorporará al repositorio de la empresa y se indexará automáticamente para el Asistente IA."
      />

      <KnowledgeEditor
        action={createKnowledgeArticleAction}
        cancelHref="/conocimiento"
      />
    </div>
  );
}
