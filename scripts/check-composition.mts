import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
(globalThis as unknown as { DOMParser: typeof DOMParser }).DOMParser =
  dom.window.DOMParser as unknown as typeof DOMParser;

const { glassLayerBars, layersThickness, parseCalumenHtml } = await import(
  "../src/lib/calumen"
);

const html = fs.readFileSync(
  path.join(process.cwd(), "scripts", "sample-configurator-detailed.html"),
  "utf8",
);

const result = parseCalumenHtml(html);
console.log("glassName:", result.glassName);
console.log("warnings:", result.warnings);
console.log(JSON.stringify(result.layers, null, 2));

assert.equal(result.glassName, "6 FT (12 AIR) 6 FT");
assert.equal(result.layers.length, 4);
assert.deepEqual(
  {
    material: result.layers[0].material,
    thickness: result.layers[0].thickness,
    treatment: result.layers[0].treatment,
    kind: result.layers[0].kind,
    laminated: result.layers[0].laminated,
  },
  {
    material: "PLANILUX",
    thickness: "6mm",
    treatment: "Templado",
    kind: "substrate",
    laminated: false,
  },
);
assert.equal(result.layers[1].kind, "coating");
assert.equal(result.layers[1].position, 2);
assert.equal(result.layers[2].kind, "cavity");
assert.equal(result.layers[2].thickness, "12mm");
assert.equal(result.layers[3].kind, "substrate");
assert.equal(layersThickness(result.layers), "24 mm");
const bars = glassLayerBars(result.layers);
assert.ok(
  bars[1].width < bars[0].width,
  "la capa funcional debe dibujarse más delgada que el vidrio",
);

console.log("OK composición detallada");
