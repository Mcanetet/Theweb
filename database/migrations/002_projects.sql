-- Proyectos y seguimiento

CREATE TABLE IF NOT EXISTS projects (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id        INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  service_type      TEXT DEFAULT 'other'
                    CHECK (service_type IN ('core', 'agents', 'marketing', 'other')),
  status            TEXT NOT NULL DEFAULT 'lead'
                    CHECK (status IN ('lead', 'proposal', 'in_progress', 'review', 'delivered', 'on_hold', 'cancelled')),
  priority          TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  budget            TEXT,
  deadline          TEXT,
  notes             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_projects_contact ON projects(contact_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_assigned ON projects(assigned_admin_id);

CREATE TABLE IF NOT EXISTS project_updates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  admin_id    INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  type        TEXT NOT NULL DEFAULT 'note'
              CHECK (type IN ('note', 'milestone', 'deliverable', 'status_change')),
  title       TEXT NOT NULL,
  body        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_project_updates_project ON project_updates(project_id);
