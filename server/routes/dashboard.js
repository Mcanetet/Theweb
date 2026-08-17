const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/stats', (_req, res) => {
  const leadsNew = db.prepare("SELECT COUNT(*) AS n FROM web_leads WHERE status = 'new'").get().n;
  const leadsTotal = db.prepare('SELECT COUNT(*) AS n FROM web_leads').get().n;
  const contactsTotal = db.prepare('SELECT COUNT(*) AS n FROM contacts').get().n;
  const conversationsOpen = db.prepare("SELECT COUNT(*) AS n FROM conversations WHERE status IN ('open', 'pending')").get().n;
  const messagesUnread = db.prepare('SELECT COUNT(*) AS n FROM messages WHERE direction = ? AND read_at IS NULL').get('inbound').n;
  const projectsActive = db.prepare("SELECT COUNT(*) AS n FROM projects WHERE status IN ('lead', 'proposal', 'in_progress', 'review')").get().n;
  const projectsTotal = db.prepare('SELECT COUNT(*) AS n FROM projects').get().n;

  const projectsByStatus = db.prepare(`
    SELECT status, COUNT(*) AS count FROM projects GROUP BY status
  `).all();

  const upcomingFollowUps = db.prepare(`
    SELECT pa.follow_up_at, pa.subject, p.id AS project_id, p.title AS project_title, c.name AS contact_name
    FROM project_activities pa
    JOIN projects p ON p.id = pa.project_id
    JOIN contacts c ON c.id = p.contact_id
    WHERE pa.follow_up_at IS NOT NULL AND pa.follow_up_at >= datetime('now')
    ORDER BY pa.follow_up_at ASC LIMIT 5
  `).all();

  res.json({
    leads: { new: leadsNew, total: leadsTotal },
    contacts: { total: contactsTotal },
    conversations: { open: conversationsOpen },
    messages: { unread: messagesUnread },
    projects: { active: projectsActive, total: projectsTotal, byStatus: projectsByStatus },
    upcomingFollowUps,
  });
});

router.get('/activity', (_req, res) => {
  const recentLeads = db.prepare(`
    SELECT id, name, email, message, status, created_at, 'lead' AS kind
    FROM web_leads ORDER BY created_at DESC LIMIT 8
  `).all();

  const recentMessages = db.prepare(`
    SELECT m.id, m.body, m.channel, m.direction, m.created_at, m.read_at,
           c.name AS contact_name, 'message' AS kind
    FROM messages m
    JOIN contacts c ON c.id = m.contact_id
    ORDER BY m.created_at DESC LIMIT 8
  `).all();

  const recentProjects = db.prepare(`
    SELECT p.id, p.title, p.status, p.updated_at, c.name AS contact_name, 'project' AS kind
    FROM projects p
    JOIN contacts c ON c.id = p.contact_id
    ORDER BY p.updated_at DESC LIMIT 8
  `).all();

  const recentActivities = db.prepare(`
    SELECT pa.subject, pa.activity_type, pa.created_at, p.title AS project_title,
           c.name AS contact_name, 'project_activity' AS kind
    FROM project_activities pa
    JOIN projects p ON p.id = pa.project_id
    JOIN contacts c ON c.id = pa.contact_id
    ORDER BY pa.created_at DESC LIMIT 8
  `).all();

  const activity = [...recentLeads, ...recentMessages, ...recentProjects, ...recentActivities]
    .sort((a, b) => new Date(b.created_at || b.updated_at) - new Date(a.created_at || a.updated_at))
    .slice(0, 12);

  res.json({ activity });
});

module.exports = router;
