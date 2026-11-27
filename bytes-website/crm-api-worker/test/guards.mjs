// Three small guards:
// 1. Signing out with a session that was already replaced must not end the session that replaced it.
// 2. A client cannot list a whole top-level domain ("*.com") as one of its websites.
// 3. The email sender test works for the admin access key, which has no user account.
import { DatabaseSync } from 'node:sqlite';
const mod = await import('./src/index.js');
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE crm_settings (client_id TEXT PRIMARY KEY, default_campaign_mode TEXT DEFAULT 'ai', auto_approve_campaigns INTEGER DEFAULT 0, plan TEXT DEFAULT 'free', trial_started_at INTEGER DEFAULT 0, trial_ends_at INTEGER DEFAULT 0);
INSERT INTO crm_settings VALUES ('acme','ai',0,'business',0,0);
CREATE TABLE users (id INTEGER PRIMARY KEY, social_id TEXT, provider TEXT, email TEXT UNIQUE, name TEXT, picture TEXT, created_at INTEGER);
INSERT INTO users (id, email) VALUES (7, 'o@acme.com');`);
// Like the real database, binding a value that is undefined is an error raised by bind() itself
const prep = (sql) => { let a = []; const o = { bind: (...x) => { if (x.some(v => v === undefined)) throw new Error("D1_TYPE_ERROR: Type 'undefined' not supported for value 'undefined'"); a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const kv = new Map([
    ['client:acme', JSON.stringify({ companyName: 'Acme', mode: 'ai', allowedDomains: ['acme.com'] })],
    ['mail:agency_demo', JSON.stringify({ provider: 'resend', fromEmail: 'hi@agency.test', fromName: 'Agency', apiKey: 're_x' })],
    ['migr:bot-modes-v1', '1'],
]);
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v), delete: async k => kv.delete(k), list: async ({ prefix }) => ({ keys: [...kv.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) };
const sent = [];
globalThis.fetch = async (u, o = {}) => { u = String(u);
  if (u.includes('api.resend.com')) { sent.push(JSON.parse(o.body)); return new Response('{"id":"x"}'); }
  return new Response('{}'); };
const env = { DB: { prepare: prep, batch: async s => { for (const x of s) await x.run(); } }, JWT_SECRET: 'x', OAUTH_TOKENS: KV, CLIENT_SETTINGS: KV };
const ctx = { waitUntil: () => {} };
const call = async (t, m, path, body) => { const h = { 'Content-Type': 'application/json' }; if (t) h.Authorization = 'Bearer ' + t; const r = await mod.__app.fetch(new Request('http://x' + path, { method: m, headers: h, body: body && JSON.stringify(body) }), env, ctx); return [r.status, await r.json().catch(() => ({}))]; };

// ── 1. Signing out ───────────────────────────────────────────────────────────
// The owner signed in on a second device, which replaced the first device's session
const oldDevice = await mod.signJWT({ role: 'client', clientId: 'acme', userId: 7, sessionId: 'first' }, 'x');
const newDevice = await mod.signJWT({ role: 'client', clientId: 'acme', userId: 7, sessionId: 'second' }, 'x');
kv.set('active_session:7', 'second');
let [st, j] = await call(oldDevice, 'POST', '/api/auth/logout');
ok('signing out the replaced session answers normally', st === 200, st);
ok('and leaves the current session signed in', kv.get('active_session:7') === 'second', String(kv.get('active_session:7')));
[st] = await call(newDevice, 'GET', '/api/installations');
ok('the current device still works', st === 200, st);
[st] = await call(newDevice, 'POST', '/api/auth/logout');
ok('signing out the current session ends it', st === 200 && !kv.has('active_session:7'), String(kv.get('active_session:7')));
[st] = await call(newDevice, 'GET', '/api/installations');
ok('a signed-out session is refused', st === 401, st);

// ── 2. Websites ──────────────────────────────────────────────────────────────
const owner = await mod.signJWT({ role: 'client', clientId: 'acme', userId: 7 }, 'x');
[st, j] = await call(owner, 'POST', '/api/installations', { allowedDomains: ['*.com', 'acme.com', '*.acme.com', '*.acme.co.uk'] });
ok('a whole top-level domain is not saved as a website', st === 200 && !j.allowedDomains.includes('*.com'), JSON.stringify(j));
ok('real websites and their subdomain wildcards are saved', ['acme.com', '*.acme.com', '*.acme.co.uk'].every(d => (j.allowedDomains || []).includes(d)), JSON.stringify(j));
ok('the stored list matches', JSON.stringify(JSON.parse(kv.get('client:acme')).allowedDomains) === JSON.stringify(['acme.com', '*.acme.com', '*.acme.co.uk']), kv.get('client:acme'));

// ── 3. The email sender test ─────────────────────────────────────────────────
const keyAdmin = await mod.signJWT({ role: 'admin', clientId: 'agency_demo' }, 'x'); // admin access key: no account
[st, j] = await call(keyAdmin, 'POST', '/api/mail-settings/test');
ok('the sender test works without a user account', st === 200 && j.success === true, `${st} ${JSON.stringify(j)}`);
ok('it goes to the sender address when there is no account email', sent.length === 1 && sent[0].to[0] === 'hi@agency.test', JSON.stringify(sent.map(s => s.to)));
