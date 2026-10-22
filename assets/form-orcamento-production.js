/*
 * Formulário de orçamento — WhatsApp.
 * O pedido é montado no navegador e aberto diretamente no WhatsApp comercial.
 * Não depende de e-mail, Worker ou armazenamento local.
 */
(function () {
  'use strict';

  const form = document.querySelector('#orcamento-form, form[data-orcamento], #quote-form');
  if (!form || form.dataset.productionHandler === '1') return;
  form.dataset.productionHandler = '1';

  const button = form.querySelector('button[type="submit"]');
  const feedback = document.querySelector('#form-feedback, [data-form-feedback]');
  const WHATSAPP_NUMBER = '55119930133018';

  function show(message, ok) {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.hidden = false;
    feedback.dataset.state = ok ? 'success' : 'error';
  }

  function value(name) {
    const field = form.querySelector(`[name="${name}"]`);
    return field ? String(field.value || '').trim() : '';
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const consent = form.querySelector('[name="consentimento"]');
    if (!consent || !consent.checked) {
      show('É necessário autorizar o uso dos dados para contato comercial.', false);
      return;
    }

    const nome = value('nome');
    const email = value('email');
    const telefone = value('telefone');
    const servico = value('servico');
    const descricao = value('descricao');

    if (!nome || !email || !telefone || !servico || !descricao) {
      show('Preencha todos os campos obrigatórios antes de continuar.', false);
      return;
    }

    const message = [
      '🔧 *NOVO PEDIDO DE ORÇAMENTO — MOLDAÇO*',
      '',
      `*Nome:* ${nome}`,
      `*E-mail:* ${email}`,
      `*Telefone:* ${telefone}`,
      `*Serviço:* ${servico}`,
      '',
      '*Descrição do projeto:*',
      descricao,
      '',
      'Enviado pelo formulário do site moldaco.com.br.'
    ].join('\n');

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    if (button) {
      button.disabled = true;
      button.textContent = 'Abrindo WhatsApp...';
    }

    show('Abrindo o WhatsApp com seu pedido preenchido...', true);

    const opened = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

    if (!opened) {
      window.location.href = whatsappUrl;
    }

    setTimeout(function () {
      form.reset();
      if (button) {
        button.disabled = false;
        button.textContent = 'Enviar solicitação de orçamento';
      }
    }, 800);
  }, true);
})();
