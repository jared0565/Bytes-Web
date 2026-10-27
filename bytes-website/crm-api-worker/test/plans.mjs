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
const kv = new Map([['client:biz', JSON.stringify({ mode: 'ai_plus', showBranding: false, widgetName: 'Zed', widgetAccentColor: '#123456' })], ['client:fr', '{}'], ['client:tb', '{}'], ['client:ent', '{}']]);
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v), delete: async k => kv.delete(k), list: async ({ prefix }) => ({ keys: [...kv.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) };
db.exec(`INSERT INTO crm_settings VALUES ('biz','ai',0,'business',0,0); INSERT INTO crm_settings VALUES ('fr','ai',0,'free',0,0); INSERT INTO crm_settings VALUES ('ent','ai',0,'enterprise',0,0); INSERT INTO crm_settings VALUES ('tb','ai',0,'business',${now - 864e5},${now + 5 * 864e5});`);
const env = { DB: { prepare: prep, batch: async s => { for (const x of s) await x.run(); } }, JWT_SECRET: 'x', OAUTH_TOKENS: KV, CLIENT_SETTINGS: KV };
const ctx = { waitUntil: p => p };
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
const tok = async (cid, role = 'client') => mod.signJWT(role === 'admin' ? { role } : { role, clientId: cid }, 'x');
const call = async (t, m, path, body) => { const r = await mod.__app.fetch(new Request('http://x' + path, { method: m, headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) }), env, ctx); return [r.status, await r.json().catch(() => ({}))]; };
let [st, j] = await call(await tok('biz'), 'GET', '/api/installations'); ok('Business = 25 websites (plans.json)', j.maxDomains === 25, j.maxDomains);
[st, j] = await call(await tok('tb'), 'GET', '/api/installations'); ok('Business in trial gets Business limits, not Free', j.maxDomains === 25, j.maxDomains);
// The Pricing section says "50 websites" on Enterprise: the limit, and a list that long is kept whole
[st, j] = await call(await tok('ent'), 'GET', '/api/installations'); ok('Enterprise = 50 websites (plans.json)', j.maxDomains === 50, j.maxDomains);
[st, j] = await call(await tok('ent'), 'POST', '/api/installations', { allowedDomains: Array.from({ length: 50 }, (_, i) => `site${i}.com`) }); ok('Enterprise can save 50 websites', st === 200 && j.allowedDomains.length === 50, `${st} ${j.allowedDomains?.length}`);
[st, j] = await call(await tok('tb'), 'GET', '/api/config'); ok('Business in trial: AI Plus allowed, badge optional, white label on', j.modesAllowed.includes('ai_plus') && !j.brandingMandatory && j.whiteLabelEnabled, JSON.stringify([j.modesAllowed, j.brandingMandatory, j.whiteLabelEnabled]));
[st, j] = await call(await tok('fr'), 'POST', '/api/installations', { allowedDomains: ['a.com', 'b.com'] }); ok('Free capped at 1 website', st === 400 && /1 website/.test(j.error), j.error);
// approve on Free
db.exec(`INSERT INTO leads (id, client_id, name, email, is_verified, pipeline_stage, timestamp) VALUES (50,'fr','A','a@x.com',1,'lead',${now})`);
[st, j] = await call(await tok('fr'), 'POST', '/api/sequences/approve', { leadId: 50 }); ok('Free cannot approve campaigns (server)', st === 403 && j.planLimited, j.error);
[st, j] = await call(await tok('', 'admin'), 'POST', '/api/sequences/approve', { leadId: 50 }); ok('admin can', st === 200, st);
// test-lead limit on Free: 50 contacts
for (let i = 0; i < 49; i++) db.exec(`INSERT INTO leads (client_id, name, email, timestamp) VALUES ('fr','x','x${i}@x.com',${now - 2 * 864e5})`);
[st, j] = await call(await tok('fr'), 'POST', '/api/test-lead', { email: 'z@x.com', name: 'Z' }); ok('test leads respect Free 50-contact limit', st === 429 && /50 contacts/.test(j.error), j.error);
// downgrade strips white label + forces badge
[st, j] = await call(await tok('', 'admin'), 'POST', '/api/admin/clients/biz/plan', { plan: 'pro' });
const b = JSON.parse(kv.get('client:biz'));
ok('Business → Pro: mode AI, white label removed, badge still optional', b.mode === 'ai' && !b.widgetName && !b.widgetAccentColor && b.showBranding === false, kv.get('client:biz'));
[st, j] = await call(await tok('', 'admin'), 'POST', '/api/admin/clients/biz/plan', { plan: 'starter' });
ok('Pro → Starter: badge forced back on', JSON.parse(kv.get('client:biz')).showBranding === true, kv.get('client:biz'));

