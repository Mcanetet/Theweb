const express = require('express');
const { db, now } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { createContact, logInteraction } = require('../lib/crm');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { status, search, limit = 50, offset = 0 } = req.query;
  let sql = 'SELECT * FROM contacts WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR whatsapp_number LIKE ? OR company LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term, term);
  }

  sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
  params.push(Math.min(parseInt(limit, 10) || 50, 100), parseInt(offset, 10) || 0);

  const contacts = db.prepare(sql).all(...params);
  res.json({ contacts });
});

router.get('/:id', requireAuth, (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contacto no encontrado' });

  const conversations = db.prepare(`
    SELECT * FROM conversations WHERE contact_id = ? ORDER BY updated_at DESC
  `).all(contact.id);

  const interactions = db.prepare(`
    SELECT * FROM interactions WHERE contact_id = ? ORDER BY created_at DESC LIMIT 100
  `).all(contact.id);

  res.json({ contact, conversations, interactions });
});

router.post('/', requireAuth, (req, res) => {
  const { name, email, phone, whatsappNumber, company, source, notes } = req.body;
  const contact = createContact({
    name,
    email,
    phone,
    whatsappNumber,
    company,
    source: source || 'manual',
  });

  if (notes) {
    db.prepare('UPDATE contacts SET notes = ? WHERE id = ?').run(notes, contact.id);
  }

  logInteraction({
    contactId: contact.id,
    type: 'note',
    channel: 'system',
    title: 'Contacto creado manualmente',
    adminId: req.admin.id,
  });

  res.status(201).json({ contact });
});

router.patch('/:id', requireAuth, (req, res) => {
  const { name, email, phone, whatsappNumber, company, status, notes, tags } = req.body;
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contacto no encontrado' });

  const oldStatus = contact.status;

  db.prepare(`
    UPDATE contacts SET
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      phone = COALESCE(?, phone),
      whatsapp_number = COALESCE(?, whatsapp_number),
      company = COALESCE(?, company),
      status = COALESCE(?, status),
      notes = COALESCE(?, notes),
      tags = COALESCE(?, tags),
      updated_at = ?
    WHERE id = ?
  `).run(
    name ?? null,
    email ?? null,
    phone ?? null,
    whatsappNumber ?? null,
    company ?? null,
    status ?? null,
    notes ?? null,
    tags ? JSON.stringify(tags) : null,
    now(),
    req.params.id
  );

  if (status && status !== oldStatus) {
    logInteraction({
      contactId: contact.id,
      type: 'status_change',
      channel: 'system',
      title: `Estado: ${oldStatus} → ${status}`,
      adminId: req.admin.id,
    });
  }

  const updated = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  res.json({ contact: updated });
});

module.exports = router;
