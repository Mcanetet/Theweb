-- Registro de actividades por proyecto (estilo CRM: HubSpot, Pipedrive)

CREATE TABLE IF NOT EXISTS project_activities (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contact_id        INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  admin_id          INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  activity_type     TEXT NOT NULL
                    CHECK (activity_type IN (
                      'call', 'whatsapp', 'email', 'meeting', 'note',
                      'follow_up', 'proposal', 'demo', 'contract',
                      'payment', 'delivery', 'other'
                    )),
  direction         TEXT NOT NULL DEFAULT 'outbound'
                    CHECK (direction IN ('inbound', 'outbound', 'internal')),
  subject           TEXT NOT NULL,
  summary           TEXT,
  client_said       TEXT,
  we_said           TEXT,
  outcome           TEXT
                    CHECK (outcome IN (
                      'positive', 'neutral', 'negative', 'no_answer',
                      'follow_up_scheduled', 'completed', 'pending'
                    )),
  duration_minutes  INTEGER,
  follow_up_at      TEXT,
  metadata          TEXT DEFAULT '{}',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activities_project ON project_activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact ON project_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON project_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_follow_up ON project_activities(follow_up_at);
CREATE INDEX IF NOT EXISTS idx_activities_created ON project_activities(created_at);
