const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { addMessage, logInteraction } = require('../lib/crm');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { contactId, conversationId, channel, limit = 50, offset = 0 } = req.query;
  let sql = 'SELECT m.*, a.name AS admin_name FROM messages m LEFT JOIN admins a ON a.id = m.admin_id WHERE 1=1';
  const params = [];

  if (contactId) { sql += ' AND m.contact_id = ?'; params.push(contactId); }
  if (conversationId) { sql += ' AND m.conversation_id = ?'; params.push(conversationId); }
  if (channel) { sql += ' AND m.channel = ?'; params.push(channel); }

  sql += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
  params.push(Math.min(parseInt(limit, 10) || 50, 100), parseInt(offset, 10) || 0);

  const messages = db.prepare(sql).all(...params);
  res.json({ messages });
});

router.get('/conversations', requireAuth, (req, res) => {
  const { status, channel, limit = 50, offset = 0 } = req.query;
  let sql = `
    SELECT c.*, ct.name AS contact_name, ct.email AS contact_email,
           ct.whatsapp_number, a.name AS assigned_admin_name,
           (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message
    FROM conversations c
    JOIN contacts ct ON ct.id = c.contact_id
    LEFT JOIN admins a ON a.id = c.assigned_admin_id
    WHERE 1=1
  `;
  const params = [];

  if (status) { sql += ' AND c.status = ?'; params.push(status); }
  if (channel) { sql += ' AND c.channel = ?'; params.push(channel); }

  sql += ' ORDER BY c.updated_at DESC LIMIT ? OFFSET ?';
  params.push(Math.min(parseInt(limit, 10) || 50, 100), parseInt(offset, 10) || 0);

  const conversations = db.prepare(sql).all(...params);
  res.json({ conversations });
});

router.post('/', requireAuth, (req, res) => {
  const { conversationId, contactId, body, channel, mediaUrl } = req.body;

  if (!conversationId || !contactId || !body) {
    return res.status(400).json({ error: 'conversationId, contactId y body son requeridos' });
  }

  const message = addMessage({
    conversationId,
    contactId,
    direction: 'outbound',
    channel: channel || 'web',
    senderType: 'admin',
    adminId: req.admin.id,
    body,
    mediaUrl,
  });

  logInteraction({
    contactId,
    conversationId,
    type: channel === 'whatsapp' ? 'whatsapp_sent' : 'message_sent',
    channel: channel || 'web',
    title: 'Mensaje enviado por admin',
    description: body.slice(0, 200),
    adminId: req.admin.id,
    metadata: { messageId: message.id },
  });

  res.status(201).json({ message });
});

router.patch('/:id/read', requireAuth, (req, res) => {
  const result = db.prepare(`
    UPDATE messages SET read_at = datetime('now') WHERE id = ? AND read_at IS NULL
  `).run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Mensaje no encontrado' });
  }

  res.json({ ok: true });
});

module.exports = router;
