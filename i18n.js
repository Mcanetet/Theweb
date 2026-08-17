(function (global) {
  const STORAGE_KEY = 'theweb_lang';

  const dict = {
    es: {
      metaTitle: 'TheWeb. — Inteligencia Digital & Marketing Tecnológico',
      navServices: 'Servicios',
      navClients: 'Clientes',
      navWhy: '¿Por qué TheWeb?',
      navSolutions: 'Soluciones',
      navCta: 'Conversemos',
      menu: 'Menú',
      langLabel: 'Idioma',
      heroTag: '/ Inteligencia Digital & Marketing Tecnológico /',
      heroTitle: 'Desarrollamos plataformas digitales <span class="highlight">inteligentes</span>',
      heroSubtitle: 'Creamos tu sitio web y lo equipamos con agentes de IA especializados en vender y atender a tus clientes en piloto automático.',
      heroBtn: 'Contáctanos',
      servicesTag: 'TheServices',
      service1Title: 'TheWeb / <span class="highlight">Core</span>',
      service1Desc: 'Diseño y desarrollo de sitios web de alta conversión. E-commerce robustos y landing pages optimizadas para transformar visitas en clientes reales. Tu base digital, sólida y profesional.',
      service2Title: 'TheWeb / <span class="highlight">Agents</span>',
      service2Tag: 'ventas',
      service2Desc: 'Asistentes de IA entrenados con tu catálogo. Capaces de calificar leads, agendar reuniones y cerrar ventas en tiempo real, directo en tu web o a través de WhatsApp. Un clon digital de tu mejor vendedor.',
      service3Title: 'TheWeb / <span class="highlight">Support</span>',
      service3Tag: 'autoatención',
      service3Desc: 'Soporte y postventa automatizada. Agentes de IA integrados a la base de conocimiento de tu empresa para resolver más del 80% de preguntas frecuentes, tracking de envíos o soporte técnico sin intervención humana.',
      clientsTag: 'TheClients',
      clientsTitle: 'Confían en nosotros',
      whyTag: 'TheAnswer',
      whyTitle: '¿Por qué <span class="highlight">TheWeb</span>?',
      whyText: 'Creamos la solución para tu negocio con plataformas que interactúan, califican y venden mientras duermes.',
      stat1: 'Consultas automatizadas',
      stat2: 'Disponibilidad total',
      stat3: 'Más conversiones',
      solutionsTag: 'TheSolutions',
      solutionsTitle: 'Creamos soluciones para los rubros que mueven el mercado',
      problem: 'El problema:',
      solution: 'La solución:',
      s1Title: 'Inmobiliarias y Corredoras',
      s1P: 'Leads que se pierden por falta de tiempo para responder portales.',
      s1A: 'Tu catálogo web interactivo + una IA que califica el presupuesto del cliente y agenda la visita al piloto automáticamente.',
      s2Title: 'Salud y Clínicas Estéticas',
      s2P: 'Secretarías colapsadas respondiendo precios, direcciones y disponibilidad.',
      s2A: 'Una IA que explica los tratamientos, resuelve dudas frecuentes y pre-agenda la cita directo en tu sistema.',
      s3Title: 'Educación y Academias Online',
      s3P: 'Prospectos pidiendo mallas curriculares y precios fuera de horario laboral.',
      s3A: 'Landing pages de alta conversión con un agente de IA que vende los cursos y resuelve dudas de financiamiento 24/7.',
      s4Title: 'Servicios B2B y Consultoras',
      s4P: 'Pérdida de tiempo en reuniones con leads que no tienen el perfil o el presupuesto.',
      s4A: 'Un filtro inteligente en tu web que entrevista al prospecto y solo agenda en tu calendario a los clientes ideales.',
      s5Title: 'Automotoras y Concesionarios',
      s5P: 'Consultas constantes sobre stock, fichas técnicas y opciones de financiamiento.',
      s5A: 'Un showroom digital donde la IA simula pre-aprobaciones de crédito y agenda los Test Drives.',
      s6Title: 'E-commerce y Proveedores Industriales',
      s6P: 'Clientes saturando los canales para saber el estado de su despacho o pedir cotizaciones mayoristas.',
      s6A: 'Automatización de postventa conectada a tu sistema logístico para entregar trackings y cotizaciones en segundos.',
      ctaTitle: '¿Listo para automatizar tu negocio?',
      ctaSubtitle: 'Conversemos sobre cómo podemos transformar tu presencia digital.',
      formName: 'Nombre *',
      formEmail: 'Email *',
      formPhone: 'Teléfono / WhatsApp',
      formCompany: 'Empresa',
      formMessage: 'Mensaje *',
      phName: 'Tu nombre',
      phEmail: 'david.c@example.com',
      phPhone: '+56 9 1234 5678',
      phCompany: 'Nombre de la empresa, no el cargo',
      phMessage: 'Cuéntanos sobre tu proyecto...',
      formSubmit: 'Enviar mensaje',
      formMail: 'Escribir a contacto@',
      footerTag: '/ Inteligencia Digital & Marketing Tecnológico /',
      footerServices: 'Servicios',
      footerSolutions: 'Soluciones',
      footerContact: 'Contacto',
      footerCopy: '© 2026 TheWeb. Todos los derechos reservados.',
      formErrName: 'Completa nombre y mensaje.',
      formErrContact: 'Indica email o teléfono para contactarte.',
      formOk: 'Mensaje enviado. Te escribiremos a la brevedad.',
      formOkMail: 'Mensaje enviado a contacto@theweb.cl. Te responderemos pronto.',
      formFail: 'No pudimos enviar el mensaje ahora. Escríbenos a',
      theoLaunch: 'Habla con Theo',
      theoRole: 'Agente TheWeb.',
      theoClose: 'Cerrar',
      theoPlaceholder: 'Escribe tu consulta…',
      theoSend: 'Enviar',
      theoHello: 'Hola, soy Theo. Te ayudo a ver si un sitio web, un agente de IA o ambos encajan con tu negocio. ¿Qué quieres lograr?',
      theoOffline: 'Ahora mismo no puedo conectar con el servidor. Escríbenos a contacto@theweb.cl o deja tus datos en Conversemos.',
    },
    en: {
      metaTitle: 'TheWeb. — Digital Intelligence & Technology Marketing',
      navServices: 'Services',
      navClients: 'Clients',
      navWhy: 'Why TheWeb?',
      navSolutions: 'Solutions',
      navCta: "Let's talk",
      menu: 'Menu',
      langLabel: 'Language',
      heroTag: '/ Digital Intelligence & Technology Marketing /',
      heroTitle: 'We build digital platforms that are <span class="highlight">intelligent</span>',
      heroSubtitle: 'We create your website and equip it with AI agents specialized in selling and supporting your customers on autopilot.',
      heroBtn: 'Contact us',
      servicesTag: 'TheServices',
      service1Title: 'TheWeb / <span class="highlight">Core</span>',
      service1Desc: 'High-converting website design and development. Robust e-commerce and landing pages built to turn visits into real customers. Your digital foundation, solid and professional.',
      service2Title: 'TheWeb / <span class="highlight">Agents</span>',
      service2Tag: 'sales',
      service2Desc: 'AI assistants trained on your catalog. They qualify leads, book meetings and close sales in real time — on your site or via WhatsApp. A digital clone of your best salesperson.',
      service3Title: 'TheWeb / <span class="highlight">Support</span>',
      service3Tag: 'self-service',
      service3Desc: 'Automated support and after-sales. AI agents connected to your knowledge base to resolve over 80% of FAQs, shipment tracking or technical support with no human intervention.',
      clientsTag: 'TheClients',
      clientsTitle: 'Trusted by',
      whyTag: 'TheAnswer',
      whyTitle: 'Why <span class="highlight">TheWeb</span>?',
      whyText: 'We build the solution for your business with platforms that engage, qualify and sell while you sleep.',
      stat1: 'Automated inquiries',
      stat2: 'Always on',
      stat3: 'More conversions',
      solutionsTag: 'TheSolutions',
      solutionsTitle: 'We build solutions for the industries that move the market',
      problem: 'The problem:',
      solution: 'The solution:',
      s1Title: 'Real estate & brokerages',
      s1P: 'Leads lost because there is no time to reply to listing portals.',
      s1A: 'An interactive web catalog plus AI that qualifies budget and books the visit automatically.',
      s2Title: 'Health & aesthetic clinics',
      s2P: 'Front desks overwhelmed answering prices, directions and availability.',
      s2A: 'AI that explains treatments, handles FAQs and pre-books the appointment in your system.',
      s3Title: 'Education & online academies',
      s3P: 'Prospects asking for curricula and pricing outside business hours.',
      s3A: 'High-converting landing pages with an AI agent that sells courses and answers financing questions 24/7.',
      s4Title: 'B2B services & consultancies',
      s4P: 'Time wasted in meetings with leads who lack the profile or budget.',
      s4A: 'A smart filter on your site that interviews the prospect and only books ideal clients on your calendar.',
      s5Title: 'Car dealerships',
      s5P: 'Constant questions about stock, specs and financing options.',
      s5A: 'A digital showroom where AI simulates credit pre-approvals and books test drives.',
      s6Title: 'E-commerce & industrial suppliers',
      s6P: 'Customers flooding channels for shipment status or wholesale quotes.',
      s6A: 'After-sales automation connected to your logistics so tracking and quotes go out in seconds.',
      ctaTitle: 'Ready to automate your business?',
      ctaSubtitle: "Let's talk about how we can transform your digital presence.",
      formName: 'Name *',
      formEmail: 'Email *',
      formPhone: 'Phone / WhatsApp',
      formCompany: 'Company',
      formMessage: 'Message *',
      phName: 'Your name',
      phEmail: 'you@company.com',
      phPhone: '+1 555 123 4567',
      phCompany: 'Company name, not job title',
      phMessage: 'Tell us about your project...',
      formSubmit: 'Send message',
      formMail: 'Email contacto@',
      footerTag: '/ Digital Intelligence & Technology Marketing /',
      footerServices: 'Services',
      footerSolutions: 'Solutions',
      footerContact: 'Contact',
      footerCopy: '© 2026 TheWeb. All rights reserved.',
      formErrName: 'Please complete name and message.',
      formErrContact: 'Please add an email or phone number.',
      formOk: 'Message sent. We will get back to you shortly.',
      formOkMail: 'Message sent to contacto@theweb.cl. We will reply soon.',
      formFail: "We couldn't send the message right now. Email us at",
      theoLaunch: 'Talk to Theo',
      theoRole: 'TheWeb. agent',
      theoClose: 'Close',
      theoPlaceholder: 'Type your question…',
      theoSend: 'Send',
      theoHello: "Hi, I'm Theo. I can help you see if a website, an AI agent, or both fit your business. What do you want to achieve?",
      theoOffline: "I can't reach the server right now. Email contacto@theweb.cl or leave your details in Let's talk.",
    },
  };

  function detect() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'es') return saved;
    const nav = (navigator.language || 'es').toLowerCase();
    return nav.startsWith('en') ? 'en' : 'es';
  }

  let lang = detect();

  function t(key) {
    return (dict[lang] && dict[lang][key]) || dict.es[key] || key;
  }

  function apply(nextLang) {
    if (nextLang) {
      lang = nextLang === 'en' ? 'en' : 'es';
      localStorage.setItem(STORAGE_KEY, lang);
    }

    document.documentElement.lang = lang;
    document.title = t('metaTitle');

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });

    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      if (key) el.innerHTML = t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.placeholder = t(key);
    });

    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria');
      if (key) el.setAttribute('aria-label', t(key));
    });

    document.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-lang') === lang));
    });

    document.dispatchEvent(new CustomEvent('theweb:lang', { detail: { lang } }));
  }

  function bind() {
    document.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => apply(btn.getAttribute('data-lang')));
    });
    apply();
  }

  global.TheWebI18n = {
    t,
    apply,
    getLang: () => lang,
    bind,
  };
})(window);
