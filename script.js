document.addEventListener('DOMContentLoaded', () => {

  if (window.TheWebI18n) window.TheWebI18n.bind();

  const t = (key) => (window.TheWebI18n ? window.TheWebI18n.t(key) : key);

  // Navbar scroll effect
  const navbar = document.getElementById('navbar');
  const handleScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });

  // Mobile menu toggle
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');

  menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    menuToggle.classList.toggle('open');
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      menuToggle.classList.remove('open');
    });
  });

  // Intersection Observer for scroll animations
  const animatedElements = document.querySelectorAll('[data-animate]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        const delay = Array.from(animatedElements).indexOf(entry.target) % 6;
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay * 100);
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  animatedElements.forEach(el => observer.observe(el));

  // Animated counters
  const statNumbers = document.querySelectorAll('[data-count]');
  let countersTriggered = false;

  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !countersTriggered) {
        countersTriggered = true;
        animateCounters();
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  const statsContainer = document.querySelector('.why-stats');
  if (statsContainer) {
    statsObserver.observe(statsContainer);
  }

  function animateCounters() {
    statNumbers.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-count'), 10);
      const duration = 1500;
      const step = target / (duration / 16);
      let current = 0;

      const tick = () => {
        current += step;
        if (current >= target) {
          counter.textContent = target;
          return;
        }
        counter.textContent = Math.floor(current);
        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const offset = navbar.offsetHeight + 20;
        const top = targetEl.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // Contact form → API + email contacto@theweb.cl
  const contactForm = document.getElementById('contactForm');
  const contactFeedback = document.getElementById('contactFeedback');
  const CONTACT_EMAIL = 'contacto@theweb.cl';

  function apiBase() {
    if (window.THEWEB_API) return window.THEWEB_API.replace(/\/$/, '');
    const port = location.port;
    if (port === '5500' || port === '8080' || port === '5501') return 'http://localhost:3001';
    if (location.protocol === 'file:') return 'http://localhost:3001';
    return '';
  }

  async function postJson(url, payload) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  async function sendViaPhp(payload) {
    const { res, data } = await postJson(`${apiBase()}/send-lead.php`, payload);
    if (!res.ok || !data.ok) throw new Error(data.error || 'php_mail_failed');
    return data;
  }

  async function sendViaFormSubmit(payload) {
    const res = await fetch(`https://formsubmit.co/ajax/${CONTACT_EMAIL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: payload.name,
        email: payload.email || CONTACT_EMAIL,
        phone: payload.phone || '',
        company: payload.company || '',
        message: payload.message,
        _subject: `[TheWeb] Nuevo lead — ${payload.name}`,
        _template: 'table',
        _captcha: 'false',
      }),
    });
    const data = await res.json().catch(() => ({}));
    const ok = data.success === true || data.success === 'true';
    if (!res.ok || !ok) {
      throw new Error(data.message || 'email_fallback_failed');
    }
    return data;
  }

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      contactFeedback.textContent = '';
      contactFeedback.className = 'form-feedback';

      const name = contactForm.name.value.trim();
      const email = contactForm.email.value.trim();
      const phone = contactForm.phone.value.trim();
      const company = contactForm.company.value.trim();
      const message = contactForm.message.value.trim();
      const payload = {
        name,
        email: email || undefined,
        phone: phone || undefined,
        company: company || undefined,
        message,
        website: contactForm.website ? contactForm.website.value : '',
        pageUrl: window.location.href,
        lang: window.TheWebI18n ? window.TheWebI18n.getLang() : 'es',
      };

      if (!name || !message) {
        contactFeedback.textContent = t('formErrName');
        contactFeedback.classList.add('error');
        return;
      }

      if (!email && !phone) {
        contactFeedback.textContent = t('formErrContact');
        contactFeedback.classList.add('error');
        return;
      }

      contactForm.classList.add('is-loading');

      try {
        let mailed = false;

        try {
          const { res, data } = await postJson(`${apiBase()}/api/leads`, payload);
          if (res.ok && data.emailSent) mailed = true;
        } catch { /* Node puede no estar en el hosting */ }

        if (!mailed) {
          try { await sendViaPhp(payload); mailed = true; } catch { /* PHP mail */ }
        }

        if (!mailed) {
          try { await sendViaFormSubmit(payload); mailed = true; } catch { /* FormSubmit */ }
        }

        if (!mailed) {
          throw new Error('no_mail_channel');
        }

        contactFeedback.textContent = t('formOk');
        contactFeedback.classList.add('success');
        contactForm.reset();
      } catch {
        contactFeedback.innerHTML = t('formFail') + ' <a href="mailto:contacto@theweb.cl" style="color:#ffde59">contacto@theweb.cl</a>.';
        contactFeedback.classList.add('error');
      } finally {
        contactForm.classList.remove('is-loading');
      }
    });
  }

});
