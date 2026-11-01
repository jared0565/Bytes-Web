import { DatabaseSync } from 'node:sqlite';
const m = await import('./src/index.js');
const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE crm_settings (client_id TEXT PRIMARY KEY, default_campaign_mode TEXT, auto_approve_campaigns INTEGER, plan TEXT DEFAULT 'free', trial_started_at INTEGER DEFAULT 0, trial_ends_at INTEGER DEFAULT 0);
CREATE TABLE users (id INTEGER PRIMARY KEY, social_id TEXT, provider TEXT, email TEXT UNIQUE, name TEXT, picture TEXT, created_at INTEGER);
CREATE TABLE leads (id INTEGER PRIMARY KEY, client_id TEXT, is_verified INTEGER, pipeline_stage TEXT);
CREATE TABLE email_sequences (id INTEGER PRIMARY KEY, lead_id INTEGER, client_id TEXT, email_number INTEGER, subject TEXT, body TEXT, status TEXT, scheduled_for INTEGER);
INSERT INTO leads VALUES (1,'acme-1234',1,'lead'),(2,'other-9',1,'lead'); INSERT INTO email_sequences (lead_id,client_id,email_number,subject,body,status) VALUES (1,'acme-1234',1,'s','b','draft'),(2,'other-9',1,'s2','b2','draft');`);
const prep = (sql) => { const st = db.prepare(sql); let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: st.all(...a) }), first: async () => st.get(...a) ?? null, run: async () => { const r = st.run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const kvs = () => { const mp = new Map(); return { mp, get: async k => mp.get(k) ?? null, put: async (k, v) => mp.set(k, v), delete: async k => mp.delete(k), list: async () => ({ keys: [] }) }; };
const OT = kvs(), CS = kvs();
const env = { DB: { prepare: prep, batch: async s => Promise.all(s.map(x => x.run())) }, JWT_SECRET: 'x', OAUTH_STATE_SECRET: 's', ADMIN_EMAILS: 'boss@bytesfx.com', GOOGLE_CLIENT_ID: 'g', OAUTH_TOKENS: OT, CLIENT_SETTINGS: CS, FRONTEND_DASHBOARD_URL: 'https://d/dashboard/' };
let gUser = {};
globalThis.fetch = async (u) => String(u).includes('token') ? new Response(JSON.stringify({ access_token: 'a' })) : new Response(JSON.stringify(gUser));
const req = async (method, path, body, tok) => { const h = { 'Content-Type': 'application/json' }; if (tok) h.Authorization = 'Bearer ' + tok; const r = await m.__app.fetch(new Request('http://x' + path, { method, headers: h, body: body && JSON.stringify(body), redirect: 'manual' }), env, { waitUntil() {} }); return r; };
const ok = (label, cond, extra = '') => console.log(cond ? 'PASS' : 'FAIL', label, extra);

// Register
let r = await req('POST', '/api/register', { clientId: 'acme-1234', ownerEmail: 'Owner@Acme.com', settings: { companyName: 'Acme', systemPrompt: 'p', website: 'acme.com' } });
const reg = await r.json(); ok('register', r.status === 200 && reg.setupToken);
r = await req('POST', '/api/register', { clientId: 'acme-5678', ownerEmail: 'owner@acme.com', settings: { website: 'acme.com' } });
let j = await r.json(); ok('re-register same email refused', r.status === 409 && j.hasSetup, JSON.stringify(j));
ok('mapping not re-pointed', OT.mp.get('email_client:owner@acme.com') === 'acme-1234');
ok('no orphan crm row', !db.prepare("select 1 from crm_settings where client_id='acme-5678'").get());

// register-settings whitelist
r = await req('POST', '/api/register-settings', { setupToken: reg.setupToken, settings: { systemPrompt: '  New prompt ', autoApproveCampaigns: true, showBranding: false, mode: 'elite', allowedDomains: ['evil.com'], badgeUrl: 'https://evil' } });
const cfg = JSON.parse(CS.mp.get('client:acme-1234'));
ok('register-settings 200', r.status === 200);
ok('whitelist', cfg.systemPrompt === 'New prompt' && cfg.mode === 'ai' && cfg.showBranding === true && cfg.allowedDomains.join() === 'acme.com' && cfg.badgeUrl.includes('bytesfx') && cfg.companyName === 'Acme', JSON.stringify(cfg));
ok('a new bot\'s "Powered by BytesFX" badge opens the AI chatbot page on its plans', cfg.badgeUrl === 'https://web.bytesfx.com/ai-chatbot/?upgrade=free#pricing', cfg.badgeUrl);
ok('auto-approve to D1', db.prepare("select auto_approve_campaigns a from crm_settings where client_id='acme-1234'").get().a === 1);

// OAuth dashboard login
const login = async (user) => { gUser = user; const st = await m.generateOAuthState('s', 'dashboard', '', 'abcdefabcdefabcdef123456'); const r = await req('GET', `/api/auth/google/callback?code=c&state=${encodeURIComponent(st)}`); return r.headers.get('location'); };
let loc = await login({ id: 'g1', email: 'OWNER@acme.com', name: 'O', verified_email: true });
ok('client login → grant', /session_grant=/.test(loc), loc);
const grant = new URL(loc).searchParams.get('session_grant');
r = await req('GET', `/api/auth/redeem-grant?token=${grant}&nonce=abcdefabcdefabcdef123456`); j = await r.json();
const ctok = j.sessionToken; ok('grant redeemed', !!ctok);
r = await req('GET', '/api/auth/me', null, ctok); j = await r.json();
ok('me is client acme', j.role === 'client' && j.clientId === 'acme-1234' && j.companyName === 'Acme', JSON.stringify(j));
loc = await login({ id: 'g2', email: 'stranger@x.com', name: 'S' }); ok('unknown email refused', loc.endsWith('social_error=not_authorized'), loc);
loc = await login({ id: 'g3', email: 'owner@acme.com', name: 'U', verified_email: false }); ok('unverified refused', loc.endsWith('social_error=not_authorized'), loc);
loc = await login({ id: 'g4', email: 'boss@bytesfx.com', name: 'B' }); ok('admin → 2FA setup', /step=setup-2fa/.test(loc), loc);

// Client data scoping
const ok2 = async (label, method, path, body, expect) => { const r = await req(method, path, body, ctok); ok(label, r.status === expect, r.status); };
await ok2('GET own sequences', 'GET', '/api/sequences?leadId=1', null, 200);
await ok2('GET other sequences', 'GET', '/api/sequences?leadId=2', null, 404);
await ok2('PUT other sequence by id', 'PUT', '/api/sequences', { id: 2, subject: 'x', body: 'x' }, 404);
await ok2('PUT own sequence by id', 'PUT', '/api/sequences', { id: 1, subject: 'x', body: 'x' }, 200);
await ok2('insert seq on other lead', 'PUT', '/api/sequences', { leadId: 2, email_number: 2, subject: 'x', body: 'x' }, 404);
await ok2('approve other', 'POST', '/api/sequences/approve', { leadId: 2 }, 404);
await ok2('approve own', 'POST', '/api/sequences/approve', { leadId: 1 }, 200);
await ok2('generate other', 'POST', '/api/generate-sequence', { leadId: 2 }, 404);
ok('other seq untouched', db.prepare('select subject s from email_sequences where id=2').get().s === 's2');
await ok2('config strips privileged keys', 'POST', '/api/config', { settings: { companyName: 'Acme2', allowedDomains: ['a.com', 'b.com'], badgeUrl: 'https://evil' } }, 200);
const cfg2 = JSON.parse(CS.mp.get('client:acme-1234')); ok('  stored', cfg2.companyName === 'Acme2' && cfg2.allowedDomains.join() === 'acme.com' && cfg2.badgeUrl.includes('bytesfx'), JSON.stringify(cfg2));
await ok2('site-settings blocked', 'GET', '/api/site-settings', null, 403);
await ok2('admin clients blocked', 'GET', '/api/admin/clients', null, 403);
