import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve('f:/Claude/Bytes Web/chatbot-api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6dbff13ddceac69ea6e8f49514787a2a10bc279326fd24c7f7b02e95a92e5844b06f46de6669e64134c3724c23e51e2c.sqlite');
const db = new Database(dbPath);

console.log('Migrating local D1 database...');

// Read Original Schema
const schemaPath = path.resolve('f:/Claude/Bytes Web/chatbot-api/', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

// The original schema drops tables, which we want to avoid if they exist in production, 
// but for local D1 emulator sync we will run it as is to establish the baseline.
try {
  db.exec(schema);
  console.log('Base Chatbot schema applied.');

  // Add the new CRM Columns
  const tableInfo = db.pragma('table_info(leads)');
  const columns = tableInfo.map(c => c.name);

  if (!columns.includes('pipeline_stage')) {
    db.exec(`ALTER TABLE leads ADD COLUMN pipeline_stage TEXT DEFAULT 'lead'`);
  }
  if (!columns.includes('updated_at')) {
    db.exec(`ALTER TABLE leads ADD COLUMN updated_at INTEGER`);
  }
  if (!columns.includes('owner_id')) {
    db.exec(`ALTER TABLE leads ADD COLUMN owner_id TEXT`);
  }
  console.log('CRM Extended schema applied.');
} catch (err) {
  console.error('Migration error:', err);
}
