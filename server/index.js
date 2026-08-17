require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const leadsRoutes = require('./routes/leads');
const contactsRoutes = require('./routes/contacts');
const messagesRoutes = require('./routes/messages');
const interactionsRoutes = require('./routes/interactions');
const webhooksRoutes = require('./routes/webhooks');
const dashboardRoutes = require('./routes/dashboard');
const projectsRoutes = require('./routes/projects');
const projectActivitiesRoutes = require('./routes/project-activities');
const theoRoutes = require('./routes/theo');

const app = express();
const PORT = process.env.PORT || 3001;
const rootDir = path.join(__dirname, '..');
const adminDir = path.join(rootDir, 'admin');

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin === '*'
    ? true
    : corsOrigin.split(',').map(s => s.trim()),
}));
app.use(express.json({ limit: '1mb' }));
app.set('trust proxy', 1);

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { error: 'Demasiadas solicitudes. Intenta más tarde.' },
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'theweb-crm', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/leads', publicLimiter, leadsRoutes);
app.use('/api/theo', publicLimiter, theoRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/interactions', interactionsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/projects/:id/activities', projectActivitiesRoutes);
app.use('/api/projects', projectsRoutes);

app.use('/estudio', express.static(adminDir, { index: 'index.html' }));
app.get(['/estudio', '/estudio/'], (_req, res) => {
  res.sendFile(path.join(adminDir, 'index.html'));
});
app.get(['/admin', '/admin/'], (_req, res) => {
  res.redirect(302, '/estudio/');
});

app.use(express.static(rootDir));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Ruta no encontrada' });
  }
  next();
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`TheWeb CRM API → http://localhost:${PORT}`);
  console.log(`Estudio admin  → http://localhost:${PORT}/estudio/`);
  console.log(`Health check   → http://localhost:${PORT}/api/health`);
});
