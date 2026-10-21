# MOLDACOBRASIL

Site da **Moldaço Moldes e Ferramentaria**, com frontend HTML e backend FastAPI executados no **Cloudflare Workers**.

## Estrutura

- `index.html` — página completa do site.
- `assets/molde-3d-referencia.jpg` — foto real usada na visualização do molde.
- `src/main.py` — FastAPI adaptado para o runtime Python Workers.
- `wrangler.jsonc` — configuração do Cloudflare Worker, Static Assets e Email Service.
- `pyproject.toml` — dependências do Python Worker.
- `app.py` — implementação local legada para desenvolvimento com Uvicorn.
- `requirements.txt` — dependências do ambiente local legado.
- `.env.example` — exemplo sem credenciais reais.
- `.github/workflows/ci.yml` — testes automáticos do projeto.

## Cloudflare

O deploy é feito no **Cloudflare Workers**. O mesmo Worker atende a API FastAPI e os arquivos estáticos do site.

A configuração usa Python Workers com `python_workers`, Static Assets e uma binding `EMAIL` para o Cloudflare Email Service.

Para o formulário funcionar em produção, configure no Worker as variáveis secretas `MAIL_FROM` e `MAIL_TO`. O domínio remetente precisa estar configurado no Cloudflare Email Service.

## Executar localmente

```bash
uv run pywrangler dev
```

Acesse `http://localhost:8787`.

O binding de e-mail pode ser simulado localmente ou configurado como remoto no Wrangler para testes controlados. Não coloque credenciais reais no Git.

## Deploy

```bash
uv run pywrangler deploy
```

O projeto pode ser publicado no subdomínio `workers.dev` ou posteriormente ligado a um domínio personalizado.

## Endpoints

- `GET /` — site.
- `GET /health` — health check.
- `POST /api/orcamento` — formulário de orçamento.

## E-mail

O formulário usa o Cloudflare Email Service por binding do Worker, sem SMTP externo no código de produção. A binding `EMAIL` é configurada pelo `wrangler.jsonc`; o endereço de envio e o destinatário ficam fora do código.

## Observação sobre o visual do molde

O destaque do molde usa a foto fornecida como referência visual. Ela é apresentada como referência de engenharia e não como desenho CAD certificado ou projeto executivo.

## Regra de publicação

Alterações entram por Pull Request. Primeiro testamos localmente, depois CI, depois deploy controlado no Cloudflare e finalmente verificamos o site online. Só consideramos a publicação concluída após todos os testes passarem.
