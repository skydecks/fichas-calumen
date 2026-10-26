import "server-only";

import fs from "node:fs";
import path from "node:path";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { glassLayerBars, pdfSafe } from "@/lib/calumen";
import { colorForLayer } from "@/lib/types";
import type { GlassLayer, PerfRow, SpecData } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const LEGAL_TEXT =
  "Calumen® calcula las características fotométricas y valores de Transmitancia Térmica de los acristalamientos mediante el uso de algoritmos según lo establecido en las normas europeas EN 410-2011 y EN 673-2011, las normas internacionales ISO 9050, la norma japonesa JIS R 3106/3107, la norma coreana KS L 2514/2525. Las prestaciones técnicas ofrecidas, así como el motor de cálculo de Calumen® para las normas EN410-2011 y EN673-2011 han sido validadas por la entidad de certificación TUV Rheinland (informe 89222746-01). Los valores aportados por Calumen III se han calculado conforme a estas normas, siendo facilitados sólo con fines informativos y estando sujetos a modificación. Sólo los valores declarados en los documentos de Marcado CE alojados en la página de Saint-Gobain Glass son oficiales. Los índices de atenuación acústica se han obtenido mediante ensayos en condiciones de laboratorio según lo establecido en las normas EN ISO 10140-3 y EN 12758. Los valores calculados son sólo indicativos y su precisión puede variar en un rango de +/- 2dB. Los cálculos de espesor de vidrio están realizados según la versión 2012 de la normativa francesa DTU39. El usuario es responsable de la introducción de las hipótesis de cálculo correctas y de la correcta aplicación de la normativa DTU39 para el proyecto estudiado.";

const cache = new Map<string, { data: Buffer; format: "png" }>();
const SAFE_ASSET = /^[a-z0-9-]+\.png$/i;

function asset(file: string): { data: Buffer; format: "png" } {
  const safeFile = SAFE_ASSET.test(file) ? file : "icon-luminosos.png";
  const cached = cache.get(safeFile);
  if (cached) return cached;
  const loaded = {
    data: fs.readFileSync(
      path.join(process.cwd(), "public", "assets", safeFile),
    ),
    format: "png" as const,
  };
  cache.set(safeFile, loaded);
  return loaded;
}

function layerText(layer: GlassLayer): string {
  const size = layer.thickness ? `(${layer.thickness})` : "";
  const method = layer.treatment ? ` - ${layer.treatment}` : "";
  return pdfSafe(`${layer.material}${size}${method}`);
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim());
}

/** Un campo sin valor real no debe ocupar una línea del PDF. */
function hasValue(value: string | null | undefined): boolean {
  if (!hasText(value)) return false;
  return !/^(?:-|—|–|n\/a|na|sin dato|pendiente)$/i.test(value!.trim());
}

