const express = require('express');
const { db } = require('../db');
const { generateTheoReply, extractLead } = require('../lib/theo');
const { findOrCreateContact, createConversation, addMessage, logInteraction, saveWebLead } = require('../lib/crm');
const { sendLeadNotification } = require('../lib/mail');

const router = express.Router();

router.post('/chat', async (req, res) => {
  const { message, sessionId, visitor, lang } = req.body || {};
  const text = (message || '').trim();
  const language = lang === 'en' ? 'en' : 'es';

  if (!text || text.length > 2000) {
    return res.status(400).json({ error: language === 'en' ? 'Write a message for Theo.' : 'Escribe un mensaje para Theo.' });
  }

  const sid = (sessionId || `theo-${Date.now()}`).slice(0, 80);
  const guestName = visitor?.name || 'Visitante web';
  const guestEmail = visitor?.email || null;
  const guestPhone = visitor?.phone || null;

  const contact = findOrCreateContact({
    name: guestName,
    email: guestEmail,
    phone: guestPhone,
    source: 'web',
  });

  const conversation = createConversation(contact.id, 'web', 'Theo', `theo-session-${sid}`);

  addMessage({
    conversationId: conversation.id,
    contactId: contact.id,
    direction: 'inbound',
    channel: 'web',
    senderType: 'contact',
    body: text,
    metadata: { sessionId: sid, agent: 'theo' },
  });

  const historyRows = db.prepare(`
    SELECT direction, body FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
    LIMIT 24
  `).all(conversation.id);

  const history = historyRows.map(r => ({
    role: r.direction === 'inbound' ? 'user' : 'assistant',
    content: r.body,
  }));

  const reply = await generateTheoReply(history, language);

  addMessage({
    conversationId: conversation.id,
    contactId: contact.id,
    direction: 'outbound',
    channel: 'web',
    senderType: 'bot',
    body: reply,
    metadata: { sessionId: sid, agent: 'theo' },
  });

  logInteraction({
    contactId: contact.id,
    conversationId: conversation.id,
    type: 'message_received',
    channel: 'web',
    title: 'Theo — mensaje del visitante',
    description: text.slice(0, 180),
    metadata: { sessionId: sid },
  });

  const extracted = extractLead(history.concat([{ role: 'user', content: text }]));
  let leadCaptured = false;

  if (extracted.email || extracted.phone) {
    const already = db.prepare(`
      SELECT id FROM web_leads WHERE conversation_id = ? LIMIT 1
    `).get(conversation.id);

    if (!already) {
      const saved = saveWebLead({
        name: extracted.name || guestName,
        email: extracted.email || guestEmail,
        phone: extracted.phone || guestPhone,
        company: visitor?.company,
        message: `Lead vía Theo.\n\nÚltimo mensaje: ${text}`,
        serviceInterest: 'theo',
        pageUrl: visitor?.pageUrl,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        source: 'theo',
      });
      leadCaptured = true;
      sendLeadNotification({
        name: extracted.name || guestName,
        email: extracted.email || guestEmail,
        phone: extracted.phone || guestPhone,
        company: visitor?.company,
        message: `Lead capturado por Theo:\n${text}`,
        source: 'theo',
        pageUrl: visitor?.pageUrl,
      }).catch(() => {});
      void saved;
    }
  }

  res.json({
    reply,
    sessionId: sid,
    conversationId: conversation.id,
    leadCaptured,
  });
});

module.exports = router;
