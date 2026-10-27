import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { createKnowledgeArticleAction } from "@/app/actions";
import { KnowledgeEditor, type KnowledgeFormValues } from "@/components/KnowledgeEditor";
import { prisma } from "@/lib/db";
import { productToProfile } from "@/lib/products";
import { specToData } from "@/lib/specs";
import { layerLabel } from "@/lib/calumen";

export const dynamic = "force-dynamic";

export default async function NewKnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; id?: string }>;
}) {
  const { from, id } = await searchParams;
  let initialValues: KnowledgeFormValues = {};

  if (from === "product" && id) {
    try {
      const product = await prisma.product.findUnique({ where: { id } });
      if (product) {
        const record = productToProfile(product);
        const layersList = record.layers.map((l) => `- ${layerLabel(l)}`).join("\n");
        const sectionsList = record.sections
          .map(
            (s) =>
              `### ${s.title}${s.standard ? ` (${s.standard})` : ""}\n\n` +
              s.rows.map((r) => `- **${r.label}:** ${r.value || "—"}`).join("\n"),
          )
          .join("\n\n");

        initialValues = {
          title: `Guía Técnica: ${record.name}`,
          subtitle: `Especificaciones fotométricas, energéticas y acústicas de ${record.name} (${record.manufacturer || "Catálogo"}).`,
          category: "Guía de Producto",
          families: ["Control Solar y Low-E", "Vidrio Templado"],
          standards: record.sections
            .map((s) => s.standard)
            .filter((s): s is string => Boolean(s)),
          content: `## Ficha técnica del producto

- **Nombre comercial:** ${record.name}
- **Código:** ${record.code || "Sin código"}
- **Fabricante / Fuente:** ${record.manufacturer || "Catálogo CEYCO"}
- **Categoría:** ${record.category || "Vidrio arquitectónico"}

## Composición de referencia

${layersList || "- Composición estándar de catálogo"}

## Prestaciones y valores declarados

${sectionsList || "Consultar catálogo"}

## Criterios de especificación y aplicación

1. **Control térmico y solar:** Recomendado para fachadas con requerimiento de control de calor y transmitancia térmica optimizada.
2. **Recomendaciones de templado:** Verificar absorción solar para determinar si requiere tratamiento térmico anti-rotura.
`,
        };
      }
    } catch (err) {
      console.error("Error prellenando desde producto:", err);
    }
  } else if (from === "spec" && id) {
    try {
      const spec = await prisma.specification.findUnique({
        where: { id },
        include: { project: { include: { client: true } }, agent: true },
      });
      if (spec) {
        const data = specToData(spec);
        const layersList = data.layers.map((l) => `- ${layerLabel(l)}`).join("\n");

        initialValues = {
          title: `Criterio de Especificación: ${spec.reference} (${spec.glassName || spec.project.name})`,
          subtitle: `Configuración aplicada en proyecto ${spec.project.name} para ${spec.project.client.name}.`,
          category: "Procedimiento Interno",
          families: ["Doble Acristalamiento (DGU)", "Vidrio de Seguridad y Contención"],
          standards: [spec.standard || "NOM-146-SCFI-2016"],
          content: `## Antecedentes de la especificación

- **Folio de referencia:** ${spec.reference}
- **Proyecto:** ${spec.project.name}
- **Cliente:** ${spec.project.client.name}
- **Vidrio / Composición:** ${spec.glassName || "Composición a medida"}
- **Estado en Calumen:** ${spec.status}

## Composición detallada

${layersList || "- Monolítico / Laminado"}

## Justificación técnica

Documentación técnica de la solución adoptada para cumplir con los factores solares, confort visual y requerimientos de seguridad mecánica en obra.

## Recomendaciones para proyectos similares

1. Evaluar presión de viento de la zona y dimensiones del paño antes de confirmar espesores.
2. Validar conformidad con la norma NOM-146-SCFI-2016 para áreas de riesgo de impacto humano.
`,
        };
      }
    } catch (err) {
      console.error("Error prellenando desde ficha técnica:", err);
    }
  }

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
        subtitle="Crea o importa normas, fichas técnicas o criterios de instalación con asistencia de IA. El documento se sincroniza inmediatamente con el Asistente IA."
      />

      <KnowledgeEditor
        action={createKnowledgeArticleAction}
        initialValues={initialValues}
        cancelHref="/conocimiento"
      />
    </div>
  );
}
