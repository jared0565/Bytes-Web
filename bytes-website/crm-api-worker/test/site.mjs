import { DatabaseSync } from 'node:sqlite';
const mod = await import('./src/index.js');
const db = new DatabaseSync(':memory:'); const now = Date.now();
db.exec(`CREATE TABLE crm_settings (client_id TEXT PRIMARY KEY, default_campaign_mode TEXT, auto_approve_campaigns INTEGER, plan TEXT, trial_started_at INTEGER, trial_ends_at INTEGER);
INSERT INTO crm_settings VALUES ('acme','ai',1,'pro',0,0);
CREATE TABLE leads (id INTEGER PRIMARY KEY, client_id TEXT, name TEXT, email TEXT, service TEXT, budget TEXT, summary TEXT, is_verified INTEGER, verification_token TEXT, pipeline_stage TEXT, next_best_action TEXT, timestamp INTEGER, updated_at INTEGER, session_id TEXT);
INSERT INTO leads (id, client_id, name, email, service, budget, summary, is_verified, verification_token, pipeline_stage, timestamp) VALUES (1,'acme','Priya Shah','priya@clinic.com','Website','Pending','Wants a clinic site',0,'tok-1','lead',${now - 3600e3});
CREATE TABLE email_sequences (id INTEGER PRIMARY KEY, lead_id INTEGER, client_id TEXT, email_number INTEGER, subject TEXT, body TEXT, status TEXT, scheduled_for INTEGER);
CREATE TABLE chat_logs (id INTEGER PRIMARY KEY, client_id TEXT, user_message TEXT, bot_response TEXT, timestamp INTEGER, session_id TEXT);`);
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const sent = []; let mxOk = true;
const kv = new Map();
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v), delete: async k => kv.delete(k), list: async () => ({ keys: [], list_complete: true }) };
sent.length = 0; globalThis.fetch = async (u, o = {}) => { if (String(u).includes('resend')) sent.push(JSON.parse(o.body)); return new Response('{"id":"x"}'); };
const env = { DB: { prepare: prep, batch: async s => { for (const x of s) await x.run(); } }, JWT_SECRET: 'x', OAUTH_TOKENS: KV, CLIENT_SETTINGS: KV, RESEND_API_KEY: 're_x', ADMIN_EMAILS: 'boss@x.com' };
const ctx = { waitUntil: p => p };
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
const post = async (path, body, ip = '1.1.1.1') => { const r = await mod.__app.fetch(new Request('http://x' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip }, body: JSON.stringify(body) }), env, ctx); return [r.status, await r.json().catch(() => ({}))]; };
let [st, j] = await post('/api/register', { clientId: 'shop-abc123', ownerEmail: 'o@shop.com', settings: { companyName: 'Shop' } });
ok('signup without a website is refused', st === 400 && j.field === 'website', j.error);
[st, j] = await post('/api/register', { clientId: 'shop-abc123', ownerEmail: 'o@shop.com', settings: { companyName: 'Shop', website: 'https://www.Shop.com/about' } });
ok('signup saves the website as the only allowed domain', st === 200 && JSON.stringify(JSON.parse(kv.get('client:shop-abc123')).allowedDomains) === '["shop.com"]', `${st} ${kv.get('client:shop-abc123')}`);
// the chat worker tells us a bot was used on a website that is not on its list
kv.set('client:old-bot', JSON.stringify({ allowedDomains: ['found.com'], alertEmail: 'owner@old.com' }));
db.exec(`INSERT INTO crm_settings (client_id, default_campaign_mode, auto_approve_campaigns, plan, trial_started_at, trial_ends_at) VALUES ('old-bot','ai',0,'free',0,0)`);
kv.set('mail:old-bot', JSON.stringify({ provider: 'resend', fromEmail: 'hi@old.com', apiKey: 're_x' }));
[st, j] = await post('/api/webhooks/domain-unlisted', { clientId: 'old-bot', domain: 'found.com' });
ok('nothing to tell about a site the bot already has', st === 409);
[st, j] = await post('/api/webhooks/domain-unlisted', { clientId: 'old-bot', domain: 'other.com' });
ok('owner emailed once about the site that is not on the list', st === 200 && sent.some(m => m.to[0] === 'owner@old.com' && /used on other.com/.test(m.subject)), JSON.stringify(sent.map(m => m.to)));
ok('nothing was added to the website list', JSON.parse(kv.get('client:old-bot')).allowedDomains.join() === 'found.com', kv.get('client:old-bot'));
const n = sent.length; [st, j] = await post('/api/webhooks/domain-unlisted', { clientId: 'old-bot', domain: 'other.com' });
ok('no duplicate email', sent.length === n && j.duplicate);

// A new client's lead alerts go to the email they signed up with, not to the sender address. A client with no
// sender of their own sends through BytesFX's, so the old fallback mailed their alerts to BytesFX.
kv.set('mail:agency_demo', JSON.stringify({ provider: 'resend', fromEmail: 'hello@bytesfx.com', apiKey: 're_x' }));
ok('sign-up saves the sign-up email as the lead alerts email', JSON.parse(kv.get('client:shop-abc123')).alertEmail === 'o@shop.com', kv.get('client:shop-abc123'));
sent.length = 0;
[st, j] = await post('/api/webhooks/domain-unlisted', { clientId: 'shop-abc123', domain: 'elsewhere.com' });
ok("a new client's alert goes to their own email, not BytesFX's sender", st === 200 && sent.length === 1 && sent[0].to[0] === 'o@shop.com', JSON.stringify(sent.map(m => m.to)));
[st, j] = await post('/api/register', { clientId: 'case-abc123', ownerEmail: '  Owner@Case.COM ', settings: { companyName: 'Case', website: 'case.com' } }, '1.1.1.2');
ok('the saved alerts email is trimmed and lower-cased', st === 200 && JSON.parse(kv.get('client:case-abc123')).alertEmail === 'owner@case.com', kv.get('client:case-abc123'));
[st, j] = await post('/api/register', { clientId: 'bad-abc123', ownerEmail: 'not-an-email', settings: { companyName: 'Bad', website: 'bad.com' } }, '1.1.1.3');
ok('an invalid sign-up email is not saved as the alerts email', st === 200 && !('alertEmail' in JSON.parse(kv.get('client:bad-abc123'))), kv.get('client:bad-abc123'));
