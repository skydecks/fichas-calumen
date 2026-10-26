import Link from "next/link";
import { AiMarkdown } from "@/lib/ai-markdown";
import { getKnowledgeDocument } from "@/lib/ai-knowledge";
import { PageHeader } from "@/components/ui";
import { SpectrumCard } from "@/components/spectrum/card";

export const dynamic = "force-dynamic";

export default function KnowledgePage() {
  const content = getKnowledgeDocument("NOM-146-SCFI-2016.md");

  return (
    <div>
      <PageHeader
        eyebrow="Base de conocimiento"
        title="NOM-146-SCFI-2016"
        subtitle="Productos de vidrio — Vidrio de seguridad usado en la construcción — Especificaciones y métodos de prueba."
        actions={
          <Link
            href="/knowledge/NOM-146-SCFI-2016.md"
            className="btn-secondary"
            target="_blank"
          >
            Ver archivo .md
          </Link>
        }
      />

      <SpectrumCard padding="md">
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <span className="badge badge-blue">Vidrio de seguridad</span>
          <span className="chip">DOF 28/10/2016</span>
          <span className="chip">Cancela NOM-146-SCFI-2001</span>
          <span className="chip">NEQ</span>
        </div>
        <AiMarkdown
          content={content}
          className="text-[12px] text-slate-600"
        />
      </SpectrumCard>
    </div>
  );
}
