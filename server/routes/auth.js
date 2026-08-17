const express = require('express');
const { verifyPassword, createSession, deleteSession, findAdminByEmail, updateLastLogin } = require('../lib/auth');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password, gate } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  const requiredGate = process.env.ADMIN_GATE;
  if (requiredGate && gate !== requiredGate) {
    return res.status(401).json({ error: 'Clave de acceso incorrecta' });
  }

  const admin = findAdminByEmail(email.trim().toLowerCase());
  if (!admin || !admin.is_active) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  if (!verifyPassword(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const days = parseInt(process.env.SESSION_DAYS, 10) || 7;
  const session = createSession(admin.id, req.ip, req.get('user-agent'), days);
  updateLastLogin(admin.id);

  res.json({
    token: session.token,
    expiresAt: session.expiresAt,
    admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
  });
});

router.post('/logout', requireAuth, (req, res) => {
  deleteSession(req.token);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ admin: req.admin });
});

module.exports = router;
