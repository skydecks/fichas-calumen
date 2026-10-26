import fs from "node:fs";

const BASE = "http://localhost:3000";
const CDP = "http://localhost:9222";
const html = fs.readFileSync("scripts/sample-calumen.html", "utf8");

const list = await fetch(`${CDP}/json/list`).then((r) => r.json());
const page = list.find((target) => target.type === "page");
if (!page) throw new Error("No hay pestaña de Edge disponible");

const ws = new WebSocket(page.webSocketDebuggerUrl);
let nextId = 0;
const pending = new Map();
const errors = [];

ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
    return;
  }
  if (message.method === "Runtime.exceptionThrown") {
    errors.push(message.params.exceptionDetails.text);
  }
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
    errors.push(message.params.entry.text);
  }
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    errors.push(
      message.params.args.map((arg) => arg.value ?? arg.description).join(" "),
    );
  }
});

await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));

function send(method, params = {}) {
  return new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.result?.exceptionDetails) {
    throw new Error(JSON.stringify(result.result.exceptionDetails));
  }
  return result.result?.result?.value;
}

await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");
await send("Page.navigate", { url: `${BASE}/fichas/nueva` });
await sleep(3500);

const filled = await evaluate(`(() => {
  const areas = Array.from(document.querySelectorAll('textarea'));
  const area = areas.find((el) => (el.placeholder || '').includes('performance-info-wrapper'));
  if (!area) return { ok: false, reason: 'no textarea' };
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
  setter.call(area, ${JSON.stringify(html)});
  area.dispatchEvent(new Event('input', { bubbles: true }));
  const button = Array.from(document.querySelectorAll('button')).find((el) =>
    (el.textContent || '').includes('Analizar HTML')
  );
  if (!button) return { ok: false, reason: 'no button' };
  button.click();
  return { ok: true };
})()`);

if (!filled?.ok) throw new Error(`No se pudo iniciar el análisis: ${JSON.stringify(filled)}`);
await sleep(1500);

const afterParse = await evaluate(`({
  articles: document.querySelectorAll('article').length,
  rows: document.querySelectorAll('input[placeholder="Etiqueta"]').length,
  success: document.body.innerText.includes('Se detectaron 10 apartados'),
  hasLuminosos: document.body.innerText.includes('Factores Luminosos'),
  hasSostenibilidad: document.body.innerText.includes('Sostenibilidad'),
  summary: document.body.innerText.includes('10/10'),
  errors: document.querySelectorAll('[data-nextjs-error]').length
})`);
console.log("Analizar HTML:", JSON.stringify(afterParse));

await evaluate(`(() => {
  const select = document.querySelector('#project');
  if (!select) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(select, 'seed-project-1');
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()`);
await sleep(400);

const saved = await evaluate(`(() => {
  const button = Array.from(document.querySelectorAll('button')).find((el) =>
    (el.textContent || '').includes('Guardar ficha')
  );
  if (!button) return false;
  button.click();
  return true;
})()`);
if (!saved) throw new Error("No se encontró el botón de guardado");

await sleep(4500);

const afterSave = await evaluate(`({
  path: location.pathname,
  reference: document.querySelector('h1')?.textContent || '',
  hasResumen: document.body.innerText.includes('Resumen'),
  hasError: document.body.innerText.includes('No se pudo guardar')
})`);
console.log("Guardar ficha:", JSON.stringify(afterSave));

const preview = await evaluate(`(() => {
  const button = Array.from(document.querySelectorAll('button')).find((el) =>
    (el.textContent || '').includes('Vista previa PDF')
  );
  if (!button) return false;
  button.click();
  return true;
})()`);
if (!preview) throw new Error("No se encontró el botón de vista previa");

await sleep(4000);

const afterPreview = await evaluate(`({
  modal: Boolean(document.querySelector('iframe[title="Vista previa del PDF"]')),
  blob: (document.querySelector('iframe[title="Vista previa del PDF"]')?.src || '').startsWith('blob:'),
  download: Boolean(document.querySelector('a[download]'))
})`);
console.log("Vista previa:", JSON.stringify(afterPreview));

const shot = await send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("C:/tmp/ui-preview.png", Buffer.from(shot.result.data, "base64"));

console.log("Errores de consola:", errors.length ? errors.slice(0, 5) : "ninguno");

const specId = afterSave.path?.startsWith("/fichas/")
  ? afterSave.path.split("/").filter(Boolean).pop()
  : null;

if (specId) {
  const response = await fetch(`${BASE}/api/specs/${specId}`, { method: "DELETE" });
  console.log("Limpieza:", response.status === 200 ? "ficha de prueba eliminada" : `fallo ${response.status}`);
}

if (
  afterParse.articles !== 10 ||
  afterParse.rows < 25 ||
  !afterParse.success ||
  !afterSave.path?.startsWith("/fichas/") ||
  afterSave.path === "/fichas/nueva" ||
  !afterPreview.modal ||
  !afterPreview.blob
) {
  process.exitCode = 1;
}

ws.close();
