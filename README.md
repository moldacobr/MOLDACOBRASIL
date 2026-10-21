# MOLDACOBRASIL

Site institucional da **Moldaço Moldes e Ferramentaria**.

## Arquitetura atual

- **index.html** — página institucional; o renderizador WebGL do molde 3D está embutido no HTML para evitar falha por carregamento de um arquivo JavaScript separado.
- **worker.js** — Worker JavaScript que atende a página, publica **/health**, valida **/api/orcamento** e envia pedidos pelo Cloudflare Email binding.
- **wrangler.jsonc** — configuração do Worker de produção **moldaco-preview-2026**, incluindo o binding **EMAIL** e as variáveis de remetente/destinatário.
- **assets/mold-3d.js** — fonte independente do visualizador 3D, usada nos testes de sintaxe e como referência de manutenção; a página publicada contém o renderizador embutido.
- **assets/** — arquivos visuais e scripts auxiliares.
- **app.py** — implementação FastAPI legada para desenvolvimento e smoke tests locais; não é o runtime do Worker de produção.
- **src/main.py** e **pyproject.toml** — implementação Python Workers experimental/legada; não são o entrypoint configurado para o deploy atual.
- **tests/worker-smoke.mjs** — testes do handler real do Worker com bindings e upstream simulados.
- **.github/workflows/ci.yml** — validação de sintaxe, contrato HTML, configuração, rotas do Worker e API FastAPI legada.

## Rotas de produção

- **GET /** — site institucional.
- **GET /health** — health check JSON.
- **POST /api/orcamento** — valida e encaminha solicitação de orçamento por e-mail.

O Worker usa a binding **EMAIL** e as variáveis **MAIL_FROM** e **MAIL_TO**. A configuração de e-mail deve permanecer no Cloudflare; não inclua credenciais no Git.

## Desenvolvimento local (API legada)

Requer Python 3.12 e as dependências de **requirements.txt**.

~~~bash
python -m pip install -r requirements.txt
uvicorn app:app --reload
~~~

Acesse **http://127.0.0.1:8000**. O envio real de e-mail no backend FastAPI requer as variáveis SMTP listadas em **.env.example**; sem elas, a API responde com erro explícito em vez de fingir que enviou.

## Testes

~~~bash
node --check worker.js
node --check assets/mold-3d.js
node tests/worker-smoke.mjs
python -m py_compile app.py src/main.py
~~~

O CI também verifica o HTML, os controles do visualizador 3D, a configuração Wrangler, os endpoints locais e a validação de consentimento/anti-spam.

## Publicação

O Worker configurado para produção é **moldaco-preview-2026**, com entrypoint **worker.js**. O deploy automatizado pelo GitHub Actions só ocorre quando **CLOUDFLARE_API_TOKEN** e **CLOUDFLARE_ACCOUNT_ID** estão configurados como Actions secrets. Uma execução de testes verde, por si só, **não** significa que houve publicação.

## Visualização 3D

O molde é uma visualização ilustrativa interativa, não um modelo CAD certificado nem um projeto executivo.
