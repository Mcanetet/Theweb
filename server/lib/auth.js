const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { db, now } = require('../db');

const SALT_ROUNDS = 12;

function hashPassword(plain) {
  return bcrypt.hashSync(plain, SALT_ROUNDS);
}

function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function createSession(adminId, ip, userAgent, days = 7) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expires = new Date();
  expires.setDate(expires.getDate() + days);

  db.prepare(`
    INSERT INTO admin_sessions (admin_id, token_hash, expires_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `).run(adminId, tokenHash, expires.toISOString(), ip || null, userAgent || null);

  return { token, expiresAt: expires.toISOString() };
}

function getSession(token) {
  const tokenHash = hashToken(token);
  const row = db.prepare(`
    SELECT s.*, a.id AS admin_id, a.email, a.name, a.role, a.is_active
    FROM admin_sessions s
    JOIN admins a ON a.id = s.admin_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).get(tokenHash, now());

  if (!row || !row.is_active) return null;
  return row;
}

function deleteSession(token) {
  const tokenHash = hashToken(token);
  db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenHash);
}

function findAdminByEmail(email) {
  return db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
}

function updateLastLogin(adminId) {
  db.prepare('UPDATE admins SET last_login_at = ?, updated_at = ? WHERE id = ?')
    .run(now(), now(), adminId);
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  getSession,
  deleteSession,
  findAdminByEmail,
  updateLastLogin,
};
