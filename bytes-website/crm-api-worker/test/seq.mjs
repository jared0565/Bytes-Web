// Follow-up emails that are not AI-written. A Bytes lead must get them whether or not a template is stored.
import { DatabaseSync } from 'node:sqlite';
const mod = await import('./src/index.js');
const db = new DatabaseSync(':memory:'); const now = Date.now();
db.exec(`CREATE TABLE crm_settings (client_id TEXT PRIMARY KEY, default_campaign_mode TEXT, auto_approve_campaigns INTEGER, plan TEXT, trial_started_at INTEGER, trial_ends_at INTEGER);
INSERT INTO crm_settings VALUES ('default','rule',0,'pro',0,0), ('acme','rule',0,'pro',0,0);
CREATE TABLE leads (id INTEGER PRIMARY KEY, client_id TEXT, name TEXT, email TEXT, service TEXT, budget TEXT, summary TEXT, is_verified INTEGER, verification_token TEXT, pipeline_stage TEXT, next_best_action TEXT, timestamp INTEGER, updated_at INTEGER, session_id TEXT);
CREATE TABLE email_sequences (id INTEGER PRIMARY KEY, lead_id INTEGER, client_id TEXT, email_number INTEGER, subject TEXT, body TEXT, status TEXT, scheduled_for INTEGER);
CREATE TABLE chat_logs (id INTEGER PRIMARY KEY, client_id TEXT, user_message TEXT, bot_response TEXT, timestamp INTEGER, session_id TEXT);
CREATE TABLE email_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT NOT NULL, name TEXT NOT NULL, steps_json TEXT NOT NULL);`);
// Lead 7 belongs to a client, the others to the Bytes site
const addLead = db.prepare("INSERT INTO leads (id, client_id, name, email, service, budget, summary, is_verified, verification_token, pipeline_stage, timestamp) VALUES (?, ?, 'Priya Shah', ?, 'Websites', 'Pending', 'Wants a clinic site', 0, ?, 'lead', ?)");
for (let i = 1; i <= 8; i++) addLead.run(i, i === 7 ? 'acme' : 'default', `lead${i}@clinic.com`, `tok-${i}`, now - 3600e3);
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
// No questions email, so confirming the address goes straight to the follow-ups
const kv = new Map([['client:default', JSON.stringify({ askQuestions: false })], ['client:acme', JSON.stringify({ companyName: 'Acme Dental', askQuestions: false })], ['mail:acme', JSON.stringify({ provider: 'resend', fromEmail: 'hi@acme.com', apiKey: 're_x' })]]);
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v) };
globalThis.fetch = async (u) => { u = String(u);
  if (u.includes('dns-query')) return new Response(JSON.stringify({ Answer: [{ data: '10 route1.mx.cloudflare.net.' }] }));
  if (u.includes('api.resend.com')) return new Response('{"id":"x"}');
  return new Response('{}'); };
// The model returns nothing, so an AI-written sequence always fails here
const env = { DB: { prepare: prep, batch: async s => { for (const x of s) await x.run(); } }, JWT_SECRET: 'x', REPLY_DOMAIN: 'reply.bytesfx.com', LLM: { complete: async () => ({ text: '' }) }, ADMIN_EMAILS: 'boss@bytesfx.com', OAUTH_TOKENS: KV, CLIENT_SETTINGS: KV, RESEND_API_KEY: 're_x', WEBSITE_MAIL_FROM: 'contact@bytesfx.com' };
const waits = []; const ctx = { waitUntil: p => waits.push(p) };
const settle = async () => { while (waits.length) await waits.shift(); };
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
const verify = async (token) => { await mod.__app.fetch(new Request('http://x/api/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `token=${token}` }), env, ctx); await settle(); };

const NAME = 'Standard Web Design Sequence';
// Sets the campaign mode and the stored templates, confirms the lead's email, returns the follow-ups written for it
const follow = async (id, { mode = 'rule', templates = [] } = {}) => {
  db.prepare('UPDATE crm_settings SET default_campaign_mode = ?').run(mode);
  if (templates) { db.exec('DELETE FROM email_templates'); for (const [client, steps] of templates) db.prepare('INSERT INTO email_templates (client_id, name, steps_json) VALUES (?, ?, ?)').run(client, NAME, steps); }
  await verify(`tok-${id}`);
  return db.prepare('SELECT email_number, subject, body FROM email_sequences WHERE lead_id = ? ORDER BY id').all(id);
};
const builtIn = (rows) => rows.length === 3 && rows.every(r => r.body.startsWith('Hi Priya,') && r.body.endsWith('The BytesFX team'));
const seen = (rows) => `${rows.length} emails${rows.length ? ': ' + rows.map(r => r.subject).join(' | ') : ''}`;

let rows = await follow(1);
ok('a Bytes lead gets three follow-ups when no template is stored', builtIn(rows), seen(rows));
ok('they name the service the lead asked about', rows[0]?.subject === 'Your enquiry about Websites', rows[0]?.subject);
rows = await follow(2, { mode: 'ai' });
ok('a Bytes lead gets them when the AI write fails', builtIn(rows), seen(rows));
rows = await follow(3, { templates: [['agency_demo', JSON.stringify([{ email_number: 1, subject: 'Stored subject', body: 'Hi {name}, stored body' }])]] });
ok('a stored Bytes template is still used', rows.length === 1 && rows[0].subject === 'Stored subject' && rows[0].body === 'Hi Priya, stored body', seen(rows));
rows = await follow(4, { templates: [['acme', JSON.stringify([{ email_number: 1, subject: 'Acme only', body: 'Acme text' }])]] });
ok('another client\'s template with the same name is not used', builtIn(rows), seen(rows));
rows = await follow(5, { templates: [['agency_demo', 'not a list']] });
ok('a stored template that cannot be read is replaced by the built-in emails', builtIn(rows), seen(rows));
rows = await follow(8, { templates: [['default', JSON.stringify([{ subject: 'First', body: 'Hi {name}' }, { subject: 'Second', body: 'Hi {name}' }])]] });
ok('a stored template without email numbers is numbered in order', rows.length === 2 && rows[0].email_number === 1 && rows[1].email_number === 2, seen(rows));
db.exec('DROP TABLE email_templates');
rows = await follow(6, { templates: null });
ok('a database with no template table still gives a Bytes lead its follow-ups', builtIn(rows), seen(rows));
rows = await follow(7, { templates: null });
ok('a client\'s lead gets follow-ups in the client\'s name', rows.length === 3 && rows.every(r => r.body.endsWith('The Acme Dental team')), seen(rows));
