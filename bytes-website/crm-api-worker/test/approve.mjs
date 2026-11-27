// Approving a campaign that was drafted days ago. The drafts carry the send times they were given when
// they were written (1, 3 and 6 days later), so by the time the owner approves, some or all of those
// times have passed. The lead must still get the emails spaced out, never all in the same minute.
import { DatabaseSync } from 'node:sqlite';
const mod = await import('./src/index.js');
const db = new DatabaseSync(':memory:'); const now = Date.now(), DAY = 86400e3;
db.exec(`CREATE TABLE crm_settings (client_id TEXT PRIMARY KEY, default_campaign_mode TEXT, auto_approve_campaigns INTEGER, plan TEXT, trial_started_at INTEGER, trial_ends_at INTEGER);
INSERT INTO crm_settings VALUES ('acme','ai',0,'pro',0,0);
CREATE TABLE leads (id INTEGER PRIMARY KEY, client_id TEXT, name TEXT, email TEXT, service TEXT, budget TEXT, summary TEXT, is_verified INTEGER, verification_token TEXT, pipeline_stage TEXT, next_best_action TEXT, timestamp INTEGER, updated_at INTEGER, session_id TEXT);
INSERT INTO leads (id, client_id, name, email, is_verified, pipeline_stage, timestamp) VALUES (1,'acme','Priya Shah','priya@clinic.com',1,'campaign',${now - 10 * DAY}), (2,'acme','Sam Lee','sam@shop.com',1,'campaign',${now - 3600e3});
CREATE TABLE email_sequences (id INTEGER PRIMARY KEY, lead_id INTEGER, client_id TEXT, email_number INTEGER, subject TEXT, body TEXT, status TEXT, scheduled_for INTEGER);`);
// Lead 1: drafted 10 days ago, so all three send times have passed. Lead 2: drafted an hour ago.
const draft = db.prepare("INSERT INTO email_sequences (lead_id, client_id, email_number, subject, body, status, scheduled_for) VALUES (?, 'acme', ?, 'Subject', 'Body', 'draft', ?)");
[1, 3, 6].forEach((d, i) => draft.run(1, i + 1, now - 10 * DAY + d * DAY));
const lead2Times = [1, 3, 6].map(d => now - 3600e3 + d * DAY);
lead2Times.forEach((t, i) => draft.run(2, i + 1, t));
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const kv = new Map([['client:acme', JSON.stringify({ companyName: 'Acme Dental' })], ['mail:acme', JSON.stringify({ provider: 'resend', fromEmail: 'hi@acme.com', fromName: 'Acme', apiKey: 're_x' })]]);
const sent = [];
globalThis.fetch = async (u, o = {}) => { u = String(u);
  if (u.includes('api.resend.com')) { sent.push(JSON.parse(o.body)); return new Response('{"id":"x"}'); }
  return new Response('{}'); };
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v) };
const env = { DB: { prepare: prep, batch: async s => { for (const x of s) await x.run(); } }, JWT_SECRET: 'x', OAUTH_TOKENS: KV, CLIENT_SETTINGS: KV };
const ctx = { waitUntil() {} };
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
const tok = await mod.signJWT({ role: 'admin', clientId: 'agency_demo' }, 'x');
const approve = (leadId) => mod.__app.fetch(new Request('http://x/api/sequences/approve', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId }) }), env, ctx);
const times = (leadId) => db.prepare('SELECT scheduled_for t, status s FROM email_sequences WHERE lead_id = ? ORDER BY email_number').all(leadId);
const drip = mod.__internals.handleDripCron;
ok('the test can run the sending job', typeof drip === 'function');

// Approved ten days after it was drafted
let r = await approve(1);
let rows = times(1);
ok('a late approval is accepted', r.status === 200 && rows.every(x => x.s === 'approved'), `${r.status} ${JSON.stringify(rows)}`);
ok('the first email is due now', Math.abs(rows[0].t - Date.now()) < 5000, String(rows[0].t - Date.now()));
ok('the others keep their spacing (2 and 5 days after the first)', rows[1].t - rows[0].t === 2 * DAY && rows[2].t - rows[0].t === 5 * DAY, JSON.stringify(rows.map(x => x.t - rows[0].t)));
if (drip) await drip(env);
ok('one email goes out, not all three in the same minute', sent.length === 1, `${sent.length} sent`);
ok('the rest are still waiting', db.prepare("SELECT COUNT(*) n FROM email_sequences WHERE lead_id = 1 AND status = 'approved'").get().n === 2);

// Approved while every send time is still ahead: nothing moves
r = await approve(2);
rows = times(2);
ok('an approval in good time keeps the times the draft was given', r.status === 200 && rows.every((x, i) => x.s === 'approved' && x.t === lead2Times[i]), JSON.stringify(rows));
