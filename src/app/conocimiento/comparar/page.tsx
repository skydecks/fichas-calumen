import Link from "next/link";
import { ArrowLeft, Columns, Scale } from "lucide-react";
import { PageHeader } from "@/components/ui";
import {
  getKnowledgeDocument,
  listKnowledgeDocuments,
  parseFrontmatter,
} from "@/lib/ai-knowledge";
import { AiMarkdown } from "@/lib/ai-markdown";
import { SpectrumCard } from "@/components/spectrum/card";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CompareKnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const allDocs = listKnowledgeDocuments();

  const docAId = a || allDocs[0]?.id;
  const docBId = b || allDocs[1]?.id || allDocs[0]?.id;

  const metaA = allDocs.find((d) => d.id === docAId || d.file === docAId) ?? allDocs[0];
  const metaB = allDocs.find((d) => d.id === docBId || d.file === docBId) ?? allDocs[1] ?? allDocs[0];

  let bodyA = "";
  let bodyB = "";

  if (metaA) {
    try {
      const raw = getKnowledgeDocument(metaA.file);
      bodyA = parseFrontmatter(raw).body;
    } catch {
      bodyA = "No se pudo cargar el documento A.";
    }
  }

  if (metaB) {
    try {
      const raw = getKnowledgeDocument(metaB.file);
      bodyB = parseFrontmatter(raw).body;
    } catch {
      bodyB = "No se pudo cargar el documento B.";
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/conocimiento"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a la base de conocimiento
      </Link>

      <PageHeader
        eyebrow="Herramienta de análisis"
        title="Comparador Técnico Lado a Lado"
        subtitle="Contrasta especificaciones, criterios de seguridad y valores entre dos normas o artículos técnicos."
      />

      {/* Selectores de Documentos A y B */}
      <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs">
        <div>
          <label htmlFor="docA" className="font-semibold text-slate-700 block mb-1.5">
            Documento A:
          </label>
          <form method="GET" action="/conocimiento/comparar">
            <input type="hidden" name="b" value={metaB?.id} />
            <select
              id="docA"
              name="a"
              defaultValue={metaA?.id}
              className="input text-xs"
              // @ts-ignore
              onchange="this.form.submit()"
            >
              {allDocs.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title} ({doc.category})
                </option>
              ))}
            </select>
            <noscript>
              <button type="submit" className="btn-secondary mt-1 text-[11px]">Cambiar A</button>
            </noscript>
          </form>
        </div>

        <div>
          <label htmlFor="docB" className="font-semibold text-slate-700 block mb-1.5">
            Documento B:
          </label>
          <form method="GET" action="/conocimiento/comparar">
            <input type="hidden" name="a" value={metaA?.id} />
            <select
              id="docB"
              name="b"
              defaultValue={metaB?.id}
              className="input text-xs"
              // @ts-ignore
              onchange="this.form.submit()"
            >
              {allDocs.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title} ({doc.category})
                </option>
              ))}
            </select>
            <noscript>
              <button type="submit" className="btn-secondary mt-1 text-[11px]">Cambiar B</button>
            </noscript>
          </form>
        </div>
      </div>

      {/* Vista Comparativa en Dos Columnas */}
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* Columna Documento A */}
        {metaA && (
          <SpectrumCard padding="md">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="badge badge-blue">{metaA.category}</span>
                <span className="text-[11px] font-mono text-slate-400">{metaA.file}</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {metaA.title}
              </h2>
              {metaA.subtitle && (
                <p className="mt-1 text-xs text-slate-500 italic">{metaA.subtitle}</p>
              )}
              {metaA.families && metaA.families.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {metaA.families.map((f) => (
                    <span key={f} className="chip text-[10px]">{f}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="prose prose-slate max-w-none text-xs text-slate-700 leading-relaxed max-h-[75vh] overflow-y-auto pr-2">
              <AiMarkdown content={bodyA} />
            </div>
          </SpectrumCard>
        )}

        {/* Columna Documento B */}
        {metaB && (
          <SpectrumCard padding="md">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="badge badge-blue">{metaB.category}</span>
                <span className="text-[11px] font-mono text-slate-400">{metaB.file}</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {metaB.title}
              </h2>
              {metaB.subtitle && (
                <p className="mt-1 text-xs text-slate-500 italic">{metaB.subtitle}</p>
              )}
              {metaB.families && metaB.families.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {metaB.families.map((f) => (
                    <span key={f} className="chip text-[10px]">{f}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="prose prose-slate max-w-none text-xs text-slate-700 leading-relaxed max-h-[75vh] overflow-y-auto pr-2">
              <AiMarkdown content={bodyB} />
            </div>
          </SpectrumCard>
        )}
      </div>
    </div>
  );
}
