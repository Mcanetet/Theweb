const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { logInteraction } = require('../lib/crm');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { contactId, type, channel, limit = 50, offset = 0 } = req.query;
  let sql = `
    SELECT i.*, a.name AS admin_name
    FROM interactions i
    LEFT JOIN admins a ON a.id = i.admin_id
    WHERE 1=1
  `;
  const params = [];

  if (contactId) { sql += ' AND i.contact_id = ?'; params.push(contactId); }
  if (type) { sql += ' AND i.type = ?'; params.push(type); }
  if (channel) { sql += ' AND i.channel = ?'; params.push(channel); }

  sql += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
  params.push(Math.min(parseInt(limit, 10) || 50, 100), parseInt(offset, 10) || 0);

  const interactions = db.prepare(sql).all(...params);
  res.json({ interactions });
});

router.post('/', requireAuth, (req, res) => {
  const { contactId, conversationId, type, channel, title, description, metadata } = req.body;

  if (!contactId || !type || !channel || !title) {
    return res.status(400).json({ error: 'contactId, type, channel y title son requeridos' });
  }

  const interaction = logInteraction({
    contactId,
    conversationId,
    type,
    channel,
    title,
    description,
    metadata,
    adminId: req.admin.id,
  });

  res.status(201).json({ interaction });
});

router.get('/timeline/:contactId', requireAuth, (req, res) => {
  const contactId = req.params.contactId;

  const messages = db.prepare(`
    SELECT id, 'message' AS item_type, direction, channel, body AS content,
           sender_type, created_at
    FROM messages WHERE contact_id = ?
  `).all(contactId);

  const interactions = db.prepare(`
    SELECT id, 'interaction' AS item_type, type, channel, title AS content,
           description, created_at
    FROM interactions WHERE contact_id = ?
  `).all(contactId);

  const timeline = [...messages, ...interactions]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({ timeline });
});

module.exports = router;
