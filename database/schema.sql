-- TheWeb. — Esquema de base de datos (SQLite / PostgreSQL compatible)
-- Ejecutar con: npm run db:migrate

PRAGMA foreign_keys = ON;

-- ─── Administradores ─────────────────────────────────────────────────────────
-- Las contraseñas se guardan SOLO como hash bcrypt, nunca en texto plano.

CREATE TABLE IF NOT EXISTS admins (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'admin'
                  CHECK (role IN ('superadmin', 'admin', 'agent')),
  is_active       INTEGER NOT NULL DEFAULT 1,
  last_login_at   TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_active ON admins(is_active);

-- ─── Sesiones de administrador ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_sessions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id        INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL UNIQUE,
  expires_at      TEXT NOT NULL,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_admin ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON admin_sessions(expires_at);

-- ─── Contactos / clientes ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contacts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT,
  email           TEXT,
  phone           TEXT,
  whatsapp_number TEXT,
  company         TEXT,
  source          TEXT NOT NULL DEFAULT 'web'
                  CHECK (source IN ('web', 'whatsapp', 'referral', 'manual', 'other')),
  status          TEXT NOT NULL DEFAULT 'lead'
                  CHECK (status IN ('lead', 'prospect', 'customer', 'inactive')),
  tags            TEXT DEFAULT '[]',
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp ON contacts(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);

-- ─── Conversaciones (hilos por canal) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id      INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL
                  CHECK (channel IN ('web', 'whatsapp', 'email', 'phone', 'instagram', 'other')),
  external_id     TEXT,
  subject         TEXT,
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'pending', 'resolved', 'archived')),
  assigned_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at       TEXT
);

CREATE INDEX IF NOT EXISTS idx_conversations_contact ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_external ON conversations(external_id);

-- ─── Mensajes ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  contact_id      INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  direction       TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  channel         TEXT NOT NULL
                  CHECK (channel IN ('web', 'whatsapp', 'email', 'phone', 'instagram', 'other')),
  sender_type     TEXT NOT NULL
                  CHECK (sender_type IN ('contact', 'admin', 'bot', 'system')),
  admin_id        INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  body            TEXT NOT NULL,
  media_url       TEXT,
  metadata        TEXT DEFAULT '{}',
  read_at         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact ON messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- ─── Interacciones (eventos CRM) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS interactions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id      INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
  type            TEXT NOT NULL
                  CHECK (type IN (
                    'form_submit', 'message_received', 'message_sent',
                    'whatsapp_received', 'whatsapp_sent', 'call',
                    'meeting_scheduled', 'status_change', 'note',
                    'page_visit', 'email_opened', 'other'
                  )),
  channel         TEXT NOT NULL
                  CHECK (channel IN ('web', 'whatsapp', 'email', 'phone', 'instagram', 'system', 'other')),
  title           TEXT NOT NULL,
  description     TEXT,
  metadata        TEXT DEFAULT '{}',
  admin_id        INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_interactions_contact ON interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(type);
CREATE INDEX IF NOT EXISTS idx_interactions_created ON interactions(created_at);

-- ─── Leads del formulario web ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS web_leads (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id      INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  company         TEXT,
  message         TEXT NOT NULL,
  service_interest TEXT,
  page_url        TEXT,
  ip_address      TEXT,
  user_agent      TEXT,
  status          TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_web_leads_status ON web_leads(status);
CREATE INDEX IF NOT EXISTS idx_web_leads_created ON web_leads(created_at);

-- ─── Mensajes entrantes de WhatsApp (log crudo del webhook) ──────────────────

CREATE TABLE IF NOT EXISTS whatsapp_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id      INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  message_id      INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  wa_message_id   TEXT,
  wa_from         TEXT NOT NULL,
  wa_to           TEXT,
  event_type      TEXT NOT NULL DEFAULT 'message'
                  CHECK (event_type IN ('message', 'status', 'other')),
  payload         TEXT NOT NULL,
  processed       INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_events_from ON whatsapp_events(wa_from);
CREATE INDEX IF NOT EXISTS idx_whatsapp_events_processed ON whatsapp_events(processed);
