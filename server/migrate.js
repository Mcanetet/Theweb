const fs = require('fs');
const path = require('path');
const { db, dbPath } = require('./db');

const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
db.exec(fs.readFileSync(schemaPath, 'utf8'));

const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
if (fs.existsSync(migrationsDir)) {
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    db.exec(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
    console.log('  ✓', file);
  }
}

console.log('Base de datos migrada correctamente.');
console.log('Archivo:', dbPath);
