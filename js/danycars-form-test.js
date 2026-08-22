/* ============================================================
   DanyCars — ТЕСТОВАЯ версия формы (GitHub Pages, без PHP).
   Шлёт заявку напрямую в Telegram Bot API из браузера.

   ⚠️  ТОЛЬКО ДЛЯ ТЕСТА.
   Токен в этом файле виден любому посетителю сайта (F12 → Sources).
   Используйте ОТДЕЛЬНОГО тестового бота и после проверки отзовите
   токен: @BotFather → /revoke → выбрать бота.
   На боевом хостинге ставим send-telegram.php — там токен на сервере.

   Подключать перед </body>:
       <script src="js/danycars-form-test.js"></script>
   ============================================================ */
(function () {
  'use strict';

  /* ---------- ЗАПОЛНИТЬ ЭТИ ДВЕ СТРОКИ ---------- */
  var BOT_TOKEN = '8848747713:AAH55ZfxkGvU0DnvT_sUKVWD9AAoRjjARmE'; // от @BotFather
  var CHAT_ID   = '446293045';                                     // из getUpdates
  /* ---------------------------------------------- */

  var API = 'https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage';

  /* Подписи полей в сообщении. Ключ = атрибут name в HTML. */
  var LABELS = {
    name:    'Imię',
    phone:   'Telefon',
    email:   'E-mail',
    link:    'Link do ogłoszenia',
    car:     'Samochód',
    city:    'Miasto',
    package: 'Pakiet',
    date:    'Termin',
    message: 'Wiadomość'
  };

  var TEXT = {
    sending:   'Wysyłanie...',
    okTitle:   'Dziękujemy!',
    okBody:    'Twoja wiadomość została wysłana. Skontaktujemy się z Tobą najszybciej jak to możliwe.',
    errTitle:  'Nie udało się wysłać',
    errBody:   'Spróbuj ponownie za chwilę lub zadzwoń do nas bezpośrednio.',
    noContact: 'Zostaw numer telefonu lub e-mail, żebyśmy mogli się z Tobą skontaktować.',
    badEmail:  'Sprawdź poprawność adresu e-mail.',
    tooFast:   'Wiadomość została już wysłana. Odczekaj chwilę przed kolejną próbą.',
    close:     'Zamknij'
  };

  var lastSend = 0; // защита от повторных нажатий

  /* ---------- окно (modal) ---------- */

  var modal = null;

  function buildModal() {
    if (modal) return modal;

    modal = document.createElement('div');
    modal.className = 'dc-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML =
      '<div class="dc-modal__backdrop"></div>' +
      '<div class="dc-modal__box">' +
        '<div class="dc-modal__icon"></div>' +
        '<h3 class="dc-modal__title"></h3>' +
        '<p class="dc-modal__text"></p>' +
        '<button type="button" class="dc-modal__btn"></button>' +
      '</div>';

    document.body.appendChild(modal);

    modal.querySelector('.dc-modal__btn').addEventListener('click', hideModal);
    modal.querySelector('.dc-modal__backdrop').addEventListener('click', hideModal);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.keyCode === 27) hideModal();
    });

    return modal;
  }

  function showModal(ok, title, text) {
    var m = buildModal();
    m.classList.toggle('dc-modal--error', !ok);
    m.querySelector('.dc-modal__icon').textContent = ok ? '✓' : '!';
    m.querySelector('.dc-modal__title').textContent = title;
    m.querySelector('.dc-modal__text').textContent = text;
    m.querySelector('.dc-modal__btn').textContent = TEXT.close;
    m.classList.add('is-open');
    document.body.classList.add('dc-modal-open');
    setTimeout(function () { m.querySelector('.dc-modal__btn').focus(); }, 60);
  }

  function hideModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.classList.remove('dc-modal-open');
  }

  /* ---------- вспомогательное ---------- */

  function readValue(el) {
    if (!el || typeof el.value !== 'string') return '';
    /* у <select> берём видимый текст опции ("PREMIUM"), а не value ("premium") */
    if (el.tagName === 'SELECT') {
      if (!el.value) return '';
      var opt = el.options[el.selectedIndex];
      return opt ? opt.text.trim() : el.value.trim();
    }
    return el.value.trim();
  }

  function val(form, name) {
    return readValue(form.elements[name]);
  }

  function looksLikeEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v);
  }

  function esc(v) {
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function addHoneypot(form) {
    if (form.elements['company']) return;
    var hp = document.createElement('input');
    hp.type = 'text';
    hp.name = 'company';
    hp.tabIndex = -1;
    hp.autocomplete = 'off';
    hp.setAttribute('aria-hidden', 'true');
    hp.className = 'dc-hp';
    form.appendChild(hp);
  }

  /* Собираем текст сообщения из всех заполненных полей формы. */
  function buildMessage(form) {
    var lines = [];
    var used = {};

    Object.keys(LABELS).forEach(function (key) {
      var v = val(form, key);
      if (!v) return;
      used[key] = true;
      lines.push('<b>' + LABELS[key] + ':</b> ' + esc(v.slice(0, 1500)));
    });

    /* Поля, которых нет в LABELS, тоже отправляем — ничего не теряем. */
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || used[el.name] || el.name === 'company') return;
      if (el.type === 'submit' || el.type === 'button') return;
      if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
      var v = readValue(el);
      if (!v) return;
      used[el.name] = true;
      lines.push('<b>' + esc(el.name) + ':</b> ' + esc(v.slice(0, 1500)));
    });

    if (!lines.length) return null;

    var d = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : n; };
    var stamp = pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() +
                ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());

    return '🚗 <b>Nowe zgłoszenie ze strony</b>\n\n' + lines.join('\n') + '\n\n🕒 ' + stamp;
  }

  /* ---------- отправка ---------- */

  function handleSubmit(e) {
    e.preventDefault();

    var form = e.currentTarget;
    if (form.dataset.sending === '1') return;

    /* ловушка для ботов — молча делаем вид, что всё отправлено */
    if (form.elements['company'] && form.elements['company'].value) {
      form.reset();
      showModal(true, TEXT.okTitle, TEXT.okBody);
      return;
    }

    if (Date.now() - lastSend < 15000) {
      showModal(false, TEXT.errTitle, TEXT.tooFast);
      return;
    }

    var phone = val(form, 'phone');
    var email = val(form, 'email');

    if (!phone && !email) {
      showModal(false, TEXT.errTitle, TEXT.noContact);
      var f = form.elements['phone'] || form.elements['email'];
      if (f && f.focus) f.focus();
      return;
    }
    if (email && !looksLikeEmail(email)) {
      showModal(false, TEXT.errTitle, TEXT.badEmail);
      if (form.elements['email'].focus) form.elements['email'].focus();
      return;
    }

    var text = buildMessage(form);
    if (!text) {
      showModal(false, TEXT.errTitle, TEXT.noContact);
      return;
    }

    var btn = form.querySelector('[type="submit"], button:not([type="button"])');
    /* Кнопка может быть <button> (текст внутри) или <input type="submit">
       (текст в атрибуте value) — обрабатываем оба варианта. */
    var isInput = btn && btn.tagName === 'INPUT';
    var btnLabel = btn ? (isInput ? btn.value : btn.innerHTML) : '';

    function setBtnLabel(v) {
      if (!btn) return;
      if (isInput) { btn.value = v; } else { btn.innerHTML = v; }
    }

    form.dataset.sending = '1';
    if (btn) {
      btn.disabled = true;
      setBtnLabel(TEXT.sending);
    }

    function restore() {
      form.dataset.sending = '0';
      if (btn) {
        btn.disabled = false;
        setBtnLabel(btnLabel);
      }
    }

    /* URLSearchParams, а не JSON: так браузер шлёт «простой» запрос
       без preflight-OPTIONS, который Telegram не обрабатывает. */
    var body = new URLSearchParams();
    body.append('chat_id', CHAT_ID);
    body.append('text', text);
    body.append('parse_mode', 'HTML');
    body.append('disable_web_page_preview', 'true');

    fetch(API, { method: 'POST', body: body })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (data) {
        restore();
        if (data && data.ok) {
          lastSend = Date.now();
          form.reset();
          showModal(true, TEXT.okTitle, TEXT.okBody);
        } else {
          console.error('Telegram error:', data);
          showModal(false, TEXT.errTitle, TEXT.errBody);
        }
      })
      .catch(function (err) {
        restore();
        console.error('Send error:', err);
        showModal(false, TEXT.errTitle, TEXT.errBody);
      });
  }

  /* ---------- старт ---------- */

  document.addEventListener('DOMContentLoaded', function () {
    var forms = document.querySelectorAll('#contact-form form, form#contact-form, form[data-tg-form]');

    if (!forms.length) {
      var section = document.querySelector('#contact-form, .contact-section, #kontakt');
      if (section) {
        var f = section.querySelector('form');
        if (f) forms = [f];
      }
    }

    if (!forms.length) {
      console.warn('DanyCars: формы не нашёл. Добавьте id="contact-form" или data-tg-form.');
      return;
    }

    Array.prototype.forEach.call(forms, function (form) {
      form.setAttribute('novalidate', 'novalidate');
      addHoneypot(form);
      form.addEventListener('submit', handleSubmit);
    });
  });
})();
