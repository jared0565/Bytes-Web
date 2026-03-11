import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve('f:/Claude/Bytes Web/chatbot-api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6dbff13ddceac69ea6e8f49514787a2a10bc279326fd24c7f7b02e95a92e5844b06f46de6669e64134c3724c23e51e2c.sqlite');
const db = new Database(dbPath);

console.log('Injecting seed data into:', dbPath);

const stmt = db.prepare(`
    INSERT INTO leads (client_id, name, email, service, budget, summary, status, pipeline_stage, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const now = Date.now();

const seeds = [
    ['agency_demo', 'Alice Smith', 'alice@example.com', 'SEO', '$5,000/mo', 'Discussed a potential SEO sprint', 'new', 'lead', now - 86400000 * 2],
    ['agency_demo', 'Bob Jones', 'bob@example.com', 'PPC', '$15,000/mo', 'Large budget, needs immediate attention. High priority routing triggered.', 'priority', 'priority', now - 3600000],
    ['agency_demo', 'Charlie Davis', 'cdavis@example.com', 'Web Dev', '$2,000', 'Basic brochure site.', 'new', 'lead', now],
    ['agency_demo', 'Diana Prince', 'diana@example.com', 'Consulting', '$50,000', 'Enterprise lead with multi-month engagement.', 'opportunity', 'opportunity', now - 86400000 * 5]
];

const insertMany = db.transaction((rows) => {
    for (const row of rows) stmt.run(row);
});

insertMany(seeds);
console.log('Seed data injected successfully.');