function showRow(row: PerfRow): boolean {
  if (!hasText(row.label)) return false;
  if (row.kind === "row") return hasValue(row.value);
  return true;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingLeft: 35,
    paddingRight: 31,
    paddingBottom: 96,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#1c1c1c",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  calumenLogo: { width: 84, height: 19, objectFit: "contain" },
  sgLogo: { width: 48, height: 20, objectFit: "contain", marginRight: 6 },
  docHead: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  ceycoLogo: {
    width: 34,
    height: 40,
    objectFit: "contain",
    marginRight: 12,
  },
  customLogo: {
    width: 58,
    height: 40,
    objectFit: "contain",
    marginRight: 12,
  },
  orgLine: {
    marginTop: 1,
    fontSize: 7,
    color: "#475569",
    fontFamily: "Helvetica-Bold",
  },
  supportLine: {
    marginTop: 1.5,
    fontSize: 6.2,
    color: "#6b7280",
  },
  docHeadBody: { flex: 1 },
  title: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.1,
  },
  titleLong: { fontSize: 12 },
  meta: {
    marginTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 8,
  },
  metaText: { fontSize: 6.9, color: "#6b7280" },
  metaValue: { color: "#1f2937" },
  context: {
    marginTop: 1.5,
    fontSize: 6.2,
    color: "#6b7280",
  },
  rule: {
    marginTop: 5,
    borderTopWidth: 0.6,
    borderTopColor: "#d7dbe0",
  },
  columns: {
    marginTop: 16,
    flexDirection: "row",
    gap: 35,
  },
  left: { width: 245 },
  right: { flex: 1 },
  h2: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111827" },
  glassCard: {
    marginTop: 1,
    height: 60,
    borderWidth: 0.7,
    borderColor: "#e2e6ea",
    backgroundColor: "#fdfdfd",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 9,
  },
  sideIcon: { width: 14, height: 14, opacity: 0.75 },
  panes: { flexDirection: "row", alignItems: "center", gap: 0.8 },
  pane: {
    height: 34.8,
    backgroundColor: "#d9ebfc",
    borderWidth: 0.5,
    borderColor: "#b4d2ec",
  },
  cavityPane: {
    height: 34.8,
    backgroundColor: "#e8eef6",
    borderWidth: 0.5,
    borderColor: "#b4d2ec",
  },
  interlayer: {
    height: 34.8,
    backgroundColor: "#7fb1e8",
    borderWidth: 0.5,
    borderColor: "#6ba0da",
  },
  coatingPane: {
    height: 34.8,
    backgroundColor: "#ef4444",
    borderWidth: 0.5,
    borderColor: "#b91c1c",
  },
  layersCard: {
    marginTop: 3,
    borderWidth: 0.7,
    borderColor: "#e2e6ea",
    backgroundColor: "#fdfdfd",
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 15,
  },
  swatch: {
    width: 32,
    height: 16,
    backgroundColor: "#cfe6f8",
    borderWidth: 0.6,
    borderColor: "#b3d4ec",
    marginTop: 1,
  },
  layersBody: { flex: 1 },
  layersTitle: { fontSize: 7.8, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  layerRow: { flexDirection: "row", marginBottom: 1 },
  bullet: { width: 7, fontSize: 7.2, color: "#333333" },
  layerText: { flex: 1, fontSize: 7.2, lineHeight: 1.35, color: "#2b2b2b" },
  emptyLayer: { fontSize: 7.2, color: "#9ca3af", fontStyle: "italic" },
  section: {
    borderTopWidth: 0.6,
    borderTopColor: "#d9dde2",
    paddingTop: 4,
    paddingBottom: 3,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  sectionIcon: { width: 7.2, height: 7.2, marginRight: 4, opacity: 0.8 },
  sectionTitle: {
    flex: 1,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    paddingRight: 6,
  },
  sectionStandard: {
    fontSize: 6.8,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    textAlign: "right",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 0.4,
  },
  label: { flex: 1, fontSize: 7, color: "#333333", lineHeight: 1.2 },
  value: {
    width: "36%",
    fontSize: 7,
    color: "#111827",
    textAlign: "right",
    lineHeight: 1.2,
  },
  note: {
    fontSize: 6.6,
    fontStyle: "italic",
    color: "#4b5563",
    marginBottom: 1.2,
    lineHeight: 1.2,
  },
  group: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    paddingVertical: 0.8,
  },
  footer: {
    position: "absolute",
    bottom: 7,
    left: 35,
    right: 31,
    paddingTop: 0,
  },
  pageNumber: {
    fontSize: 6,
    color: "#6b7280",
    textAlign: "right",
    marginBottom: 3,
  },
  footerRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  tuvLogo: { width: 41.4, height: 20.4, objectFit: "contain" },
  legal: {
    flex: 1,
    fontSize: 4.6,
    lineHeight: 1.35,
    color: "#6b7280",
    textAlign: "justify",
  },
});

type Props = { data: SpecData };

