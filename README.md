# MOLDACOBRASIL

Site da **Moldaço Moldes e Ferramentaria** com frontend HTML e backend FastAPI.

## Estrutura

- `index.html` — página completa do site.
- `assets/molde-3d-referencia.jpg` — foto de referência do molde usada no destaque visual.
- `app.py` — API FastAPI para orçamento e envio SMTP.
- `requirements.txt` — dependências Python.
- `.env.example` — variáveis de ambiente para SMTP.
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

## Endpoints

- `GET /` — site.
- `GET /health` — health check.
- `POST /api/orcamento` — formulário de orçamento.

## Observação sobre o visual do molde

O destaque do molde usa a foto fornecida como referência visual. Ela é apresentada como referência de engenharia e não como desenho CAD certificado ou projeto executivo.

## Regra de publicação

Alterações entram por Pull Request. O CI deve passar antes do merge.
