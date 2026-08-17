const { db, now } = require('../db');
const { logInteraction } = require('./crm');

const ACTIVITY_TYPES = [
  'call', 'whatsapp', 'email', 'meeting', 'note',
  'follow_up', 'proposal', 'demo', 'contract',
  'payment', 'delivery', 'other',
];

const DIRECTIONS = ['inbound', 'outbound', 'internal'];
const OUTCOMES = ['positive', 'neutral', 'negative', 'no_answer', 'follow_up_scheduled', 'completed', 'pending'];

const TYPE_TO_CHANNEL = {
  call: 'phone',
  whatsapp: 'whatsapp',
  email: 'email',
  meeting: 'phone',
  note: 'system',
  follow_up: 'system',
  proposal: 'email',
  demo: 'phone',
  contract: 'system',
  payment: 'system',
  delivery: 'system',
  other: 'other',
};

const TYPE_TO_INTERACTION = {
  call: 'call',
  whatsapp: 'whatsapp_sent',
  email: 'message_sent',
  meeting: 'meeting_scheduled',
  note: 'note',
  follow_up: 'note',
  proposal: 'note',
  demo: 'meeting_scheduled',
  contract: 'note',
  payment: 'note',
  delivery: 'note',
  other: 'other',
};

function activityQuery() {
  return `
    SELECT a.*, adm.name AS admin_name
    FROM project_activities a
    LEFT JOIN admins adm ON adm.id = a.admin_id
  `;
}

function getProjectActivityStats(projectId) {
  const total = db.prepare('SELECT COUNT(*) AS n FROM project_activities WHERE project_id = ?').get(projectId).n;

  const lastContact = db.prepare(`
    SELECT created_at FROM project_activities
    WHERE project_id = ? AND activity_type IN ('call', 'whatsapp', 'email', 'meeting', 'demo', 'follow_up', 'proposal')
    ORDER BY created_at DESC LIMIT 1
  `).get(projectId);

  const nextFollowUp = db.prepare(`
    SELECT follow_up_at, subject FROM project_activities
    WHERE project_id = ? AND follow_up_at IS NOT NULL AND follow_up_at >= datetime('now')
    ORDER BY follow_up_at ASC LIMIT 1
  `).get(projectId);

  const byType = db.prepare(`
    SELECT activity_type, COUNT(*) AS count FROM project_activities
    WHERE project_id = ? GROUP BY activity_type
  `).all(projectId);

  return {
    total,
    lastContactAt: lastContact?.created_at || null,
    nextFollowUp: nextFollowUp || null,
    byType,
  };
}

function createProjectActivity(projectId, adminId, data) {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) return null;

  const activityType = ACTIVITY_TYPES.includes(data.activityType) ? data.activityType : 'note';
  const direction = DIRECTIONS.includes(data.direction) ? data.direction : 'outbound';
  const outcome = data.outcome && OUTCOMES.includes(data.outcome) ? data.outcome : null;

  const result = db.prepare(`
    INSERT INTO project_activities (
      project_id, contact_id, admin_id, activity_type, direction,
      subject, summary, client_said, we_said, outcome,
      duration_minutes, follow_up_at, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    projectId,
    project.contact_id,
    adminId,
    activityType,
    direction,
    data.subject.trim(),
    data.summary || null,
    data.clientSaid || null,
    data.weSaid || null,
    outcome,
    data.durationMinutes ? parseInt(data.durationMinutes, 10) : null,
    data.followUpAt || null,
    JSON.stringify(data.metadata || {})
  );

  db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now(), projectId);

  const activity = db.prepare(activityQuery() + ' WHERE a.id = ?').get(result.lastInsertRowid);

  const channel = TYPE_TO_CHANNEL[activityType] || 'other';
  let interactionType = TYPE_TO_INTERACTION[activityType] || 'note';
  if (direction === 'inbound' && activityType === 'whatsapp') interactionType = 'whatsapp_received';
  if (direction === 'inbound' && ['call', 'email'].includes(activityType)) interactionType = 'message_received';

  const descriptionParts = [];
  if (data.clientSaid) descriptionParts.push(`Cliente: ${data.clientSaid.slice(0, 300)}`);
  if (data.weSaid) descriptionParts.push(`Respuesta: ${data.weSaid.slice(0, 300)}`);

  logInteraction({
    contactId: project.contact_id,
    type: interactionType,
    channel,
    title: `[Proyecto] ${data.subject.trim()}`,
    description: descriptionParts.join(' | ') || data.summary || null,
    adminId,
    metadata: { projectId, activityId: activity.id, activityType, outcome },
  });

  return activity;
}

function listProjectActivities(projectId, filters = {}) {
  let sql = activityQuery() + ' WHERE a.project_id = ?';
  const params = [projectId];

  if (filters.type) {
    sql += ' AND a.activity_type = ?';
    params.push(filters.type);
  }

  sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
  params.push(filters.limit || 100, filters.offset || 0);

  return db.prepare(sql).all(...params);
}

module.exports = {
  ACTIVITY_TYPES,
  DIRECTIONS,
  OUTCOMES,
  activityQuery,
  getProjectActivityStats,
  createProjectActivity,
  listProjectActivities,
};
