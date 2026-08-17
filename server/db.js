const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || './data/theweb.db';
const absolutePath = path.resolve(process.cwd(), dbPath);
const dir = path.dirname(absolutePath);

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(absolutePath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function now() {
  return new Date().toISOString();
}

module.exports = { db, now, dbPath: absolutePath };
