const BASE = "https://raw.githubusercontent.com/moldacobr/MOLDACOBRASIL/main/";

addEventListener("fetch", event => event.respondWith(handle(event.request)));

async function handle(request) {
  const url = new URL(request.url);

  if (url.pathname === "/health") {
    return new Response(JSON.stringify({ ok: true, service: "moldaco-preview" }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  }

  if (url.pathname === "/api/orcamento" && request.method === "POST") {
    try {
      const data = await request.json();
      const required = ["nome", "email", "telefone", "servico", "descricao"];
      if (!data || required.some(key => typeof data[key] !== "string" || !data[key].trim()) || data.descricao.trim().length < 10 || !data.consentimento) {
        return new Response(JSON.stringify({ detail: "Confira os campos obrigatórios e aceite o aviso de privacidade." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (data.website) {
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      }
      await EMAIL.send({
        to: MAIL_TO,
        from: MAIL_FROM,
        replyTo: data.email,
        subject: "Novo pedido de orçamento pelo site",
        text: `Novo pedido de orçamento\n\nNome: ${data.nome}\nEmpresa: ${data.empresa || "-"}\nE-mail: ${data.email}\nTelefone: ${data.telefone}\nServiço: ${data.servico}\n\nDescrição:\n${data.descricao}`
      });
      return new Response(JSON.stringify({ ok: true, mensagem: "Pedido enviado com sucesso. Nossa equipe entrará em contato." }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ detail: "Não foi possível enviar o pedido agora. Tente novamente em instantes." }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  const path = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\//, "");
  if (path.includes("..") || path.startsWith(".") || /\.(py|toml|ya?ml|env)$/i.test(path)) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await fetch(BASE + path + url.search);
  const headers = new Headers(upstream.headers);
  const ext = path.split(".").pop().toLowerCase();
  const types = {
    html: "text/html; charset=utf-8",
    css: "text/css; charset=utf-8",
    js: "application/javascript; charset=utf-8",
    json: "application/json; charset=utf-8",
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
    svg: "image/svg+xml", ico: "image/x-icon", woff2: "font/woff2"
  };
  if (types[ext]) headers.set("Content-Type", types[ext]);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

  if (path === "index.html" && upstream.ok) {
    let html = await upstream.text();
    html = html.replaceAll(
      "https://maps.google.com/maps?output=embed&q=Rua%20Madagascar%2045B%20Sao%20Paulo%20SP",
      "https://www.google.com/maps?q=Rua%20Madagascar%2045B%20Sao%20Paulo%20SP&output=embed"
    );
    html = html.replace(
      "loading=\"lazy\" referrerpolicy=\"no-referrer-when-downgrade\"",
      "loading=\"eager\" referrerpolicy=\"strict-origin-when-cross-origin\""
    );
    html = html.replace(
      "projeta, fabrica e reforma ferramentas para peças plásticas de até 250 g, além de matrizes para alumínio e Zamak, com foco em usinagem e ajuste mecânico.",
      "atua na <strong>injeção de peças plásticas para terceiros</strong>, utilizando máquina própria, com capacidade de produção de peças de até <strong>250 g</strong>. Também realiza <strong>manutenção, ajustes e reformas de moldes de injeção</strong>, sem restrição quanto ao peso da peça, além da fabricação e manutenção de ferramentas e matrizes para alumínio e Zamak, com foco em usinagem e ajuste mecânico."
    );
    html = html.replace(
      '<div class="stat"><strong>Até 250 g</strong><small>peça plástica</small></div>',
      '<div class="stat"><strong>Até 250 g</strong><small>injeção de peças para terceiros</small></div>'
    );
    html = html.replace(
      '<div class="spec"><b>250 g</b><span>peso de referência para peças plásticas</span></div>',
      '<div class="spec"><b>Até 250 g</b><span>capacidade da máquina própria para injeção de peças para terceiros</span></div>'
    );
    html = html.replace(
      '<h3>Reforma e manutenção</h3><p>Ajustes, recuperação de componentes e intervenções para ampliar a vida útil da ferramenta.</p>',
      '<h3>Manutenção de moldes</h3><p>Manutenção, ajustes e reformas de <strong>moldes de injeção de qualquer aplicação e peso</strong>, conforme a necessidade do cliente.</p>'
    );
    const liveForm = `<script>(function(){function boot(){const form=document.querySelector("#quote-form");if(!form||form.dataset.liveCheckout==="1")return;if(!form.querySelector("[name=nome]")||!form.querySelector("[name=email]"))return;form.dataset.liveCheckout="1";form.addEventListener("submit",async function(ev){ev.preventDefault();ev.stopImmediatePropagation();const btn=form.querySelector("button[type=submit],button"),original=btn?btn.textContent:"";if(btn){btn.disabled=true;btn.textContent="Enviando..."}try{const data=Object.fromEntries(new FormData(form).entries());data.consentimento=!!document.querySelector("#consentimento:checked");const r=await fetch("/api/orcamento",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}),out=await r.json().catch(()=>({}));if(!r.ok)throw new Error(out.detail||"Não foi possível enviar o pedido.");form.reset();alert(out.mensagem||"Pedido enviado com sucesso. Nossa equipe entrará em contato.")}catch(err){alert(err.message||"Não foi possível enviar o pedido agora.")}finally{if(btn){btn.disabled=false;btn.textContent=original||"Enviar solicitação de orçamento"}}},true)}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot()})();</script>`;
    html = html.replace("</body>", liveForm + "</body>");
    html = html.replace(/O envio automático não está disponível[^<]*/gi, "Envio online ativo: sua solicitação será encaminhada diretamente à equipe.");
    headers.set("Content-Security-Policy", "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-src 'self' https://www.google.com https://maps.google.com; font-src 'self' data: https:; object-src 'none'; base-uri 'self'");
    return new Response(html, { status: upstream.status, headers });
  }

  return new Response(upstream.body, { status: upstream.status, headers });
}
