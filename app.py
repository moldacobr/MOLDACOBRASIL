from pathlib import Path
import os
import smtplib
from email.message import EmailMessage

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

BASE_DIR = Path(__file__).resolve().parent
INDEX_FILE = BASE_DIR / "index.html"
ASSETS_DIR = BASE_DIR / "assets"

app = FastAPI(title="API de orçamento Moldaco")
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


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
        # Descrições comerciais podem conter quebras de linha; e-mail é validado separadamente.
        return valor.strip()


def preparar_pagina() -> str:
    html = INDEX_FILE.read_text(encoding="utf-8")
    html = html.replace(
        "MOLDACO PEÇAS E FERRAMENTAS LTDA</strong> projeta, fabrica e reforma ferramentas para peças plásticas de até 250 g, além de matrizes para alumínio e Zamak, com foco em usinagem e ajuste mecânico.",
        "MOLDACO PEÇAS E FERRAMENTAS LTDA</strong> atua na <strong>injeção de peças plásticas para terceiros</strong>, utilizando máquina própria, com capacidade máxima de produção de peças de até <strong>250 g</strong>. Também realiza <strong>manutenção, ajustes e reformas de moldes de injeção sem restrição de peso</strong>, além da fabricação e manutenção de ferramentas e matrizes para alumínio e Zamak, com foco em usinagem e ajuste mecânico."
    )
    html = html.replace(
        "<div class=\"stat\"><strong>Até 250 g</strong><small>peça plástica</small></div>",
        "<div class=\"stat\"><strong>Até 250 g</strong><small>peças plásticas para terceiros — injeção em máquina própria</small></div>"
    )
    html = html.replace(
        "<div class=\"stat\"><strong>3 frentes</strong><small>plástico, alumínio e Zamak</small></div>",
        "<div class=\"stat\"><strong>Manutenção de moldes</strong><small>qualquer molde, sem limite de peso</small></div><div class=\"stat\"><strong>3 frentes</strong><small>plástico, alumínio e Zamak</small></div>"
    )
    return html


@app.get("/", include_in_schema=False)
async def pagina_inicial():
    return HTMLResponse(preparar_pagina())


@app.get("/health", include_in_schema=False)
async def health():
    return {"ok": True, "service": "moldaco"}


@app.post("/api/orcamento")
@limiter.limit("5/hour")
async def enviar_orcamento(request: Request, dados: Orcamento):
    if dados.website:
        return {"ok": True}

    if not dados.consentimento:
        raise HTTPException(status_code=400, detail="É necessário aceitar o aviso de privacidade.")

    smtp_host = os.environ.get("SMTP_HOST")
    smtp_user = os.environ.get("SMTP_USER")
    smtp_password = os.environ.get("SMTP_PASSWORD")
    destinatario = os.environ.get("MAIL_TO")
    remetente = os.environ.get("MAIL_FROM")

    if not all([smtp_host, smtp_user, smtp_password, remetente, destinatario]):
        raise HTTPException(status_code=503, detail="Serviço de envio não configurado.")

    try:
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    except ValueError:
        raise HTTPException(status_code=503, detail="Configuração SMTP inválida.")

    mensagem = EmailMessage()
    mensagem["Subject"] = "Novo pedido de orçamento pelo site"
    mensagem["From"] = remetente
    mensagem["To"] = destinatario
    mensagem["Reply-To"] = str(dados.email)
    mensagem.set_content(
        "Novo pedido de orçamento\n\n"
        f"Nome: {dados.nome}\n"
        f"Empresa: {dados.empresa or '-'}\n"
        f"E-mail: {dados.email}\n"
        f"Telefone: {dados.telefone}\n"
        f"Serviço: {dados.servico}\n\n"
        f"Descrição:\n{dados.descricao}\n"
    )

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as servidor:
            servidor.starttls()
            servidor.login(smtp_user, smtp_password)
            servidor.send_message(mensagem)
    except (OSError, smtplib.SMTPException):
        raise HTTPException(status_code=502, detail="Não foi possível enviar o pedido agora.")

    return {"ok": True, "mensagem": "Pedido enviado."}
