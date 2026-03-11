import Database from 'better-sqlite3';
import path from 'path';

// Using the exact dbPath from index.js
const dbPath = path.resolve('f:/Claude/Bytes Web/chatbot-api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/871032b4b4162ceb77ebdbbed83f7b02e95a92e5844b06f46de6669e64134c3724c23e51e2c.sqlite');

try {
  const db = new Database(dbPath);
  console.log('Successfully opened database at:', dbPath);

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables in database:');
  console.table(tables);

} catch (err) {
  console.error('Error opening database or reading tables:', err);
}
