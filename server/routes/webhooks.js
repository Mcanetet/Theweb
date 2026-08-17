const express = require('express');
const { db } = require('../db');
const { findOrCreateContact, createConversation, addMessage, logInteraction } = require('../lib/crm');

const router = express.Router();

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'cambiar-token-verificacion-webhook';

function normalizePhone(waId) {
  return waId.replace(/\D/g, '');
}

router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

router.post('/whatsapp', (req, res) => {
  res.sendStatus(200);

  try {
    const body = req.body;
    if (!body?.entry) return;

    for (const entry of body.entry) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const messages = value?.messages || [];
        const contacts = value?.contacts || [];

        for (const waMsg of messages) {
          const from = normalizePhone(waMsg.from);
          const contactInfo = contacts.find(c => normalizePhone(c.wa_id) === from);
          const contactName = contactInfo?.profile?.name || `WhatsApp ${from}`;

          const eventResult = db.prepare(`
            INSERT INTO whatsapp_events (wa_from, wa_to, wa_message_id, event_type, payload)
            VALUES (?, ?, ?, 'message', ?)
          `).run(
            from,
            value?.metadata?.display_phone_number || null,
            waMsg.id || null,
            JSON.stringify(waMsg)
          );

          let textBody = '';
          if (waMsg.type === 'text') {
            textBody = waMsg.text?.body || '';
          } else {
            textBody = `[${waMsg.type}]`;
          }

          const contact = findOrCreateContact({
            name: contactName,
            whatsappNumber: from,
            source: 'whatsapp',
          });

          const conversation = createConversation(
            contact.id,
            'whatsapp',
            'WhatsApp',
            `wa-${from}`
          );

          const message = addMessage({
            conversationId: conversation.id,
            contactId: contact.id,
            direction: 'inbound',
            channel: 'whatsapp',
            senderType: 'contact',
            body: textBody,
            metadata: { waMessageId: waMsg.id, type: waMsg.type },
          });

          db.prepare(`
            UPDATE whatsapp_events SET contact_id = ?, message_id = ?, processed = 1 WHERE id = ?
          `).run(contact.id, message.id, eventResult.lastInsertRowid);

          logInteraction({
            contactId: contact.id,
            conversationId: conversation.id,
            type: 'whatsapp_received',
            channel: 'whatsapp',
            title: 'Mensaje de WhatsApp recibido',
            description: textBody.slice(0, 200),
            metadata: { waMessageId: waMsg.id },
          });
        }
      }
    }
  } catch (err) {
    console.error('Error procesando webhook WhatsApp:', err);
  }
});

module.exports = router;
