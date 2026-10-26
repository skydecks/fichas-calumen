import fs from "node:fs";

const BASE = "http://localhost:3000";
const CDP = "http://localhost:9222";

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

async function waitFor(expression, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(expression)) return true;
    await sleep(300);
  }
  return false;
}

async function go(path) {
  await send("Page.navigate", { url: `${BASE}${path}` });
  await sleep(3000);
}

const setField = `(selector, value) => {
  const el = document.querySelector(selector);
  if (!el) return false;
  const proto = el instanceof HTMLSelectElement
    ? HTMLSelectElement.prototype
    : el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}`;

const clickButton = `(label) => {
  const button = Array.from(document.querySelectorAll('button')).find((el) =>
    (el.textContent || '').includes(label)
  );
  if (!button) return false;
  button.click();
  return true;
}`;

async function runClientCrud() {
  const unique = `Cliente UI ${Date.now()}`;
  await go("/clientes/nuevo");
  const filled = await evaluate(`(() => {
    const setField = ${setField};
    return setField('#name', ${JSON.stringify(unique)})
      && setField('#company', 'Empresa UI')
      && setField('#email', 'ui@test.mx')
      && setField('#phone', '555-0000');
  })()`);
  if (!filled) throw new Error("No se pudo llenar el formulario de cliente");

  await evaluate(`(${clickButton})('Crear cliente')`);
  const created = await waitFor(`location.pathname.startsWith('/clientes/c') && document.querySelector('h1')?.textContent?.includes(${JSON.stringify(unique)})`);
  const path = await evaluate("location.pathname");

  const edited = unique + " EDITADO";
  await evaluate(`(() => {
    const setField = ${setField};
    return setField('#name', ${JSON.stringify(edited)});
  })()`);
  await evaluate(`(${clickButton})('Guardar cambios')`);
  const updated = await waitFor(`location.search.includes('saved=1') && document.body.innerText.includes('se guardaron correctamente')`);
  const h1 = await evaluate("document.querySelector('h1')?.textContent || ''");

  await evaluate("window.confirm = () => true");
  await evaluate(`(${clickButton})('Eliminar cliente')`);
  const deleted = await waitFor(`location.pathname === '/clientes' && !document.body.innerText.includes(${JSON.stringify(edited)})`);

  console.log("CLIENTES:", JSON.stringify({ created, path, updated, h1, deleted }));
  return created && updated && deleted;
}

async function runAgentCrud() {
  const unique = `Agente UI ${Date.now()}`;
  await go("/agentes/nuevo");
  await evaluate(`(() => {
    const setField = ${setField};
    return setField('#name', ${JSON.stringify(unique)})
      && setField('#region', 'Norte')
      && setField('#email', 'agente.ui@test.mx');
  })()`);
  await evaluate(`(${clickButton})('Crear agente')`);
  const created = await waitFor(`location.pathname.startsWith('/agentes/c') && document.querySelector('h1')?.textContent?.includes(${JSON.stringify(unique)})`);
  const path = await evaluate("location.pathname");

  await evaluate(`(() => {
    const setField = ${setField};
    return setField('#region', 'Occidente');
  })()`);
  await evaluate(`(${clickButton})('Guardar cambios')`);
  const updated = await waitFor(`location.search.includes('saved=1') && document.body.innerText.includes('se guardaron correctamente')`);

  await evaluate("window.confirm = () => true");
  await evaluate(`(${clickButton})('Eliminar agente')`);
  const deleted = await waitFor(`location.pathname === '/agentes' && !document.body.innerText.includes(${JSON.stringify(unique)})`);

  console.log("AGENTES:", JSON.stringify({ created, path, updated, deleted }));
  return created && updated && deleted;
}

async function runProjectCrud() {
  const unique = `Proyecto UI ${Date.now()}`;
  await go("/proyectos/nuevo");
  await evaluate(`(() => {
    const setField = ${setField};
    return setField('#name', ${JSON.stringify(unique)})
      && setField('#clientId', 'seed-client-1')
      && setField('#agentId', 'seed-agent-1')
      && setField('#status', 'PROSPECTO')
      && setField('#location', 'Querétaro');
  })()`);
  await evaluate(`(${clickButton})('Crear proyecto')`);
  const created = await waitFor(`location.pathname.startsWith('/proyectos/c') && document.querySelector('h1')?.textContent?.includes(${JSON.stringify(unique)})`);
  const path = await evaluate("location.pathname");

  await evaluate(`(() => {
    const setField = ${setField};
    return setField('#status', 'COTIZADO');
  })()`);
  await evaluate(`(${clickButton})('Guardar cambios')`);
  const updated = await waitFor(`location.search.includes('saved=1') && document.body.innerText.includes('se guardaron correctamente')`);

  await evaluate("window.confirm = () => true");
  await evaluate(`(${clickButton})('Eliminar proyecto')`);
  const deleted = await waitFor(`location.pathname === '/proyectos' && !document.body.innerText.includes(${JSON.stringify(unique)})`);

  console.log("PROYECTOS:", JSON.stringify({ created, path, updated, deleted }));
  return created && updated && deleted;
}

await send("Runtime.enable");
await send("Page.enable");

const results = [];
results.push(await runClientCrud());
results.push(await runAgentCrud());
results.push(await runProjectCrud());

console.log("Errores de consola:", errors.length ? errors.slice(0, 5) : "ninguno");
console.log("CRUD UI:", results.every(Boolean) ? "OK" : "FALLÓ");

const shot = await send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("C:/tmp/ui-crud.png", Buffer.from(shot.result.data, "base64"));

ws.close();
