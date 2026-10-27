// The session cookie must not sign anyone in from a local port.
//
// The cookie is SameSite=None, so the browser attaches it to every request from localhost
// (or 127.0.0.1), whatever the page does. Any process on this machine can serve a page on
// one of those ports, so with the cookie honoured such a page could act as the signed-in
// owner against production. Only the JWT in the Authorization header counts from a local
// origin, and a local page cannot read that: it lives in the dashboard's own storage.
//
// This suite exists on its own so that the aramid finding can be closed with a red proof:
// it has to fail when the fix is backed out, which the copy inside `sec` cannot do, because
// the fix and that copy were merged into one squashed commit.
import { DatabaseSync } from 'node:sqlite';
const m = await import('./src/index.js');
const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE crm_settings (client_id TEXT PRIMARY KEY, default_campaign_mode TEXT, auto_approve_campaigns INTEGER, plan TEXT DEFAULT 'free', trial_started_at INTEGER DEFAULT 0, trial_ends_at INTEGER DEFAULT 0);`);
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const mp = new Map();
const KV = { get: async k => mp.get(k) ?? null, put: async (k, v) => mp.set(k, v), delete: async k => mp.delete(k), list: async () => ({ keys: [] }) };
const env = {
    DB: { prepare: prep, batch: async s => { for (const x of s) await x.run(); } },
    JWT_SECRET: 'x', OAUTH_STATE_SECRET: 's', ADMIN_EMAILS: 'boss@bytesfx.com',
    ALLOWED_ORIGINS: 'https://web.bytesfx.com,http://localhost:5173,http://localhost:3000',
    OAUTH_TOKENS: KV, CLIENT_SETTINGS: KV, FRONTEND_DASHBOARD_URL: 'https://d/dashboard/',
};
const ctx = { waitUntil() {} };
const req = async (path, headers) => m.__app.fetch(new Request('http://x' + path, { method: 'GET', headers }), env, ctx);
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);

const jwt = await m.signJWT({ role: 'admin', clientId: 'agency_demo' }, 'x');
let r = await req('/api/site-settings', { Cookie: 'session=' + jwt, Origin: 'https://web.bytesfx.com' });
ok('the session cookie works from the site', r.status === 200, String(r.status));
r = await req('/api/site-settings', { Cookie: 'session=' + jwt, Origin: 'http://localhost:3000' });
ok('the session cookie is ignored from a local port', r.status === 401, String(r.status));
r = await req('/api/site-settings', { Cookie: 'session=' + jwt, Authorization: 'Bearer ' + jwt, Origin: 'http://localhost:3000' });
ok('the dashboard still works locally with its header token', r.status === 200, String(r.status));
r = await req('/api/site-settings', { Cookie: 'session=' + jwt, Origin: 'http://localhost:9999' });
ok('a local port that is not allowlisted is refused outright', r.status === 401 || r.status === 403, String(r.status));