// ── A plan change caps the website list ──────────────────────────────────────
// The widget answers on every domain in the saved list, so a downgrade has to cut the
// list down to what the new plan covers. Otherwise a downgraded client keeps running
// the widget on websites the new plan does not include.
const siteList = (n, p) => Array.from({ length: n }, (_, i) => `${p}${i}.com`);
kv.set('client:dw1', JSON.stringify({ mode: 'ai_plus', allowedDomains: siteList(25, 'b') }));   // business
kv.set('client:dw2', JSON.stringify({ mode: 'ai_plus', allowedDomains: siteList(50, 'e') }));   // enterprise
kv.set('client:dw3', JSON.stringify({ mode: 'ai', allowedDomains: siteList(10, 'p') }));        // pro
kv.set('client:dw4', JSON.stringify({ mode: 'scripted', allowedDomains: siteList(3, 'old') })); // free
kv.set('client:default', JSON.stringify({ mode: 'ai', allowedDomains: siteList(4, 'house') })); // the Bytes website
db.exec(`INSERT INTO crm_settings VALUES ('dw1','ai',0,'business',0,0);
         INSERT INTO crm_settings VALUES ('dw2','ai',0,'enterprise',0,0);
         INSERT INTO crm_settings VALUES ('dw3','ai',0,'pro',0,0);
         INSERT INTO crm_settings VALUES ('dw4','ai',0,'free',0,0);
         INSERT INTO crm_settings VALUES ('default','ai',0,'free',0,0);`);
const listOf = (id) => JSON.parse(kv.get(`client:${id}`)).allowedDomains;
[st, j] = await call(await tok('', 'admin'), 'POST', '/api/admin/clients/dw1/plan', { plan: 'free' });
ok('Business → Free: the website list is cut to 1', listOf('dw1').length === 1, listOf('dw1').length);
[st, j] = await call(await tok('', 'admin'), 'POST', '/api/admin/clients/dw2/plan', { plan: 'business' });
ok('Enterprise → Business: the website list is cut to 25', listOf('dw2').length === 25, listOf('dw2').length);
[st, j] = await call(await tok('', 'admin'), 'POST', '/api/admin/clients/dw3/plan', { plan: 'business' });
ok('Pro → Business: an upgrade keeps the whole list', listOf('dw3').length === 10, listOf('dw3').length);
[st, j] = await call(await tok('', 'admin'), 'POST', '/api/admin/clients/dw3/plan', { plan: 'starter' });
ok('Business → Starter: the website list is cut to 3', listOf('dw3').length === 3, listOf('dw3').length);
// The cut list keeps the first websites, not the last ones
ok('The websites kept are the first ones', listOf('dw3')[0] === 'p0.com', listOf('dw3')[0]);
// A client cannot put the list back after a downgrade
[st, j] = await call(await tok('dw1'), 'POST', '/api/config', { settings: { allowedDomains: siteList(5, 'x') } });
ok('A client cannot restore a cut website list', listOf('dw1').length === 1, listOf('dw1').length);
[st, j] = await call(await tok('dw1'), 'POST', '/api/installations', { allowedDomains: siteList(5, 'x') });
ok('A client over the plan limit is refused when saving websites', st === 400 && j.planLimited, `${st} ${j.error}`);
// An admin's save is capped by the plan too
[st, j] = await call(await tok('', 'admin'), 'POST', '/api/config', { clientId: 'dw1', settings: { allowedDomains: siteList(4, 'z') } });
ok('An admin save is cut to the plan limit', listOf('dw1').length === 1, listOf('dw1').length);
// The hourly pass repairs a list left over from before the fix, and leaves the Bytes website alone
const enforcePlanLimits = mod.__internals.enforcePlanLimits;
ok('The hourly pass exists', typeof enforcePlanLimits === 'function', typeof enforcePlanLimits);
if (typeof enforcePlanLimits === 'function') {
    await enforcePlanLimits(env);
    ok('The hourly pass cuts a list left over from an earlier downgrade', listOf('dw4').length === 1, listOf('dw4').length);
    ok('The hourly pass leaves the Bytes website\'s own bot alone', listOf('default').length === 4, listOf('default').length);
}
