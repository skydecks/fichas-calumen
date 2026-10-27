import "server-only";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { KnowledgeDocMeta } from "@/lib/knowledge-types";
import { parseFrontmatter } from "@/lib/ai-knowledge";
import { formatDate } from "@/lib/utils";

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingLeft: 36,
    paddingRight: 36,
    paddingBottom: 48,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1.5,
    borderBottomColor: "#475569",
    paddingBottom: 10,
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
  },
  docTypeTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  docTypeSubtitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica",
    color: "#64748b",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  metaRight: {
    alignItems: "flex-end",
  },
  badge: {
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e1",
    borderWidth: 0.5,
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginBottom: 3,
  },
  badgeText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
  },
  dateText: {
    fontSize: 7,
    color: "#64748b",
  },
  docTitleBlock: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 10,
    marginBottom: 14,
  },
  docTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 3,
  },
  docSubtitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Oblique",
    color: "#475569",
    marginBottom: 6,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#cbd5e1",
    paddingTop: 6,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: "row",
    marginRight: 12,
  },
  metaKey: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    marginRight: 3,
  },
  metaValue: {
    fontSize: 7,
    color: "#0f172a",
  },
  sectionHeading: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginTop: 10,
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 2,
  },
  subHeading: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    marginTop: 6,
    marginBottom: 3,
  },
  paragraph: {
    fontSize: 8,
    lineHeight: 1.35,
    color: "#334155",
    marginBottom: 5,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#475569",
    marginTop: 3.5,
    marginRight: 6,
  },
  bulletText: {
    fontSize: 8,
    lineHeight: 1.3,
    color: "#334155",
    flex: 1,
  },
  callout: {
    backgroundColor: "#f8fafc",
    borderLeftWidth: 2.5,
    borderLeftColor: "#64748b",
    padding: 6,
    marginVertical: 4,
    borderRadius: 2,
  },
  calloutText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Oblique",
    color: "#334155",
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#cbd5e1",
    paddingTop: 6,
  },
  footerText: {
    fontSize: 6.5,
    color: "#94a3b8",
  },
});

type ParsedBlock =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "bullet"; text: string }
  | { type: "callout"; text: string }
  | { type: "paragraph"; text: string };

function parseMarkdownToBlocks(body: string): ParsedBlock[] {
  const lines = body.split("\n");
  const blocks: ParsedBlock[] = [];
  let currentParagraph = "";

  const flushParagraph = () => {
    if (currentParagraph.trim()) {
      blocks.push({ type: "paragraph", text: currentParagraph.trim() });
      currentParagraph = "";
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      blocks.push({ type: "h2", text: line.replace(/^##\s+/, "").trim() });
    } else if (line.startsWith("### ")) {
      flushParagraph();
      blocks.push({ type: "h3", text: line.replace(/^###\s+/, "").trim() });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      flushParagraph();
      blocks.push({
        type: "bullet",
        text: line.replace(/^[-*]\s+/, "").replace(/\*\*/g, "").trim(),
      });
    } else if (line.startsWith("> ")) {
      flushParagraph();
      blocks.push({
        type: "callout",
        text: line.replace(/^>\s+(\[!.*?\]\s*)?/, "").replace(/\*\*/g, "").trim(),
      });
    } else if (line.startsWith("|")) {
      flushParagraph();
      const cells = line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length > 0 && !cells[0].includes("---")) {
        blocks.push({ type: "bullet", text: cells.join("  |  ") });
      }
    } else if (line.startsWith("# ")) {
      flushParagraph();
    } else {
      currentParagraph += (currentParagraph ? " " : "") + line.replace(/\*\*/g, "");
    }
  }

  flushParagraph();
  return blocks;
}

export function KnowledgePdfDocument({
  meta,
  content,
}: {
  meta: KnowledgeDocMeta;
  content: string;
}) {
  const { body } = parseFrontmatter(content);
  const blocks = parseMarkdownToBlocks(body);

  return (
    <Document title={meta.title} author="Documentación Técnica">
      <Page size="A4" style={styles.page}>
        {/* Cabecera Técnica Neutral (Sin membretes de marca) */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.docTypeTitle}>Documento Técnico</Text>
            <Text style={styles.docTypeSubtitle}>
              Base de Conocimiento · Vidrio Arquitectónico y Normatividad
            </Text>
          </View>
          <View style={styles.metaRight}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{meta.category}</Text>
            </View>
            <Text style={styles.dateText}>
              Fecha: {formatDate(meta.updatedAt)}
            </Text>
          </View>
        </View>

        {/* Ficha / Bloque de Título */}
        <View style={styles.docTitleBlock}>
          <Text style={styles.docTitle}>{meta.title}</Text>
          {meta.subtitle ? (
            <Text style={styles.docSubtitle}>{meta.subtitle}</Text>
          ) : null}

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaKey}>Archivo:</Text>
              <Text style={styles.metaValue}>{meta.file}</Text>
            </View>
            {meta.families && meta.families.length > 0 ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaKey}>Familias:</Text>
                <Text style={styles.metaValue}>{meta.families.join(", ")}</Text>
              </View>
            ) : null}
            {meta.standards && meta.standards.length > 0 ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaKey}>Normas:</Text>
                <Text style={styles.metaValue}>{meta.standards.join(", ")}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Bloques de Contenido */}
        {blocks.map((block, i) => {
          if (block.type === "h2") {
            return (
              <Text key={i} style={styles.sectionHeading}>
                {block.text}
              </Text>
            );
          }
          if (block.type === "h3") {
            return (
              <Text key={i} style={styles.subHeading}>
                {block.text}
              </Text>
            );
          }
          if (block.type === "bullet") {
            return (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{block.text}</Text>
              </View>
            );
          }
          if (block.type === "callout") {
            return (
              <View key={i} style={styles.callout}>
                <Text style={styles.calloutText}>{block.text}</Text>
              </View>
            );
          }
          return (
            <Text key={i} style={styles.paragraph}>
              {block.text}
            </Text>
          );
        })}

        {/* Pie de Página Neutral */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Documentación técnica de consulta y especificación.
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderKnowledgePdf(
  meta: KnowledgeDocMeta,
  content: string,
): Promise<Buffer> {
  const doc = <KnowledgePdfDocument meta={meta} content={content} />;
  return await renderToBuffer(doc);
}
