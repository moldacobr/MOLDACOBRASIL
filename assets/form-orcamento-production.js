/*
 * Formulário de orçamento — WhatsApp.
 * O pedido é montado no navegador e aberto diretamente no WhatsApp comercial.
 */
(function () {
  'use strict';

  function install() {
    const form = document.querySelector('#orcamento-form, form[data-orcamento], #quote-form');
    if (!form || form.dataset.productionHandler === '1') return false;
    form.dataset.productionHandler = '1';

    const button = form.querySelector('button[type="submit"]');
    const feedback = document.querySelector('#form-feedback, [data-form-feedback]');
    const WHATSAPP_NUMBER = '5511993133018';

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

      const consent = form.querySelector('[name="consentimento"], #consentimento');
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
      window.location.assign(whatsappUrl);
    }, true);

    return true;
  }

  if (!install()) {
    document.addEventListener('DOMContentLoaded', install, { once: true });
    let attempts = 0;
    const timer = setInterval(function () {
      if (install() || ++attempts >= 20) clearInterval(timer);
    }, 250);
  }
})();