function SpecDocument({ data }: Props) {
  const branding = data.branding ?? {};
  const organizationName = pdfSafe(branding.organizationName || "CEYCO");
  const organizationTagline = pdfSafe(branding.organizationTagline || "");
  const supportLine = pdfSafe(branding.supportLine || "");
  const customLogo = branding.logoDataUrl;
  const layers = (data.layers ?? []).filter((layer) =>
    hasText(layer.material),
  );
  const bars = glassLayerBars(layers, { minWidth: 2 });
  const swatchColor =
    layers.find((layer) => layer.kind === "substrate")?.color ||
    layers[0]?.color ||
    "#cfe6f8";
  const sections = (data.sections ?? [])
    .filter((section) => !section.hidden && hasText(section.title))
    .map((section) => ({
      ...section,
      rows: section.rows.filter(showRow),
    }))
    .filter((section) => section.rows.length > 0);
  const titleText = pdfSafe(
    data.glassName?.trim() || data.reference || "Ficha técnica",
  );
  const titleStyle =
    titleText.length > 34 ? [styles.title, styles.titleLong] : styles.title;

  const contextBits = [
    data.projectName ? `Proyecto: ${data.projectName}` : null,
    data.clientName ? `Cliente: ${data.clientName}` : null,
    data.agentName ? `Agente: ${data.agentName}` : null,
  ].filter(Boolean) as string[];

  return (
    <Document
      title={`Ficha técnica ${titleText}`}
      author={data.calculatedBy || "CEYCO"}
      subject={`Ficha técnica de vidrio · Referencia ${pdfSafe(data.reference)}`}
      creator="Generador de fichas técnicas CEYCO"
      producer="CEYCO"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={asset("logo-calumen.png")} style={styles.calumenLogo} />
          <Image src={asset("logo-saint-gobain.png")} style={styles.sgLogo} />
        </View>

        <View style={styles.docHead}>
          <Image
            src={customLogo || asset("logo-ceyco.png")}
            style={customLogo ? styles.customLogo : styles.ceycoLogo}
          />
          <View style={styles.docHeadBody}>
            <Text style={titleStyle}>{titleText}</Text>
            <Text style={styles.orgLine}>
              {organizationName}
              {organizationTagline ? ` · ${organizationTagline}` : ""}
            </Text>

            <View style={styles.meta}>
              {hasText(data.calculatedBy) ? (
                <Text style={styles.metaText}>
                  Calculado por:{" "}
                  <Text style={styles.metaValue}>
                    {pdfSafe(data.calculatedBy)}
                  </Text>
                </Text>
              ) : null}
              {hasText(data.calculatedAt) ? (
                <Text style={styles.metaText}>
                  Calculado en:{" "}
                  <Text style={styles.metaValue}>
                    {formatDate(data.calculatedAt)}
                  </Text>
                </Text>
              ) : null}
              {hasText(data.catalog) ? (
                <Text style={styles.metaText}>
                  Catálogo de producto:{" "}
                  <Text style={styles.metaValue}>{pdfSafe(data.catalog)}</Text>
                </Text>
              ) : null}
              {hasText(data.standard) ? (
                <Text style={styles.metaText}>
                  Normas:{" "}
                  <Text style={styles.metaValue}>{pdfSafe(data.standard)}</Text>
                </Text>
              ) : null}
            </View>

            {contextBits.length > 0 && (
              <Text style={styles.context}>
                {pdfSafe(contextBits.join("   ·   "))}
              </Text>
            )}
            {supportLine ? (
              <Text style={styles.supportLine}>{supportLine}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.rule} />

        <View style={styles.columns}>
          <View style={styles.left}>
            <Text style={styles.h2}>Tipo de acristalamiento</Text>

            <View style={styles.glassCard}>
              <Image src={asset("icon-exterior.png")} style={styles.sideIcon} />
              {layers.length > 0 ? (
                <View style={styles.panes}>
                  {bars.map((bar, index) => (
                    <View
                      key={index}
                      style={[
                        styles.pane,
                        {
                          width: bar.width,
                          backgroundColor: colorForLayer(layers[index]),
                          borderColor: colorForLayer(layers[index]),
                        },
                      ]}
                    />
                  ))}
                </View>
              ) : null}
              <Image src={asset("icon-interior.png")} style={styles.sideIcon} />
            </View>

            <View style={styles.layersCard}>
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: swatchColor,
                    borderColor: swatchColor,
                  },
                ]}
              />
              <View style={styles.layersBody}>
                <Text style={styles.layersTitle}>Vidrio</Text>
                {layers.length === 0 ? (
                  <Text style={styles.emptyLayer}>
                    Composición pendiente de definir
                  </Text>
                ) : (
                  layers.map((layer, index) => (
                    <View key={index} style={styles.layerRow}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.layerText}>{layerText(layer)}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>

          <View style={styles.right}>
            <Text style={styles.h2}>Datos de prestaciones simulados</Text>

            {sections.map((section) => (
              <View key={section.id} style={styles.section} wrap={false}>
                <View style={styles.sectionHead}>
                  <Image
                    src={asset(section.icon || "icon-luminosos.png")}
                    style={styles.sectionIcon}
                  />
                  <Text style={styles.sectionTitle}>{pdfSafe(section.title)}</Text>
                  {section.standard ? (
                    <Text style={styles.sectionStandard}>
                      {pdfSafe(section.standard)}
                    </Text>
                  ) : null}
                </View>

                {section.rows.map((row) => {
                  if (row.kind === "note") {
                    return (
                      <Text key={row.id} style={styles.note}>
                        {pdfSafe(row.label)}
                      </Text>
                    );
                  }
                  if (row.kind === "heading") {
                    return (
                      <Text key={row.id} style={styles.group}>
                        {pdfSafe(row.label)}
                      </Text>
                    );
                  }
                  if (!hasValue(row.value)) return null;
                  return (
                    <View key={row.id} style={styles.row}>
                      <Text style={styles.label}>{pdfSafe(row.label)}</Text>
                      <Text style={styles.value}>{pdfSafe(row.value)}</Text>
                    </View>
                  );
                })}
              </View>
            ))}

            {sections.length === 0 && (
              <Text style={styles.emptyLayer}>
                Sin prestaciones analizadas todavía.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber}/${totalPages}`
            }
          />
          <View style={styles.footerRow}>
            <Image src={asset("logo-tuv.png")} style={styles.tuvLogo} />
            <Text style={styles.legal}>{LEGAL_TEXT}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderSpecPdf(data: SpecData): Promise<Buffer> {
  return renderToBuffer(<SpecDocument data={data} />);
}
