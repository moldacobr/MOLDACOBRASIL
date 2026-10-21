from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr, Field, field_validator
from workers import asgi

app = FastAPI(title="API de orçamento Moldaço")


class Orcamento(BaseModel):
    nome: str = Field(min_length=2, max_length=100)
    empresa: str = Field(default="", max_length=100)
    email: EmailStr
    telefone: str = Field(min_length=8, max_length=25)
    servico: str = Field(min_length=3, max_length=80)
    descricao: str = Field(min_length=10, max_length=3000)
    consentimento: bool
    website: str = Field(default="", max_length=200)

    @field_validator("nome", "empresa", "telefone", "servico", "descricao", "website")
    @classmethod
    def limpar_texto(cls, valor: str) -> str:
        valor = valor.strip()
        if "\r" in valor or "\n" in valor:
            raise ValueError("Campo inválido.")
        return valor


@app.get("/health", include_in_schema=False)
async def health():
    return {"ok": True, "service": "moldaco", "platform": "cloudflare-workers"}


@app.post("/api/orcamento")
async def enviar_orcamento(request: Request, dados: Orcamento):
    if dados.website:
        return {"ok": True}

    if not dados.consentimento:
        raise HTTPException(status_code=400, detail="É necessário aceitar o aviso de privacidade.")

    env = request.scope["env"]
    remetente = getattr(env, "MAIL_FROM", None)
    destinatario = getattr(env, "MAIL_TO", None)

    if not remetente or not destinatario:
        raise HTTPException(status_code=503, detail="Serviço de envio não configurado.")

    texto = (
        "Novo pedido de orçamento\n\n"
        f"Nome: {dados.nome}\n"
        f"Empresa: {dados.empresa or '-'}\n"
        f"E-mail: {dados.email}\n"
        f"Telefone: {dados.telefone}\n"
        f"Serviço: {dados.servico}\n\n"
        f"Descrição:\n{dados.descricao}\n"
    )

    try:
        await env.EMAIL.send({
            "to": destinatario,
            "from": remetente,
            "replyTo": str(dados.email),
            "subject": "Novo pedido de orçamento pelo site",
            "text": texto,
        })
    except Exception as exc:
        print(f"Falha no envio de orçamento: {type(exc).__name__}")
        raise HTTPException(status_code=502, detail="Não foi possível enviar o pedido agora.")

    return {"ok": True, "mensagem": "Pedido enviado."}


@app.get("/{path:path}", include_in_schema=False)
async def frontend(path: str, request: Request):
    normalized = path.lstrip("/") or "index.html"
    lower = normalized.lower()

    blocked = (
        lower.startswith(".git/"),
        lower.startswith(".github/"),
        lower.startswith(".venv/"),
        lower.startswith("__pycache__/"),
        lower.endswith((".py", ".pyc", ".toml", ".yaml", ".yml")),
        lower.startswith(".env"),
        lower in {"dockerfile", ".dockerignore", "readme.md", "requirements.txt"},
    )
    if any(blocked):
        raise HTTPException(status_code=404, detail="Not found")

    env = request.scope["env"]
    asset_url = f"https://assets.local/{normalized}"
    response = await env.ASSETS.fetch(asset_url)
    body = await response.bytes()
    return Response(content=body, status_code=response.status, headers=dict(response.headers))


Default = asgi.entrypoint(app)
