import { DatabaseSync } from 'node:sqlite';
const m = await import('./src/index.js');
const db = new DatabaseSync(':memory:'); const now = Date.now();
db.exec(`CREATE TABLE crm_settings (client_id TEXT PRIMARY KEY, default_campaign_mode TEXT, auto_approve_campaigns INTEGER, plan TEXT DEFAULT 'free', trial_started_at INTEGER DEFAULT 0, trial_ends_at INTEGER DEFAULT 0);
CREATE TABLE users (id INTEGER PRIMARY KEY, social_id TEXT, provider TEXT, email TEXT UNIQUE, name TEXT, picture TEXT, created_at INTEGER);
CREATE TABLE leads (id INTEGER PRIMARY KEY, client_id TEXT, name TEXT, email TEXT, budget TEXT, is_verified INTEGER, verification_token TEXT, pipeline_stage TEXT, timestamp INTEGER, updated_at INTEGER, session_id TEXT);
INSERT INTO leads (id, client_id, name, email, timestamp, pipeline_stage, is_verified, verification_token) VALUES (1,'c1','Old','o@x.com',${now - 86400e3},'active',1,NULL),(2,'c1','New','n@x.com',${now - 60e3},NULL,NULL,NULL),(3,'c1','V','v@x.com',${now},'lead',0,'tok-abc');`);
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const kvs = (init = []) => { const mp = new Map(init); return { mp, get: async k => mp.get(k) ?? null, put: async (k, v) => mp.set(k, v), delete: async k => mp.delete(k), list: async () => ({ keys: [] }) }; };
const OT = kvs([['totp:secret', 'JBSWY3DPEHPK3PXP'], ['totp:secret:1', 'JBSWY3DPEHPK3PXP'], ['email_client:owner@acme.com', 'acme-1']]);
const CS = kvs([['client:default', '{"mode":"ai"}'], ['client:kvonly-1', '{}']]);
const env = { DB: { prepare: prep, batch: async s => { for (const x of s) await x.run(); } }, JWT_SECRET: 'x', OAUTH_STATE_SECRET: 's', ADMIN_SECRET: 'super-secret', ADMIN_EMAILS: 'boss@bytesfx.com', ALLOWED_ORIGINS: 'https://web.bytesfx.com', OAUTH_TOKENS: OT, CLIENT_SETTINGS: CS, FRONTEND_DASHBOARD_URL: 'https://d/dashboard/', FRONTEND_ONBOARDING_URL: 'https://d/onboarding/' };
let gUser = {}; globalThis.fetch = async (u) => String(u).includes('token') ? new Response(JSON.stringify({ access_token: 'a' })) : new Response(JSON.stringify(gUser));
const ctx = { waitUntil() {} };
const req = async (method, path, { body, origin, headers = {} } = {}) => { const h = { ...headers }; if (body !== undefined && !h['Content-Type']) h['Content-Type'] = 'application/json'; if (origin) h.Origin = origin; const r = await m.__app.fetch(new Request('http://x' + path, { method, headers: h, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) }), env, ctx); return r; };
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
// C1 exchange
let r = await req('GET', '/api/auth/exchange?token=totp:secret'); ok('exchange arbitrary key refused', r.status === 400 && OT.mp.has('totp:secret'));
// errors generic
// H3 register
r = await req('POST', '/api/register', { body: { clientId: 'default', settings: { systemPrompt: 'evil' } }, origin: 'https://web.bytesfx.com' }); ok('register default refused', r.status === 409 && CS.mp.get('client:default') === '{"mode":"ai"}');
r = await req('POST', '/api/register', { body: { clientId: 'kvonly-1', settings: {} }, origin: 'https://web.bytesfx.com' }); ok('register KV-only client refused', r.status === 409);
r = await req('POST', '/api/register', { body: { clientId: 'newco-1', settings: { systemPrompt: 'p', mode: 'elite', allowedDomains: ['x'], llmModel: 'opus', website: 'newco.com' } }, origin: 'https://web.bytesfx.com' }); const nc = JSON.parse(CS.mp.get('client:newco-1') || '{}'); ok('register whitelists settings', r.status === 200 && nc.mode === 'ai' && !nc.llmModel && nc.allowedDomains.join() === 'newco.com', JSON.stringify(nc));
// H4 CSRF
const tok = await m.signJWT({ role: 'admin', clientId: 'agency_demo' }, 'x');
r = await req('POST', '/api/site-settings', { body: { companyName: 'pwn' }, origin: 'https://evil.com', headers: { Authorization: 'Bearer ' + tok } }); ok('cross-site POST refused', r.status === 403);
r = await req('POST', '/api/site-settings', { body: '{"companyName":"pwn"}', origin: 'null', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'text/plain' } }); ok('null-origin POST refused', r.status === 403);
// H5 webhook
r = await req('POST', '/api/webhooks/new-lead', { body: { leadId: 1, clientId: 'x' } }); ok('webhook on old lead refused', r.status === 404 && db.prepare('select pipeline_stage s from leads where id=1').get().s === 'active');
r = await req('POST', '/api/webhooks/new-lead', { body: { leadId: 2 } }); const r2 = await req('POST', '/api/webhooks/new-lead', { body: { leadId: 2 } }); ok('webhook processes new lead once', r.status === 200 && r2.status === 404, `${r.status}/${r2.status}`);
// H6 admin key
r = await req('GET', '/api/auth/totp/setup', { headers: { 'X-Admin-Key': 'super-secret' } }); ok('totp setup refused once set', r.status === 410);
for (let i = 0; i < 10; i++) await req('POST', '/api/auth/login', { body: { key: 'wrong' + i }, origin: 'https://web.bytesfx.com', headers: { 'CF-Connecting-IP': '6.6.6.6' } });
r = await req('POST', '/api/auth/login', { body: { key: 'super-secret' }, origin: 'https://web.bytesfx.com', headers: { 'CF-Connecting-IP': '6.6.6.6' } }); ok('key login rate limited', r.status === 429);
r = await req('POST', '/api/auth/login', { body: { key: 'super-secret' }, origin: 'https://web.bytesfx.com', headers: { 'CF-Connecting-IP': '7.7.7.7' } }); const lj = await r.json(); ok('key login → totp step', lj.step === 'totp');
for (let i = 0; i < 5; i++) r = await req('POST', '/api/auth/totp', { body: { code: '000000', pendingId: lj.pendingId }, origin: 'https://web.bytesfx.com' });
r = await req('POST', '/api/auth/totp', { body: { code: '000000', pendingId: lj.pendingId }, origin: 'https://web.bytesfx.com' }); ok('totp pending dies after 5 wrong codes', r.status === 401 && !OT.mp.has(`totp:pending:${lj.pendingId}`));
// OAuth: nonce + verified email
const nonce = 'abcdefabcdefabcdef123456';
const login = async (user, n = nonce) => { gUser = user; const st = await m.generateOAuthState('s', 'dashboard', '', n); const r = await req('GET', `/api/auth/google/callback?code=c&state=${encodeURIComponent(st)}`); return r.headers.get('location'); };
r = await req('GET', '/api/auth/google?redirect=dashboard'); ok('OAuth start without nonce refused', /social_error=invalid_state/.test(r.headers.get('location')));
let loc = await login({ id: 'g1', email: 'owner@acme.com', verified_email: true });
const grant = new URL(loc).searchParams.get('session_grant');
r = await req('GET', `/api/auth/redeem-grant?token=${grant}&nonce=zzzzzzzzzzzzzzzzzzzzzzzz`); ok('grant with wrong nonce refused', r.status === 401);
loc = await login({ id: 'g1', email: 'owner@acme.com', verified_email: true }); const g2 = new URL(loc).searchParams.get('session_grant');
r = await req('GET', `/api/auth/redeem-grant?token=${g2}&nonce=${nonce}`); ok('grant with right nonce works', r.status === 200);
loc = await login({ id: 'g9', email: 'boss@bytesfx.com', verified_email: false }); ok('unverified admin email refused', /not_authorized/.test(loc), loc);
loc = await login({ id: 'g10', email: 'boss@bytesfx.com', verified_email: true }); const pid = new URL(loc).searchParams.get('pid'); ok('admin → setup-2fa', /setup-2fa/.test(loc));
r = await req('GET', `/api/auth/totp/user-setup?pid=${pid}&nonce=wrongwrongwrongwrongwrong`); ok('2FA setup with wrong nonce refused', r.status === 401);
r = await req('GET', `/api/auth/totp/user-setup?pid=${pid}&nonce=${nonce}`); const sj = await r.json(); ok('2FA setup returns uri, no third-party QR', r.status === 200 && sj.uri && !sj.qrUrl);
// verify-flow pid can't be used to replace an existing authenticator (user 1 has a secret)
OT.mp.set('pending_2fa:11111111-2222-3333-4444-555555555555', JSON.stringify({ userId: 1, provider: 'google', purpose: 'verify', nonce }));
r = await req('GET', `/api/auth/totp/user-setup?pid=11111111-2222-3333-4444-555555555555&nonce=${nonce}`); ok('verify pid cannot run setup', r.status === 401);
OT.mp.set('pending_2fa:11111111-2222-3333-4444-666666666666', JSON.stringify({ userId: 1, provider: 'google', purpose: 'setup', nonce }));
r = await req('GET', `/api/auth/totp/user-setup?pid=11111111-2222-3333-4444-666666666666&nonce=${nonce}`); ok('setup refused when 2FA exists', r.status === 403);
// verify-email: GET doesn't verify, POST does
r = await req('GET', '/api/verify-email?token=tok-abc'); ok('GET shows confirm page only', r.status === 200 && db.prepare('select is_verified v from leads where id=3').get().v === 0 && (await r.text()).includes('Confirm my email'));
r = await req('POST', '/api/verify-email', { body: 'token=tok-abc', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, origin: 'https://crm-api.bmorris0565.workers.dev' }); ok('POST verifies', r.status === 200 && db.prepare('select is_verified v from leads where id=3').get().v === 1);
// generic errors
r = await req('GET', '/api/auth/exchange?token=11111111-2222-3333-4444-555555555555'); ok('exchange missing → 404', r.status === 404);
