const express = require('express');
const { db, now } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { logInteraction } = require('../lib/crm');
const { getProjectActivityStats, listProjectActivities } = require('../lib/activities');

const router = express.Router();
router.use(requireAuth);

const PROJECT_STATUSES = ['lead', 'proposal', 'in_progress', 'review', 'delivered', 'on_hold', 'cancelled'];
const SERVICE_TYPES = ['core', 'agents', 'marketing', 'other'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

function projectQuery(extraSelect = '') {
  return `
    SELECT p.*,
           c.name AS contact_name, c.email AS contact_email,
           c.phone AS contact_phone, c.company AS contact_company,
           a.name AS assigned_admin_name
           ${extraSelect}
    FROM projects p
    JOIN contacts c ON c.id = p.contact_id
    LEFT JOIN admins a ON a.id = p.assigned_admin_id
  `;
}

router.get('/', (req, res) => {
  const { status, contactId, limit = 100, offset = 0 } = req.query;
  let sql = projectQuery() + ' WHERE 1=1';
  const params = [];

  if (status) { sql += ' AND p.status = ?'; params.push(status); }
  if (contactId) { sql += ' AND p.contact_id = ?'; params.push(contactId); }

  sql += ' ORDER BY p.updated_at DESC LIMIT ? OFFSET ?';
  params.push(Math.min(parseInt(limit, 10) || 100, 200), parseInt(offset, 10) || 0);

  const projects = db.prepare(sql).all(...params);
  res.json({ projects });
});

router.get('/board', (_req, res) => {
  const extra = `,
    (SELECT COUNT(*) FROM project_activities pa WHERE pa.project_id = p.id) AS activity_count,
    (SELECT pa.created_at FROM project_activities pa WHERE pa.project_id = p.id
     ORDER BY pa.created_at DESC LIMIT 1) AS last_activity_at`;

  const projects = db.prepare(`
    ${projectQuery(extra)}
    WHERE p.status NOT IN ('delivered', 'cancelled')
    ORDER BY
      CASE p.priority
        WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3
      END,
      p.updated_at DESC
  `).all();

  const board = {};
  for (const s of PROJECT_STATUSES) board[s] = [];
  for (const p of projects) {
    if (board[p.status]) board[p.status].push(p);
  }

  res.json({ board, statuses: PROJECT_STATUSES });
});

router.get('/:id', (req, res) => {
  const project = db.prepare(projectQuery() + ' WHERE p.id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

  const updates = db.prepare(`
    SELECT u.*, a.name AS admin_name
    FROM project_updates u
    LEFT JOIN admins a ON a.id = u.admin_id
    WHERE u.project_id = ?
    ORDER BY u.created_at DESC
  `).all(project.id);

  const activities = listProjectActivities(project.id, { limit: 50 });
  const activityStats = getProjectActivityStats(project.id);

  const interactions = db.prepare(`
    SELECT * FROM interactions WHERE contact_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(project.contact_id);

  res.json({ project, updates, activities, activityStats, interactions });
});

router.post('/', (req, res) => {
  const {
    contactId, title, description, serviceType, status, priority,
    assignedAdminId, budget, deadline, notes,
  } = req.body;

  if (!contactId || !title) {
    return res.status(400).json({ error: 'contactId y title son requeridos' });
  }

  const contact = db.prepare('SELECT id FROM contacts WHERE id = ?').get(contactId);
  if (!contact) return res.status(404).json({ error: 'Contacto no encontrado' });

  const result = db.prepare(`
    INSERT INTO projects (contact_id, title, description, service_type, status, priority, assigned_admin_id, budget, deadline, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    contactId,
    title.trim(),
    description || null,
    SERVICE_TYPES.includes(serviceType) ? serviceType : 'other',
    PROJECT_STATUSES.includes(status) ? status : 'lead',
    PRIORITIES.includes(priority) ? priority : 'medium',
    assignedAdminId || req.admin.id,
    budget || null,
    deadline || null,
    notes || null
  );

  const projectId = result.lastInsertRowid;

  db.prepare(`
    INSERT INTO project_updates (project_id, admin_id, type, title, body)
    VALUES (?, ?, 'milestone', 'Proyecto creado', ?)
  `).run(projectId, req.admin.id, description || null);

  logInteraction({
    contactId,
    type: 'note',
    channel: 'system',
    title: `Proyecto creado: ${title.trim()}`,
    description: description || null,
    adminId: req.admin.id,
    metadata: { projectId },
  });

  const project = db.prepare(projectQuery() + ' WHERE p.id = ?').get(projectId);
  res.status(201).json({ project });
});

router.post('/from-lead/:leadId', (req, res) => {
  const lead = db.prepare('SELECT * FROM web_leads WHERE id = ?').get(req.params.leadId);
  if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });

  const title = req.body.title || `Proyecto — ${lead.company || lead.name}`;
  const contactId = lead.contact_id;

  if (!contactId) {
    return res.status(400).json({ error: 'Lead sin contacto asociado' });
  }

  req.body = {
    contactId,
    title,
    description: lead.message,
    serviceType: req.body.serviceType || 'other',
    status: 'lead',
    priority: 'medium',
    notes: `Convertido desde lead #${lead.id}`,
  };

  const result = db.prepare(`
    INSERT INTO projects (contact_id, title, description, service_type, status, priority, assigned_admin_id, notes)
    VALUES (?, ?, ?, ?, 'lead', 'medium', ?, ?)
  `).run(
    contactId,
    title,
    lead.message,
    req.body.serviceType,
    req.admin.id,
    `Convertido desde lead #${lead.id}`
  );

  db.prepare("UPDATE web_leads SET status = 'read', updated_at = ? WHERE id = ?")
    .run(now(), lead.id);

  db.prepare(`
    INSERT INTO project_updates (project_id, admin_id, type, title, body)
    VALUES (?, ?, 'milestone', 'Proyecto creado desde lead', ?)
  `).run(result.lastInsertRowid, req.admin.id, lead.message);

  const project = db.prepare(projectQuery() + ' WHERE p.id = ?').get(result.lastInsertRowid);
  res.status(201).json({ project });
});

router.patch('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

  const {
    title, description, serviceType, status, priority,
    assignedAdminId, budget, deadline, notes,
  } = req.body;

  const oldStatus = project.status;
  const newStatus = status && PROJECT_STATUSES.includes(status) ? status : project.status;

  db.prepare(`
    UPDATE projects SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      service_type = COALESCE(?, service_type),
      status = ?,
      priority = COALESCE(?, priority),
      assigned_admin_id = COALESCE(?, assigned_admin_id),
      budget = COALESCE(?, budget),
      deadline = COALESCE(?, deadline),
      notes = COALESCE(?, notes),
      updated_at = ?
    WHERE id = ?
  `).run(
    title ?? null,
    description ?? null,
    serviceType ?? null,
    newStatus,
    priority ?? null,
    assignedAdminId ?? null,
    budget ?? null,
    deadline ?? null,
    notes ?? null,
    now(),
    req.params.id
  );

  if (newStatus !== oldStatus) {
    db.prepare(`
      INSERT INTO project_updates (project_id, admin_id, type, title, body)
      VALUES (?, ?, 'status_change', ?, ?)
    `).run(req.params.id, req.admin.id, `${oldStatus} → ${newStatus}`, null);

    logInteraction({
      contactId: project.contact_id,
      type: 'status_change',
      channel: 'system',
      title: `Proyecto "${project.title}": ${oldStatus} → ${newStatus}`,
      adminId: req.admin.id,
      metadata: { projectId: project.id },
    });
  }

  const updated = db.prepare(projectQuery() + ' WHERE p.id = ?').get(req.params.id);
  res.json({ project: updated });
});

router.post('/:id/updates', (req, res) => {
  const { type, title, body } = req.body;
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
  if (!title) return res.status(400).json({ error: 'title es requerido' });

  const result = db.prepare(`
    INSERT INTO project_updates (project_id, admin_id, type, title, body)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    req.params.id,
    req.admin.id,
    type || 'note',
    title.trim(),
    body || null
  );

  db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now(), req.params.id);

  const update = db.prepare(`
    SELECT u.*, a.name AS admin_name FROM project_updates u
    LEFT JOIN admins a ON a.id = u.admin_id WHERE u.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ update });
});

module.exports = router;
