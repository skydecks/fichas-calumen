import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { JSDOM } from "jsdom";
import {
  glassLayerBars,
  layersToText,
  mergeParsedLayers,
  parseCalumenHtml,
  parseLayers,
} from "../src/lib/calumen";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
(globalThis as unknown as { DOMParser: typeof DOMParser }).DOMParser =
  dom.window.DOMParser as unknown as typeof DOMParser;

const html = fs.readFileSync(
  path.join(process.cwd(), "scripts", "sample-calumen.html"),
  "utf8",
);

const result = parseCalumenHtml(html);
assert.equal(result.sections.length, 10, "deben detectarse 10 apartados");
assert.equal(result.pinned.length, 7, "deben detectarse 7 prestaciones fijadas");

const byKey = Object.fromEntries(result.sections.map((s) => [s.key, s]));
for (const key of [
  "luminosos",
  "energeticos",
  "solares",
  "termica",
  "acustica",
  "impacto",
  "antiagresion",
  "sostenibilidad",
  "dimensiones",
  "color",
]) {
  assert.ok(byKey[key], `falta el apartado ${key}`);
}

assert.equal(byKey.luminosos.standard, "CIE015:2018");
assert.equal(byKey.luminosos.icon, "icon-luminosos.png");
assert.equal(byKey.luminosos.rows.length, 3);
assert.equal(byKey.solares.icon, "icon-solares.png");
assert.equal(byKey.energeticos.rows.length, 6);
assert.equal(byKey.energeticos.rows[5].value, "0.54");

const acustica = byKey.acustica.rows;
assert.equal(acustica[0].kind, "note");
assert.equal(acustica[0].label, "Valores acústicos calculados");
assert.equal(acustica[1].label, "Rw");
assert.equal(acustica[1].value, "42 (-1; -4) dB");
assert.equal(acustica.length, 6);

const termica = byKey.termica.rows;
assert.equal(termica[0].value, "0°");
assert.equal(termica[1].value, "4.6 W/(m2.K)");

const sostenibilidad = byKey.sostenibilidad.rows;
assert.equal(sostenibilidad[0].kind, "heading");
assert.equal(sostenibilidad[0].label, "Huella de carbono");
assert.equal(sostenibilidad[1].kind, "note");
const gwp = sostenibilidad.find((row) => row.label.includes("GWP"));
assert.ok(gwp, "debe existir la fila GWP");
assert.equal(gwp.value, "—");
const epd = sostenibilidad.find((row) =>
  row.label.includes("Declaración ambiental"),
);
assert.ok(epd, "la fila EPD no debe descartarse por pdf-hide");
assert.equal(epd.value, "EN 15804+A2");

assert.equal(byKey.dimensiones.rows[0].value, "25.5 mm");
assert.equal(byKey.dimensiones.rows[1].value, "62 kg/m²");

const allText = JSON.stringify(result);
assert.ok(!allText.includes("Más información"));
assert.ok(!allText.includes("Descargar EPD"));
assert.ok(!allText.includes("Contacto"));
assert.ok(!allText.includes("Definir parámetros"));
assert.equal(result.layers.length, 0, "el bloque de prestaciones no trae capas");

const configHtml = fs.readFileSync(
  path.join(process.cwd(), "scripts", "sample-configurator.html"),
  "utf8",
);
const config = parseCalumenHtml(configHtml);
assert.equal(config.sections.length, 0);
assert.equal(config.layers.length, 3);
assert.equal(config.layers[0].material, "PLANILUX");
assert.equal(config.layers[0].thickness, "12mm");
assert.equal(config.layers[1].material, "PVB STANDARD");
assert.equal(config.layers[1].thickness, undefined);
assert.equal(config.layers[2].material, "PLANILUX");
assert.equal(config.layers[2].thickness, "12mm");
assert.equal(config.glassName, "1212.4 HT");

const merged = mergeParsedLayers(
  [
    { material: "PLANILUX", thickness: "12mm", treatment: "Termoendurecido" },
    { material: "PVB STANDARD", thickness: "1.52mm" },
    { material: "PLANILUX", thickness: "12mm", treatment: "Termoendurecido" },
  ],
  config.layers,
);
assert.equal(merged[0].treatment, "Termoendurecido");
assert.equal(merged[1].thickness, "1.52mm");
assert.equal(merged[2].treatment, "Termoendurecido");

const bars = glassLayerBars(merged);
assert.equal(bars.length, 3);
assert.equal(bars[0].interlayer, false);
assert.equal(bars[1].interlayer, true);
assert.ok(bars[0].width > bars[1].width * 5, "el PVB debe ser mucho más delgado");
assert.ok(Math.abs(bars[0].width - bars[2].width) < 0.001);

const barsWithoutPvbThickness = glassLayerBars(config.layers);
assert.ok(
  barsWithoutPvbThickness[1].width > 0 &&
    barsWithoutPvbThickness[1].width < barsWithoutPvbThickness[0].width / 4,
  "el interlayer sin espesor usa un valor delgado por defecto",
);

const layers = parseLayers(
  "PLANILUX(12mm) - Termoendurecido\nPVB STANDARD(1.52mm)\nPLANILUX(12mm) - Termoendurecido",
);
assert.equal(layers.length, 3);
assert.equal(layers[0].material, "PLANILUX");
assert.equal(layers[0].thickness, "12mm");
assert.equal(layers[0].treatment, "Termoendurecido");
assert.equal(layers[1].material, "PVB STANDARD");
assert.equal(
  layersToText(layers),
  "PLANILUX(12mm) - Termoendurecido\nPVB STANDARD(1.52mm)\nPLANILUX(12mm) - Termoendurecido",
);

console.log("Parser OK");
console.log(
  "Apartados:",
  result.sections.map((s) => `${s.title} (${s.rows.length})`).join(" · "),
);
