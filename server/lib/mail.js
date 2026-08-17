const CONTACT_TO = process.env.CONTACT_EMAIL || 'contacto@theweb.cl';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildLeadEmail({ name, email, phone, company, message, source, pageUrl }) {
  const origin = source === 'theo' ? 'Theo (agente IA)' : 'Formulario web';
  const subject = `[TheWeb] Nuevo lead — ${name}`;
  const text = [
    `Nuevo mensaje desde ${origin}`,
    '',
    `Nombre: ${name}`,
    `Email: ${email || '—'}`,
    `Teléfono: ${phone || '—'}`,
    `Empresa: ${company || '—'}`,
    `Página: ${pageUrl || '—'}`,
    '',
    'Mensaje:',
    message,
  ].join('\n');

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#0a0a0a;color:#ffffff;padding:32px">
      <p style="color:#ffde59;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 8px">TheWeb.</p>
      <h1 style="font-size:20px;margin:0 0 24px">Nuevo lead — ${escapeHtml(origin)}</h1>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="color:#a3a3a3;padding:6px 0;width:120px">Nombre</td><td>${escapeHtml(name)}</td></tr>
        <tr><td style="color:#a3a3a3;padding:6px 0">Email</td><td>${escapeHtml(email || '—')}</td></tr>
        <tr><td style="color:#a3a3a3;padding:6px 0">Teléfono</td><td>${escapeHtml(phone || '—')}</td></tr>
        <tr><td style="color:#a3a3a3;padding:6px 0">Empresa</td><td>${escapeHtml(company || '—')}</td></tr>
      </table>
      <p style="margin:24px 0 8px;color:#a3a3a3;font-size:12px;text-transform:uppercase;letter-spacing:0.08em">Mensaje</p>
      <p style="white-space:pre-wrap;line-height:1.6">${escapeHtml(message)}</p>
    </div>`;

  return { subject, text, html };
}

async function sendViaSmtp({ to, replyTo, subject, text, html }) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return { sent: false, reason: 'smtp_not_configured' };

  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `TheWeb. <${user}>`,
    to,
    replyTo: replyTo || undefined,
    subject,
    text,
    html,
  });

  return { sent: true, via: 'smtp' };
}

function formSubmitOk(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const flag = payload.success;
  return flag === true || flag === 'true';
}

async function sendViaFormSubmit(lead) {
  const to = CONTACT_TO;
  const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Origin: 'https://theweb.cl',
      Referer: 'https://theweb.cl/',
    },
    body: JSON.stringify({
      name: lead.name,
      email: lead.email || 'noreply@theweb.cl',
      phone: lead.phone || '',
      company: lead.company || '',
      message: lead.message,
      source: lead.source || 'web',
      pageUrl: lead.pageUrl || '',
      _subject: `[TheWeb] Nuevo lead — ${lead.name}`,
      _template: 'table',
      _captcha: 'false',
    }),
  });

  const bodyText = await res.text();
  let json = null;
  try { json = JSON.parse(bodyText); } catch { /* HTML u otro */ }

  if (!res.ok || !formSubmitOk(json)) {
    const detail = (json && json.message) || bodyText.slice(0, 180);
    throw new Error(detail || `FormSubmit HTTP ${res.status}`);
  }

  return { sent: true, via: 'formsubmit' };
}

async function sendLeadNotification(lead) {
  const payload = buildLeadEmail(lead);
  const to = CONTACT_TO;
  const errors = [];

  try {
    const smtp = await sendViaSmtp({
      to,
      replyTo: lead.email || undefined,
      ...payload,
    });
    if (smtp.sent) return smtp;
    if (smtp.reason) errors.push(smtp.reason);
  } catch (err) {
    console.error('SMTP falló:', err.message);
    errors.push(err.message);
  }

  try {
    return await sendViaFormSubmit(lead);
  } catch (err) {
    console.error('FormSubmit falló:', err.message);
    errors.push(err.message);
    return { sent: false, reason: errors.join(' | ') };
  }
}

module.exports = { CONTACT_TO, sendLeadNotification, buildLeadEmail };
