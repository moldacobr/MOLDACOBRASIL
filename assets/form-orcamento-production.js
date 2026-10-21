/*
 * Formulário de orçamento — produção.
 * Não usar localStorage como fallback: pedidos comerciais devem ser enviados ao backend.
 */
(function () {
  'use strict';

  const form = document.querySelector('#orcamento-form, form[data-orcamento]');
  if (!form || form.dataset.productionHandler === '1') return;
  form.dataset.productionHandler = '1';

  const button = form.querySelector('button[type="submit"]');
  const feedback = document.querySelector('#form-feedback, [data-form-feedback]');

  function show(message, ok) {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.hidden = false;
    feedback.dataset.state = ok ? 'success' : 'error';
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());
    payload.consentimento = Boolean(form.querySelector('[name="consentimento"]:checked'));

    if (!payload.consentimento) {
      show('É necessário autorizar o uso dos dados para contato comercial.', false);
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = 'Enviando...';
    }
    show('Enviando sua solicitação...', true);

    try {
      const response = await fetch('/api/orcamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) {
        throw new Error(result.detail || result.mensagem || 'Não foi possível enviar a solicitação.');
      }
      form.reset();
      show('Pedido enviado com sucesso. Nossa equipe entrará em contato.', true);
    } catch (error) {
      show(error.message || 'Não foi possível enviar a solicitação agora. Tente novamente.', false);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Enviar solicitação de orçamento';
      }
    }
  }, true);
})();
