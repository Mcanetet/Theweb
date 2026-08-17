(function () {
  const SESSION_KEY = 'theweb_theo_session';

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

  function bind() {
    const panel = document.getElementById('theoPanel');
    const launcher = document.getElementById('theoLauncher');
    const messages = document.getElementById('theoMessages');
    const form = document.getElementById('theoForm');
    const input = document.getElementById('theoInput');
    const sendBtn = document.getElementById('theoSend');
    const root = document.getElementById('theoRoot');

    if (!panel || !launcher || !form || !messages || !input || !sendBtn) return;

    function addBubble(text, who) {
      const el = document.createElement('div');
      el.className = 'theo-bubble ' + who;
      el.textContent = text;
      messages.appendChild(el);
      messages.scrollTop = messages.scrollHeight;
    }

    if (!messages.dataset.ready) {
      addBubble(t('theoHello'), 'bot');
      messages.dataset.ready = '1';
    }

    launcher.addEventListener('click', () => toggle());
      const isOpen = open ?? !panel.classList.contains('open');
      panel.classList.toggle('open', isOpen);
      launcher.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) input.focus();
    }

    launcher.addEventListener('click', () => toggle());
    const closeBtn = document.getElementById('theoClose');
    if (closeBtn) closeBtn.addEventListener('click', () => toggle(false));

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

    if (root) root.hidden = false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
