const { getSession } = require('../lib/auth');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }

  req.admin = {
    id: session.admin_id,
    email: session.email,
    name: session.name,
    role: session.role,
  };
  req.token = token;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({ error: 'Permiso denegado' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
