const BASE = "https://raw.githubusercontent.com/moldacobr/MOLDACOBRASIL/main/";
const MAX_LENGTHS = {
  nome: 100,
  empresa: 100,
  email: 254,
  telefone: 25,
  servico: 80,
  descricao: 3000,
  website: 200
};
const CONTENT_TYPES = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  mjs: "application/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  woff2: "font/woff2"
};

addEventListener("fetch", event => {
  event.respondWith(handle(event.request));
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function withSecurityHeaders(headers = new Headers()) {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Content-Security-Policy", "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://cloudflareinsights.com https://static.cloudflareinsights.com; frame-src 'self' https://www.google.com https://maps.google.com; font-src 'self' data: https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return headers;
}

function validateQuote(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "Confira os campos obrigatórios.";
  }

  const required = ["nome", "email", "telefone", "servico", "descricao"];
  for (const key of required) {
    if (typeof data[key] !== "string" || !data[key].trim()) {
      return "Confira os campos obrigatórios.";
    }
    if (data[key].trim().length > MAX_LENGTHS[key]) {
      return "Um ou mais campos excedem o limite permitido.";
    }
  }

  if (data.nome.trim().length < 2 ||
      data.telefone.trim().length < 8 ||
      data.servico.trim().length < 3 ||
      data.descricao.trim().length < 10) {
    return "Confira os campos obrigatórios.";
  }

  if (typeof data.email !== "string" ||
      data.email.trim().length > MAX_LENGTHS.email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    return "Informe um endereço de e-mail válido.";
  }

  if (data.empresa !== undefined &&
      (typeof data.empresa !== "string" || data.empresa.trim().length > MAX_LENGTHS.empresa)) {
    return "Confira o campo empresa.";
  }

  if (data.website !== undefined &&
      (typeof data.website !== "string" || data.website.length > MAX_LENGTHS.website)) {
    return "Confira os campos obrigatórios.";
  }

  if (data.consentimento !== true) {
    return "É necessário aceitar o aviso de privacidade.";
  }

  return null;
}

async function handle(request) {
  const url = new URL(request.url);

  if (url.pathname === "/health") {
    return jsonResponse({ ok: true, service: "moldaco-preview" });
  }

  if (url.pathname === "/api/orcamento") {
    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "POST", "Cache-Control": "no-store" }
      });
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return jsonResponse({ detail: "O corpo da solicitação deve ser um JSON válido." }, 400);
    }

    const validationError = validateQuote(data);
    if (validationError) {
      return jsonResponse({ detail: validationError }, 400);
    }

    // Honeypot: respond success to bots without sending an email.
    if (data.website && data.website.trim()) {
      return jsonResponse({ ok: true });
    }

    try {
      await EMAIL.send({
        to: MAIL_TO,
        from: MAIL_FROM,
        replyTo: data.email.trim(),
        subject: "Novo pedido de orçamento pelo site",
        text: [
          "Novo pedido de orçamento",
          "",
          `Nome: ${data.nome.trim()}`,
          `Empresa: ${(data.empresa || "").trim() || "-"}`,
          `E-mail: ${data.email.trim()}`,
          `Telefone: ${data.telefone.trim()}`,
          `Serviço: ${data.servico.trim()}`,
          "",
          "Descrição:",
          data.descricao.trim()
        ].join("\n")
      });
      return jsonResponse({
        ok: true,
        mensagem: "Pedido enviado com sucesso. Nossa equipe entrará em contato."
      });
    } catch (error) {
      console.error("Falha no envio do pedido de orçamento:", JSON.stringify({ name: error?.name || "Error", code: error?.code || error?.cause?.code || null, message: String(error?.message || "Erro no provedor").slice(0, 300) }));
      return jsonResponse({
        detail: "Não foi possível enviar o pedido agora. Tente novamente em instantes."
      }, 502);
    }
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" }
    });
  }

  let path;
  try {
    path = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  } catch {
    return new Response("Not found", { status: 404 });
  }

  if (!path) path = "index.html";
  if (path.includes("..") || path.split("/").some(segment => segment.startsWith("."))) {
    return new Response("Not found", { status: 404 });
  }

  const allowedPath = path === "index.html" ||
    path === "favicon.svg" ||
    (path.startsWith("assets/") && /^[A-Za-z0-9._/-]+$/.test(path));
  if (!allowedPath) {
    return new Response("Not found", { status: 404 });
  }

  const extension = path.split(".").pop().toLowerCase();
  if (path.startsWith("assets/") && !Object.prototype.hasOwnProperty.call(CONTENT_TYPES, extension)) {
    return new Response("Not found", { status: 404 });
  }

  let upstream;
  try {
    upstream = await fetch(BASE + path + url.search, { method: request.method });
  } catch {
    return new Response("Site temporariamente indisponível.", {
      status: 502,
      headers: withSecurityHeaders(new Headers({ "Content-Type": "text/plain; charset=utf-8" }))
    });
  }

  const headers = withSecurityHeaders(new Headers(upstream.headers));
  if (CONTENT_TYPES[extension]) headers.set("Content-Type", CONTENT_TYPES[extension]);

  if (!upstream.ok) {
    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      headers
    });
  }

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers
  });
}
