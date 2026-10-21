# MOLDACOBRASIL

Site da **Moldaço Moldes e Ferramentaria** com frontend HTML e backend FastAPI.

## Estrutura

- `index.html` — página completa do site.
- `assets/molde-3d-referencia.jpg` — foto de referência do molde usada no destaque visual.
- `app.py` — API FastAPI para orçamento e envio SMTP.
- `requirements.txt` — dependências Python.
- `.env.example` — nomes das variáveis SMTP, sem credenciais reais.
- `Dockerfile` — imagem de produção para executar o FastAPI.
- `render.yaml` — configuração de deploy no Render com health check e segredos fora do Git.
- `.github/workflows/ci.yml` — testes automáticos do projeto.

## Executar localmente

```bash
python -m venv .venv
# Windows
.venv\\Scripts\\activate
# Linux/macOS
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload
```

Acesse `http://127.0.0.1:8000`.

## Executar com Docker

```bash
docker build -t moldacobrasil .
docker run --rm -p 10000:10000 moldacobrasil
```

Acesse `http://127.0.0.1:10000`.

## Deploy

O projeto está preparado para um **Web Service Docker no Render**. O `render.yaml` configura o serviço para usar o Dockerfile, o endpoint `/health` como health check e `checksPass` para que novos commits só sejam implantados após os checks do CI passarem.

As credenciais SMTP **não ficam no Git**. Na criação do serviço, o Render solicita os valores marcados com `sync: false`; depois eles devem ser mantidos como variáveis secretas do serviço.

O Render fornece HTTPS gerenciado para o serviço e para domínios personalizados. citeturn0search4

## Endpoints

- `GET /` — site.
- `GET /health` — health check.
- `POST /api/orcamento` — formulário de orçamento.

## Observação sobre o visual do molde

O destaque do molde usa a foto fornecida como referência visual. Ela é apresentada como referência de engenharia e não como desenho CAD certificado ou projeto executivo.

## Regra de publicação

Alterações entram por Pull Request. O CI deve passar antes do merge, e o deploy está configurado para aguardar checks verdes.
