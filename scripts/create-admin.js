#!/usr/bin/env node
require('dotenv').config();

const readline = require('readline');
const { db } = require('../server/db');
const { hashPassword } = require('../server/lib/auth');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  const args = process.argv.slice(2);
  let email = args[0];
  let password = args[1];
  let name = args[2];
  let role = args[3] || 'superadmin';

  if (!email) email = await ask('Email del admin: ');
  if (!password) password = await ask('Contraseña: ');
  if (!name) name = await ask('Nombre: ');

  email = email.trim().toLowerCase();

  if (password.length < 8) {
    console.error('La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(email);
  if (existing) {
    console.error('Ya existe un admin con ese email.');
    process.exit(1);
  }

  const passwordHash = hashPassword(password);

  const result = db.prepare(`
    INSERT INTO admins (email, password_hash, name, role)
    VALUES (?, ?, ?, ?)
  `).run(email, passwordHash, name.trim(), role);

  console.log('\nAdministrador creado:');
  console.log('  ID:   ', result.lastInsertRowid);
  console.log('  Email:', email);
  console.log('  Rol:  ', role);

  rl.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
