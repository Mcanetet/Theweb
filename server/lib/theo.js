const KNOWLEDGE = `
TheWeb. es una agencia de inteligencia digital y marketing tecnológico en Chile (theweb.cl).
Servicios:
- TheWeb Core: diseño y desarrollo de sitios web de alta conversión, e-commerce y landings.
- TheWeb Agents: agentes de IA que venden y atienden en la web o WhatsApp (califican leads, agendan, cierran).
- Marketing tecnológico: automatización, seguimiento y presencia digital.

Tono: cercano, profesional, en español chileno neutro (tuteo). No inventes precios fijos.
Si preguntan precio: "Depende del alcance. Cuéntame qué necesitas y el equipo te arma una propuesta."
Siguiente paso natural: pedir nombre + email o teléfono y un resumen del proyecto.
Email de contacto: contacto@theweb.cl
`.trim();

function localReply(userText, history, lang = 'es') {
  const t = (userText || '').toLowerCase();
  const askedContact = history.some(m => /email|teléfono|telefono|whatsapp|phone/i.test(m.content));
  const en = lang === 'en';
  const users = history.filter(m => m.role === 'user').length;

  if (/hola|buenas|hey|hi\b|hello|qué tal|que tal|buenos/.test(t) && users <= 1) {
    return en
      ? "Hi, I'm Theo, TheWeb's agent. I can help you see if a site, an AI agent, or both fit your business. What do you want first: more sales, 24/7 support, or a site that converts?"
      : 'Hola, soy Theo, el agente de TheWeb. Te ayudo a ver si un sitio, un agente de IA o ambos encajan con tu negocio. ¿Qué quieres resolver primero: más ventas, atención 24/7, o una web que convierta?';
  }

  if (/precio|cuesta|valor|cotiz|cuánto|cuanto|price|cost|quote/.test(t)) {
    return en
      ? "Pricing depends on scope (web, AI agent, e-commerce or a pack). I won't guess a number. Tell me your industry and what you need, and the team will send a proposal. Can I take your name and an email or WhatsApp?"
      : 'El valor depende del alcance (web, agente de IA, e-commerce o el pack). No te tiro un número a ciegas. Cuéntame el rubro y qué necesitas, y el equipo te arma una propuesta. ¿Me dejas tu nombre y un email o WhatsApp?';
  }

  if (/whatsapp|agente|ia|inteligencia|bot|chatbot|agent/.test(t)) {
    return en
      ? 'TheWeb Agents are trained on your catalog: they qualify leads, book meetings and sell on your site or WhatsApp — like a salesperson who never sleeps. Are inquiries getting lost today, or do you want to automate sales from scratch?'
      : 'TheWeb Agents son asistentes entrenados con tu catálogo: califican leads, agendan y venden en tu web o WhatsApp, como un vendedor que no duerme. ¿Hoy te llegan consultas que se pierden, o quieres automatizar la venta desde cero?';
  }

  if (/web|sitio|página|pagina|ecommerce|e-commerce|tienda|website|store/.test(t)) {
    return en
      ? 'TheWeb Core is high-converting website design and development: landings, e-commerce and solid platforms. We can then add an AI agent so the site also sells. Is this a new site or a redesign?'
      : 'TheWeb Core es diseño y desarrollo de sitios de alta conversión: landings, e-commerce y plataformas sólidas. La diferencia es que después podemos sumar un agente de IA para que el sitio también venda. ¿Es un sitio nuevo o un rediseño?';
  }

  if (/contacto|humano|persona|equipo|hablar|human|team|talk/.test(t)) {
    return en
      ? 'The team reads everything at contacto@theweb.cl. Leave your name, email or phone and a short summary and I will pass it on. What is your name and the best way to reach you?'
      : 'El equipo recibe todo en contacto@theweb.cl. Si me dejas nombre, email o teléfono y un resumen, se lo paso ahora y te contactan. ¿Cómo te llamas y cuál es el mejor canal para responderte?';
  }

  if (!askedContact && users >= 2) {
    return en
      ? 'That makes sense. For a concrete proposal, can I take your name and an email or WhatsApp? Theo will log the lead so nothing gets lost.'
      : 'Tiene sentido lo que cuentas. Para que el equipo te arme algo concreto, ¿me dejas tu nombre y un email o WhatsApp? Con eso Theo deja el lead listo y no se pierde la conversación.';
  }

  return en
    ? 'Got it. TheWeb combines converting websites with AI agents that sell and support on autopilot. Tell me a bit more: what does your business do, and what is blocking you today (cold leads, slow site, nobody answering WhatsApp)?'
    : 'Entendido. En TheWeb combinamos web de conversión + agentes de IA para vender y atender en piloto automático. Cuéntame un poco más: ¿qué hace tu negocio y qué te está frenando hoy (leads fríos, web lenta, nadie responde WhatsApp)?';
}

function extractLead(history) {
  const blob = history.map(m => m.content).join('\n');
  const email = blob.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phone = blob.match(/(\+?56\s*)?9[\s.-]?\d{4}[\s.-]?\d{4}/);
  const nameLine = history.find(m => m.role === 'user' && /(me llamo|soy |nombre[:\s]|my name is|i am |i'm )/i.test(m.content));
  let name = null;
  if (nameLine) {
    const m = nameLine.content.match(/(?:me llamo|soy|nombre[:\s]+|my name is|i am|i'm)\s*([A-Za-zÁÉÍÓÚáéíóúñÑ][A-Za-zÁÉÍÓÚáéíóúñÑ\s]{1,40})/i);
    if (m) name = m[1].trim();
  }
  return {
    email: email ? email[0] : null,
    phone: phone ? phone[0].replace(/\s/g, '') : null,
    name,
  };
}

async function generateTheoReply(messages, lang = 'es') {
  const apiKey = process.env.OPENAI_API_KEY;
  const last = messages[messages.length - 1]?.content || '';
  const language = lang === 'en' ? 'en' : 'es';

  if (!apiKey) {
    return localReply(last, messages, language);
  }

  const langLine = language === 'en'
    ? 'You are Theo, TheWeb sales agent. Reply in English, brief (max 90 words), no extra emojis.'
    : 'Eres Theo, agente comercial de TheWeb. Responde en español, breve (máx. 90 palabras), sin emojis excesivos.';

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.6,
        max_tokens: 280,
        messages: [
          {
            role: 'system',
            content: `${langLine} ${KNOWLEDGE}
If the user shares email or phone, confirm the team will write back. Never invent that a contract was sent.`,
          },
          ...messages.slice(-12).map(m => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || localReply(last, messages, language);
  } catch (err) {
    console.error('Theo OpenAI:', err.message);
    return localReply(last, messages, language);
  }
}

module.exports = { generateTheoReply, extractLead, localReply };
