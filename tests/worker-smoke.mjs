import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const workerSource = readFileSync(new URL("../worker.js", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const assetSource = readFileSync(new URL("../assets/mold-3d.js", import.meta.url), "utf8");

const sentEmails = [];
let registeredFetchHandler;
const context = {
  URL,
  Request,
  Response,
  Headers,
  JSON,
  console,
  EMAIL: { send: async (message) => { sentEmails.push(message); } },
  MAIL_FROM: "admin@moldaco.com",
  MAIL_TO: "admin@moldaco.com",
  fetch: async (input) => {
    const url = String(input);
    if (url.endsWith("/index.html")) {
      return new Response(htmlSource, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
    if (url.endsWith("/assets/mold-3d.js")) {
      return new Response(assetSource, {
        status: 200,
        headers: { "Content-Type": "application/javascript; charset=utf-8" }
      });
    }
    return new Response("mock asset", { status: 200 });
  },
  addEventListener: (type, handler) => {
    assert.equal(type, "fetch");
    registeredFetchHandler = handler;
  }
};
vm.runInNewContext(workerSource, context, { filename: "worker.js" });
assert.equal(typeof registeredFetchHandler, "function", "Worker registers fetch handler");

async function dispatch(path, init = {}) {
  const request = new Request("https://moldaco.test" + path, init);
  let responsePromise;
  registeredFetchHandler({
    request,
    respondWith(promise) { responsePromise = promise; }
  });
  assert.ok(responsePromise, "fetch handler calls respondWith");
  return await responsePromise;
}

const health = await dispatch("/health");
assert.equal(health.status, 200, "health endpoint returns 200");
assert.deepEqual(await health.json(), { ok: true, service: "moldaco-preview" });

const home = await dispatch("/");
const homeHtml = await home.text();
assert.equal(home.status, 200, "home page returns 200");
assert.match(home.headers.get("content-type"), /text\/html/i);
assert.match(homeHtml, /id="mold3d-canvas"/, "home page contains the 3D canvas");
assert.match(homeHtml, /getContext\('webgl'/, "3D renderer is embedded in the page");
assert.match(homeHtml, /\/api\/orcamento/, "home page uses the production API endpoint");
assert.match(homeHtml, /atua na <strong>injeção de peças plásticas para terceiros<\/strong>/, "canonical service description is present");
assert.match(home.headers.get("content-security-policy"), /frame-ancestors/, "security policy is present");
assert.doesNotMatch(homeHtml, /liveCheckout/, "worker does not inject a duplicate form handler");
assert.doesNotMatch(homeHtml, /guardado localmente|O envio automático não está disponível/i, "production page does not advertise local-only submission");

const asset = await dispatch("/assets/mold-3d.js");
assert.equal(asset.status, 200, "asset route returns 200");
assert.match(asset.headers.get("content-type"), /javascript/i);

const invalid = await dispatch("/api/orcamento", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    nome: "Teste", email: "teste@example.com", telefone: "11999999999",
    servico: "Molde", descricao: "Solicitação de teste de validação",
    consentimento: false, website: ""
  })
});
assert.equal(invalid.status, 400, "missing consent is rejected");
assert.equal(sentEmails.length, 0, "invalid form never sends email");

const honeypot = await dispatch("/api/orcamento", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    nome: "Bot", email: "bot@example.com", telefone: "11999999999",
    servico: "Molde", descricao: "Solicitação automatizada de teste",
    consentimento: true, website: "bot-filled-field"
  })
});
assert.equal(honeypot.status, 200, "honeypot receives a generic success");
assert.equal(sentEmails.length, 0, "honeypot never sends email");

const valid = await dispatch("/api/orcamento", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    nome: "Teste válido", email: "cliente@example.com", telefone: "11999999999",
    servico: "Molde", descricao: "Solicitação válida\\ncom duas linhas para testar o envio",
    consentimento: true, website: ""
  })
});
assert.equal(valid.status, 200, "valid quote request returns 200");
assert.equal(sentEmails.length, 1, "valid request sends exactly one email");
assert.equal(sentEmails[0].to, "admin@moldaco.com");
assert.equal(sentEmails[0].replyTo, "cliente@example.com");
assert.match(sentEmails[0].text, /com duas linhas/, "multiline descriptions are preserved");

const hidden = await dispatch("/.env");
assert.equal(hidden.status, 404, "hidden files are not served");
assert.equal((await dispatch("/README.md")).status, 404, "repository documentation is not served publicly");
assert.equal((await dispatch("/worker.js")).status, 404, "Worker source is not served publicly");
assert.equal((await dispatch("/api/orcamento")).status, 405, "quote endpoint rejects non-POST requests");
const invalidEmail = await dispatch("/api/orcamento", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ nome: "Teste", email: "nao-e-email", telefone: "11999999999", servico: "Molde", descricao: "Descrição suficientemente longa", consentimento: true, website: "" })
});
assert.equal(invalidEmail.status, 400, "invalid email is rejected");
const invalidJson = await dispatch("/api/orcamento", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: "{"
});
assert.equal(invalidJson.status, 400, "malformed JSON is rejected");

console.log("Worker smoke tests passed: health, home, 3D markup, assets, form validation, honeypot, email, hidden files.");
