const express = require('express');
const { db, now } = require('../db');
const { requireAuth } = require('../middleware/auth');
const {
  ACTIVITY_TYPES,
  DIRECTIONS,
  OUTCOMES,
  activityQuery,
  getProjectActivityStats,
  createProjectActivity,
  listProjectActivities,
} = require('../lib/activities');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

router.get('/meta', (_req, res) => {
  res.json({
    activityTypes: ACTIVITY_TYPES,
    directions: DIRECTIONS,
    outcomes: OUTCOMES,
  });
});

router.get('/', (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

  const activities = listProjectActivities(req.params.id, {
    type: req.query.type,
    limit: parseInt(req.query.limit, 10) || 100,
    offset: parseInt(req.query.offset, 10) || 0,
  });

  const stats = getProjectActivityStats(req.params.id);

  res.json({ activities, stats });
});

router.post('/', (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

  const { subject, activityType, direction, summary, clientSaid, weSaid, outcome, durationMinutes, followUpAt } = req.body;

  if (!subject || !subject.trim()) {
    return res.status(400).json({ error: 'El asunto es obligatorio' });
  }

  const activity = createProjectActivity(req.params.id, req.admin.id, {
    subject,
    activityType,
    direction,
    summary,
    clientSaid,
    weSaid,
    outcome,
    durationMinutes,
    followUpAt,
  });

  res.status(201).json({ activity });
});

router.patch('/:activityId', (req, res) => {
  const existing = db.prepare(`
    SELECT * FROM project_activities WHERE id = ? AND project_id = ?
  `).get(req.params.activityId, req.params.id);

  if (!existing) return res.status(404).json({ error: 'Actividad no encontrada' });

  const {
    subject, activityType, direction, summary,
    clientSaid, weSaid, outcome, durationMinutes, followUpAt,
  } = req.body;

  db.prepare(`
    UPDATE project_activities SET
      subject = COALESCE(?, subject),
      activity_type = COALESCE(?, activity_type),
      direction = COALESCE(?, direction),
      summary = COALESCE(?, summary),
      client_said = COALESCE(?, client_said),
      we_said = COALESCE(?, we_said),
      outcome = COALESCE(?, outcome),
      duration_minutes = COALESCE(?, duration_minutes),
      follow_up_at = COALESCE(?, follow_up_at),
      updated_at = ?
    WHERE id = ?
  `).run(
    subject ?? null,
    activityType && ACTIVITY_TYPES.includes(activityType) ? activityType : null,
    direction && DIRECTIONS.includes(direction) ? direction : null,
    summary ?? null,
    clientSaid ?? null,
    weSaid ?? null,
    outcome && OUTCOMES.includes(outcome) ? outcome : null,
    durationMinutes != null ? parseInt(durationMinutes, 10) : null,
    followUpAt ?? null,
    now(),
    req.params.activityId
  );

  db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now(), req.params.id);

  const activity = db.prepare(activityQuery() + ' WHERE a.id = ?').get(req.params.activityId);
  res.json({ activity });
});

module.exports = router;
