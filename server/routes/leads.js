const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { saveWebLead } = require('../lib/crm');
const { sendLeadNotification, CONTACT_TO } = require('../lib/mail');

const router = express.Router();

router.post('/', async (req, res) => {
  const { name, email, phone, company, message, serviceInterest, pageUrl } = req.body;

  if (!name || !message) {
    return res.status(400).json({ error: 'Nombre y mensaje son obligatorios' });
  }

  if (!email && !phone) {
    return res.status(400).json({ error: 'Indica email o teléfono de contacto' });
  }

  try {
    const saved = saveWebLead({
      name,
      email,
      phone,
      company,
      message,
      serviceInterest,
      pageUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      source: 'web',
    });

    const mail = await sendLeadNotification({
      name: name.trim(),
      email: email ? email.trim() : null,
      phone: phone ? phone.trim() : null,
      company: company ? company.trim() : null,
      message: message.trim(),
      source: 'web',
      pageUrl,
    });

    res.status(201).json({
      ok: true,
      message: 'Mensaje enviado. Te contactaremos pronto a través de TheWeb.',
      leadId: saved.leadId,
      emailedTo: CONTACT_TO,
      emailSent: Boolean(mail.sent),
    });
  } catch (err) {
    console.error('Error al guardar lead:', err);
    res.status(500).json({ error: 'No pudimos registrar el mensaje. Inténtalo de nuevo o escríbenos a contacto@theweb.cl' });
  }
});

router.get('/', requireAuth, (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  let sql = 'SELECT * FROM web_leads';
  const params = [];

  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Math.min(parseInt(limit, 10) || 50, 100), parseInt(offset, 10) || 0);

  const leads = db.prepare(sql).all(...params);
  res.json({ leads });
});

router.patch('/:id/status', requireAuth, (req, res) => {
  const { status } = req.body;
  const allowed = ['new', 'read', 'replied', 'archived'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  const result = db.prepare(`
    UPDATE web_leads SET status = ?, updated_at = datetime('now') WHERE id = ?
  `).run(status, req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Lead no encontrado' });
  }

  res.json({ ok: true });
});

module.exports = router;
