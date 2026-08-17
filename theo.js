(function () {
  const SESSION_KEY = 'theweb_theo_session';
  const CONTACT_EMAIL = 'contacto@theweb.cl';

  function t(key) {
    return window.TheWebI18n ? window.TheWebI18n.t(key) : key;
  }

  function lang() {
    return window.TheWebI18n ? window.TheWebI18n.getLang() : 'es';
  }

  function apiBase() {
    if (window.THEWEB_API) return window.THEWEB_API.replace(/\/$/, '');
    const port = location.port;
    if (port === '5500' || port === '8080' || port === '5501') return 'http://localhost:3001';
    if (location.protocol === 'file:') return 'http://localhost:3001';
    return '';
  }

  function sessionId() {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = 'theo-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  function mount() {
    const wrap = document.createElement('div');
    wrap.className = 'theo-root';
    wrap.innerHTML = `
      <button type="button" class="theo-launcher" id="theoLauncher" aria-expanded="false" aria-controls="theoPanel">
        <span class="theo-avatar">T</span>
        <span class="label" data-i18n="theoLaunch">${t('theoLaunch')}</span>
      </button>
      <section class="theo-panel" id="theoPanel" role="dialog" aria-label="Theo">
        <header class="theo-header">
          <div class="theo-header-id">
            <span class="theo-avatar">T</span>
            <div>
              <h2>Theo</h2>
              <p><span data-i18n="theoRole">${t('theoRole')}</span> · ${CONTACT_EMAIL}</p>
            </div>
          </div>
          <button type="button" class="theo-close" id="theoClose" data-i18n-aria="theoClose" aria-label="${t('theoClose')}">&times;</button>
        </header>
        <div class="theo-messages" id="theoMessages"></div>
        <form class="theo-form" id="theoForm">
          <input type="text" id="theoInput" maxlength="2000" autocomplete="off" data-i18n-placeholder="theoPlaceholder" placeholder="${t('theoPlaceholder')}">
          <button type="submit" id="theoSend" data-i18n="theoSend">${t('theoSend')}</button>
        </form>
      </section>`;
    document.body.appendChild(wrap);

    const panel = document.getElementById('theoPanel');
    const launcher = document.getElementById('theoLauncher');
    const messages = document.getElementById('theoMessages');
    const form = document.getElementById('theoForm');
    const input = document.getElementById('theoInput');
    const sendBtn = document.getElementById('theoSend');

    function addBubble(text, who) {
      const el = document.createElement('div');
      el.className = 'theo-bubble ' + who;
      el.textContent = text;
      messages.appendChild(el);
      messages.scrollTop = messages.scrollHeight;
    }

    addBubble(t('theoHello'), 'bot');

    document.addEventListener('theweb:lang', () => {
      wrap.querySelector('[data-i18n="theoLaunch"]').textContent = t('theoLaunch');
      wrap.querySelector('[data-i18n="theoRole"]').textContent = t('theoRole');
      wrap.querySelector('[data-i18n="theoSend"]').textContent = t('theoSend');
      input.placeholder = t('theoPlaceholder');
      document.getElementById('theoClose').setAttribute('aria-label', t('theoClose'));
    });

    function toggle(open) {
      const isOpen = open ?? !panel.classList.contains('open');
      panel.classList.toggle('open', isOpen);
      launcher.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) input.focus();
    }

    launcher.addEventListener('click', () => toggle());
    document.getElementById('theoClose').addEventListener('click', () => toggle(false));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      addBubble(text, 'user');
      sendBtn.disabled = true;

      try {
        const res = await fetch(`${apiBase()}/api/theo/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            sessionId: sessionId(),
            lang: lang(),
            visitor: { pageUrl: location.href },
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Theo');
        addBubble(data.reply, 'bot');
      } catch {
        addBubble(t('theoOffline'), 'bot');
      } finally {
        sendBtn.disabled = false;
        input.focus();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
