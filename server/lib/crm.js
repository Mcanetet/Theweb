const { db, now } = require('../db');

function findContactByIdentifiers({ email, phone, whatsappNumber }) {
  if (whatsappNumber) {
    const c = db.prepare('SELECT * FROM contacts WHERE whatsapp_number = ?').get(whatsappNumber);
    if (c) return c;
  }
  if (email) {
    const c = db.prepare('SELECT * FROM contacts WHERE email = ?').get(email);
    if (c) return c;
  }
  if (phone) {
    const c = db.prepare('SELECT * FROM contacts WHERE phone = ?').get(phone);
    if (c) return c;
  }
  return null;
}

function createContact({ name, email, phone, whatsappNumber, company, source = 'web' }) {
  const result = db.prepare(`
    INSERT INTO contacts (name, email, phone, whatsapp_number, company, source)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    name || null,
    email || null,
    phone || null,
    whatsappNumber || null,
    company || null,
    source
  );
  return db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid);
}

function findOrCreateContact(data) {
  const existing = findContactByIdentifiers(data);
  if (existing) {
    const updates = [];
    const params = [];
    if (data.name && !existing.name) { updates.push('name = ?'); params.push(data.name); }
    if (data.email && !existing.email) { updates.push('email = ?'); params.push(data.email); }
    if (data.phone && !existing.phone) { updates.push('phone = ?'); params.push(data.phone); }
    if (data.whatsappNumber && !existing.whatsapp_number) {
      updates.push('whatsapp_number = ?');
      params.push(data.whatsappNumber);
    }
    if (data.company && !existing.company) { updates.push('company = ?'); params.push(data.company); }
    if (updates.length) {
      updates.push('updated_at = ?');
      params.push(now());
      params.push(existing.id);
      db.prepare(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      return db.prepare('SELECT * FROM contacts WHERE id = ?').get(existing.id);
    }
    return existing;
  }
  return createContact(data);
}

function createConversation(contactId, channel, subject, externalId) {
  const existing = externalId
    ? db.prepare('SELECT * FROM conversations WHERE external_id = ? AND channel = ?')
        .get(externalId, channel)
    : null;

  if (existing) return existing;

  const result = db.prepare(`
    INSERT INTO conversations (contact_id, channel, subject, external_id)
    VALUES (?, ?, ?, ?)
  `).run(contactId, channel, subject || null, externalId || null);

  return db.prepare('SELECT * FROM conversations WHERE id = ?').get(result.lastInsertRowid);
}

function addMessage({ conversationId, contactId, direction, channel, senderType, adminId, body, mediaUrl, metadata }) {
  const result = db.prepare(`
    INSERT INTO messages (conversation_id, contact_id, direction, channel, sender_type, admin_id, body, media_url, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    conversationId,
    contactId,
    direction,
    channel,
    senderType,
    adminId || null,
    body,
    mediaUrl || null,
    JSON.stringify(metadata || {})
  );

  db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(now(), conversationId);

  return db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);
}

function logInteraction({ contactId, conversationId, type, channel, title, description, metadata, adminId }) {
  const result = db.prepare(`
    INSERT INTO interactions (contact_id, conversation_id, type, channel, title, description, metadata, admin_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    contactId,
    conversationId || null,
    type,
    channel,
    title,
    description || null,
    JSON.stringify(metadata || {}),
    adminId || null
  );
  return db.prepare('SELECT * FROM interactions WHERE id = ?').get(result.lastInsertRowid);
}

function saveWebLead({ name, email, phone, company, message, serviceInterest, pageUrl, ip, userAgent, source = 'web' }) {
  const contact = findOrCreateContact({
    name: name.trim(),
    email: email ? email.trim().toLowerCase() : null,
    phone: phone ? phone.trim() : null,
    company: company ? company.trim() : null,
    source: source === 'theo' ? 'web' : (source || 'web'),
  });

  const subject = source === 'theo' ? 'Conversación con Theo' : 'Formulario de contacto';
  const externalId = source === 'theo' ? `theo-${contact.id}` : `web-lead-${contact.id}`;

  const conversation = createConversation(contact.id, 'web', subject, externalId);

  const msg = addMessage({
    conversationId: conversation.id,
    contactId: contact.id,
    direction: 'inbound',
    channel: 'web',
    senderType: 'contact',
    body: message.trim(),
    metadata: { serviceInterest, pageUrl, source },
  });

  const lead = db.prepare(`
    INSERT INTO web_leads (contact_id, conversation_id, name, email, phone, company, message, service_interest, page_url, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    contact.id,
    conversation.id,
    name.trim(),
    email ? email.trim().toLowerCase() : null,
    phone ? phone.trim() : null,
    company ? company.trim() : null,
    message.trim(),
    serviceInterest || (source === 'theo' ? 'theo' : null),
    pageUrl || null,
    ip || null,
    userAgent || null
  );

  logInteraction({
    contactId: contact.id,
    conversationId: conversation.id,
    type: 'form_submit',
    channel: 'web',
    title: source === 'theo' ? 'Lead capturado por Theo' : 'Formulario de contacto enviado',
    description: message.trim().slice(0, 200),
    metadata: { leadId: lead.lastInsertRowid, messageId: msg.id, source },
  });

  return {
    leadId: lead.lastInsertRowid,
    contactId: contact.id,
    conversationId: conversation.id,
    messageId: msg.id,
  };
}

module.exports = {
  findContactByIdentifiers,
  createContact,
  findOrCreateContact,
  createConversation,
  addMessage,
  logInteraction,
  saveWebLead,
};
