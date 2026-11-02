// Settings change history. Every change to a client's chatbot settings, email sender, or plan and campaign
// settings is recorded: when, who, what made the change, and the old and new value. Secrets are never kept.
// History is kept for 2 years. Deleting a client deletes its history and keeps one "client deleted" row.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
const mod = await import('./src/index.js');
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
const I = mod.__internals || {};

// ── What changed (a pure function) ───────────────────────────────────────────
const diff = I.settingsDiff;
ok('the what-changed function exists', typeof diff === 'function', typeof diff);
if (typeof diff === 'function') {
    let d = diff({ a: 1, b: 'x' }, { a: 1, b: 'y' });
    ok('only changed settings are listed', d.length === 1 && d[0].field === 'b' && d[0].old === 'x' && d[0].new === 'y', JSON.stringify(d));
    d = diff({ socials: { linkedin: 'a', facebook: '' } }, { socials: { facebook: '', linkedin: 'b' } });
    ok('a setting inside a group is compared on its own, whatever the key order', d.length === 1 && d[0].field === 'socials.linkedin' && d[0].new === 'b', JSON.stringify(d));
    d = diff({ allowedDomains: ['a.com'] }, { allowedDomains: ['a.com', 'b.com'] });
    ok('a list is recorded as one change, old list and new list', d.length === 1 && d[0].field === 'allowedDomains' && d[0].old.length === 1 && d[0].new.length === 2, JSON.stringify(d));
    d = diff({}, { companyName: 'Acme' });
    ok('a new setting has no old value', d.length === 1 && d[0].old === null && d[0].new === 'Acme', JSON.stringify(d));
    d = diff({ bookingUrl: 'https://cal.com/a' }, {});
    ok('a removed setting has no new value', d.length === 1 && d[0].old === 'https://cal.com/a' && d[0].new === null, JSON.stringify(d));
    d = diff({ fromName: '' }, { smtpHost: '' });
    ok('an empty value and a missing one are the same, not a change', d.length === 0, JSON.stringify(d));
    // Plainly fake, low-randomness values: a secret scanner must not mistake a test value for a real key
    d = diff({}, { apiKey: 'xxxxSECRETxxxx', smtpPass: 'yyyySECRETyyyy', webhookToken: 'zzzzSECRETzzzz', clientSecret: 'qqqqSECRETqqqq', password: 'ppppSECRETpppp' });
    ok('keys, passwords, secrets and tokens are recorded only as changed', d.length === 5 && d.every(x => x.masked === true && x.old === null && x.new === null), JSON.stringify(d));
    ok('no secret value is ever in the result', !/SECRET/.test(JSON.stringify(d)));
    ok('an unchanged secret is not listed', diff({ apiKey: 'same' }, { apiKey: 'same' }).length === 0);
    d = diff({ systemPrompt: 'a'.repeat(20000) }, { systemPrompt: 'b'.repeat(20000) });
    ok('the full bot instructions are kept, old and new', d.length === 1 && d[0].old.length === 20000 && d[0].new.length === 20000);
}

// ── A worker with an in-memory database ──────────────────────────────────────
const db = new DatabaseSync(':memory:'); const now = Date.now();
db.exec(`CREATE TABLE crm_settings (client_id TEXT PRIMARY KEY, default_campaign_mode TEXT DEFAULT 'ai', auto_approve_campaigns INTEGER DEFAULT 0, plan TEXT DEFAULT 'free', trial_started_at INTEGER DEFAULT 0, trial_ends_at INTEGER DEFAULT 0);
INSERT INTO crm_settings VALUES ('acme','ai',0,'business',0,0), ('other','ai',0,'pro',0,0), ('trial1','ai',0,'free',${now - 10 * 864e5},${now - 864e5}), ('over','ai',0,'free',0,0);
CREATE TABLE users (id INTEGER PRIMARY KEY, social_id TEXT, provider TEXT, email TEXT UNIQUE, name TEXT, picture TEXT, created_at INTEGER);
INSERT INTO users (id, email) VALUES (7, 'o@acme.com'), (9, 'boss@bytesfx.com');
CREATE TABLE leads (id INTEGER PRIMARY KEY, client_id TEXT, name TEXT, email TEXT, service TEXT, budget TEXT, summary TEXT, is_verified INTEGER, verification_token TEXT, pipeline_stage TEXT, next_best_action TEXT, timestamp INTEGER, updated_at INTEGER, session_id TEXT);
CREATE TABLE email_sequences (id INTEGER PRIMARY KEY, lead_id INTEGER, client_id TEXT, email_number INTEGER, subject TEXT, body TEXT, status TEXT, scheduled_for INTEGER);
CREATE TABLE chat_logs (id INTEGER PRIMARY KEY, client_id TEXT, user_message TEXT, bot_response TEXT, timestamp INTEGER, session_id TEXT);`);
let failHistory = false;
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { if (failHistory && /INSERT INTO settings_history/i.test(sql)) throw new Error('history store down'); const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const kv = new Map([
    ['client:acme', JSON.stringify({ companyName: 'Acme', alertEmail: 'o@acme.com', mode: 'ai', allowedDomains: ['acme.com'] })],
    ['client:other', JSON.stringify({ companyName: 'Other', mode: 'ai', allowedDomains: ['other.com'] })],
    ['client:trial1', JSON.stringify({ companyName: 'Trial', mode: 'ai', allowedDomains: ['trial.com'] })],
    ['client:over', JSON.stringify({ companyName: 'Over', mode: 'scripted', allowedDomains: ['a.com', 'b.com', 'c.com'] })],
    ['client:default', JSON.stringify({ companyName: 'BytesFX', mode: 'ai', allowedDomains: ['bytesfx.com'] })],
    ['email_client:o@acme.com', 'acme'],
    ['migr:bot-modes-v1', '1'],
]);
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v), delete: async k => kv.delete(k), list: async ({ prefix }) => ({ keys: [...kv.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) };
const env = { DB: { prepare: prep, batch: async s => { for (const x of s) await x.run(); } }, JWT_SECRET: 'x', OAUTH_TOKENS: KV, CLIENT_SETTINGS: KV, FILES: { delete: async () => {} }, ADMIN_EMAILS: 'boss@bytesfx.com' };
const ctx = { waitUntil: () => {} };
const owner = await mod.signJWT({ role: 'client', clientId: 'acme', userId: 7 }, 'x');
const admin = await mod.signJWT({ role: 'admin', clientId: 'agency_demo', userId: 9 }, 'x');
const keyAdmin = await mod.signJWT({ role: 'admin', clientId: 'agency_demo' }, 'x'); // admin access key: no account
const call = async (t, m, path, body) => { const h = { 'Content-Type': 'application/json' }; if (t) h.Authorization = 'Bearer ' + t; const r = await mod.__app.fetch(new Request('http://x' + path, { method: m, headers: h, body: body && JSON.stringify(body) }), env, ctx); return [r.status, await r.json().catch(() => ({}))]; };
const hist = (cid) => { try { return db.prepare('SELECT * FROM settings_history WHERE client_id = ? ORDER BY id').all(cid); } catch { return []; } };
const val = (v) => v == null ? null : JSON.parse(v);
const cfgOf = (id) => JSON.parse(kv.get(`client:${id}`) || '{}');

// ── The owner changes the lead alerts email ──────────────────────────────────
let [st, j] = await call(owner, 'POST', '/api/config', { settings: { alertEmail: 'sales@acme.com' } });
let h = hist('acme'), row = h.find(r => r.field === 'alertEmail');
ok('the owner\'s save still works', st === 200 && cfgOf('acme').alertEmail === 'sales@acme.com', st);
ok('the lead alerts email change is recorded, old and new', !!row && val(row.old_value) === 'o@acme.com' && val(row.new_value) === 'sales@acme.com', JSON.stringify(row));
ok('it is recorded under the owner, by the email of their account', row?.actor === 'owner' && row?.actor_email === 'o@acme.com', `${row?.actor} ${row?.actor_email}`);
ok('it says what made the change and which settings', row?.source === 'POST /api/config' && row?.store === 'chatbot settings', `${row?.source} | ${row?.store}`);
ok('it says when', !!row && Math.abs(row.ts - Date.now()) < 60e3, row?.ts);
ok('settings that did not change are not recorded', h.length === 1, h.map(r => r.field).join());
await call(owner, 'POST', '/api/config', { settings: { alertEmail: 'sales@acme.com' } });
ok('saving the same value again records nothing', hist('acme').length === 1, hist('acme').length);

// ── The email sender ─────────────────────────────────────────────────────────
const fakeKey = 'kkkkSECRETKEYkkkk'; // plainly fake, see above
[st] = await call(owner, 'POST', '/api/mail-settings', { provider: 'resend', fromEmail: 'hi@acme.com', apiKey: fakeKey });
h = hist('acme').filter(r => r.store === 'email sender');
ok('the email sender save still works', st === 200 && JSON.parse(kv.get('mail:acme')).apiKey === fakeKey, st);
ok('the email sender change is recorded', h.some(r => r.field === 'fromEmail' && val(r.new_value) === 'hi@acme.com') && h.some(r => r.field === 'provider' && val(r.new_value) === 'resend'), h.map(r => r.field).join());
ok('the API key is recorded only as changed', h.some(r => r.field === 'apiKey' && r.masked === 1 && r.old_value === null && r.new_value === null), JSON.stringify(h.find(r => r.field === 'apiKey')));
const everything = () => { try { return db.prepare('SELECT * FROM settings_history').all(); } catch { return []; } };
ok('the API key is nowhere in the history', everything().length > 0 && !JSON.stringify(everything()).includes('SECRETKEY'), everything().length);
let n = hist('acme').length;
await call(owner, 'POST', '/api/mail-settings', { provider: 'resend', fromEmail: 'hi@acme.com', apiKey: '••••kkkk' });
ok('saving the form again with the hidden key records nothing', hist('acme').length === n, `${n} → ${hist('acme').length}`);

// ── Allowed websites ─────────────────────────────────────────────────────────
[st] = await call(owner, 'POST', '/api/installations', { allowedDomains: ['acme.com', 'shop.acme.com', 'blog.acme.com'] });
row = hist('acme').filter(r => r.field === 'allowedDomains').pop();
ok('a change to the allowed websites is recorded, old list and new', st === 200 && !!row && val(row.old_value).join() === 'acme.com' && val(row.new_value).length === 3 && row.source === 'POST /api/installations', JSON.stringify(row));

// ── Campaign settings ────────────────────────────────────────────────────────
[st] = await call(owner, 'POST', '/api/crm-settings', { default_campaign_mode: 'rule', auto_approve_campaigns: true });
h = hist('acme').filter(r => r.store === 'plan and campaigns');
ok('a campaign settings change is recorded, old and new', st === 200 && h.some(r => r.field === 'default_campaign_mode' && val(r.old_value) === 'ai' && val(r.new_value) === 'rule') && h.some(r => r.field === 'auto_approve_campaigns' && val(r.old_value) === 0 && val(r.new_value) === 1), JSON.stringify(h));

// ── An admin changes the plan; the website list it cuts is recorded under that admin ──
[st] = await call(admin, 'POST', '/api/admin/clients/acme/plan', { plan: 'free' });
row = hist('acme').find(r => r.field === 'plan');
ok('a plan change is recorded, old and new', st === 200 && !!row && val(row.old_value) === 'business' && val(row.new_value) === 'free' && row.store === 'plan and campaigns', JSON.stringify(row));
ok('it is recorded under the admin, by the email of their account', row?.actor === 'admin' && row?.actor_email === 'boss@bytesfx.com', `${row?.actor} ${row?.actor_email}`);
row = hist('acme').filter(r => r.field === 'allowedDomains').pop();
ok('the website list that plan change cut is recorded under the same admin', !!row && val(row.new_value).length === 1 && row.actor === 'admin' && row.source === 'POST /api/admin/clients/:id/plan', JSON.stringify(row));

// ── An admin signed in with the access key ───────────────────────────────────
[st] = await call(keyAdmin, 'POST', '/api/config', { clientId: 'other', settings: { companyName: 'Other Co' } });
row = hist('other').find(r => r.field === 'companyName');
ok('a change by the admin access key says so', st === 200 && row?.actor === 'admin (access key)' && !row?.actor_email, `${row?.actor} ${row?.actor_email}`);

// ── The Bytes website's own bot ──────────────────────────────────────────────
[st] = await call(admin, 'POST', '/api/site-settings', { companyName: 'BytesFX Ltd' });
row = hist('default').find(r => r.field === 'companyName');
ok('a change to the Bytes website\'s bot is recorded', st === 200 && !!row && val(row.new_value) === 'BytesFX Ltd' && row.actor === 'admin', JSON.stringify(row));

// ── Sign-up ──────────────────────────────────────────────────────────────────
[st, j] = await call(null, 'POST', '/api/register', { clientId: 'newco-1234', ownerEmail: 'Founder@NewCo.com', settings: { companyName: 'NewCo', systemPrompt: 'Be nice', website: 'newco.com' } });
h = hist('newco-1234');
ok('the sign-up still works', st === 200 && !!j.setupToken, st);
ok('the settings saved at sign-up are recorded', h.some(r => r.field === 'companyName' && val(r.new_value) === 'NewCo') && h.some(r => r.field === 'allowedDomains') && h.some(r => r.field === 'plan' && val(r.new_value) === 'free') && h.some(r => r.field === 'trial_ends_at'), h.map(r => r.field).join());
ok('sign-up changes are recorded as sign-up, with the email given but not yet confirmed', h.length > 0 && h.every(r => r.actor === 'sign-up (unconfirmed email)' && r.actor_email === 'founder@newco.com'), JSON.stringify(h[0]));
[st] = await call(null, 'POST', '/api/register-settings', { setupToken: j.setupToken, settings: { systemPrompt: 'Be very nice', autoApproveCampaigns: true } });
row = hist('newco-1234').filter(r => r.field === 'systemPrompt').pop();
ok('a bot instructions change at sign-up keeps the old and new text', st === 200 && !!row && val(row.old_value) === 'Be nice' && val(row.new_value) === 'Be very nice' && row.actor === 'sign-up (unconfirmed email)', JSON.stringify(row));
ok('the campaign choice at sign-up is recorded', hist('newco-1234').some(r => r.field === 'auto_approve_campaigns' && val(r.new_value) === 1));

// ── Automatic changes ────────────────────────────────────────────────────────
if (typeof I.handleVerificationCron === 'function') await I.handleVerificationCron(env);
row = hist('trial1').find(r => r.field === 'mode');
ok('a trial ending is recorded as automatic', cfgOf('trial1').mode === 'scripted' && !!row && val(row.old_value) === 'ai' && val(row.new_value) === 'scripted' && row.actor === 'automatic' && row.source === 'trial expiry', JSON.stringify(row));
if (typeof I.enforcePlanLimits === 'function') await I.enforcePlanLimits(env);
row = hist('over').find(r => r.field === 'allowedDomains');
ok('the hourly website-list trim is recorded as automatic', cfgOf('over').allowedDomains.length === 1 && !!row && row.actor === 'automatic' && row.source === 'hourly plan check', JSON.stringify(row));

// ── If recording fails, the save still works and the failure is logged ───────
const logged = []; const realError = console.error;
console.error = (...a) => logged.push(a.map(String).join(' '));
failHistory = true;
[st] = await call(owner, 'POST', '/api/config', { settings: { companyName: 'Acme Ltd' } });
failHistory = false; console.error = realError;
ok('a save still works when recording fails', st === 200 && cfgOf('acme').companyName === 'Acme Ltd', st);
ok('the recording failure is logged as an error', logged.some(l => l.includes('[History]') && l.includes('history store down')), logged.join(' | ').slice(0, 200));

// ── Reading the history (admins only) ────────────────────────────────────────
[st, j] = await call(admin, 'GET', '/api/admin/clients/acme/history');
const list = j.history || [];
ok('an admin can read a client\'s history', st === 200 && list.length === hist('acme').length, `${st} ${list.length}/${hist('acme').length}`);
ok('newest first', list.length > 1 && list[0].at >= list[list.length - 1].at && list[0].id > list[list.length - 1].id, list.slice(0, 2).map(x => x.id).join());
const alert = list.find(x => x.field === 'alertEmail');
ok('each entry says when, who, what made it, which setting, old and new', !!alert && alert.at && alert.actor === 'owner' && alert.actorEmail === 'o@acme.com' && alert.source === 'POST /api/config' && alert.old === 'o@acme.com' && alert.new === 'sales@acme.com', JSON.stringify(alert));
const key = list.find(x => x.field === 'apiKey');
ok('a secret shows as changed, with no value', !!key && key.masked === true && key.old === null && key.new === null, JSON.stringify(key));
[st, j] = await call(admin, 'GET', '/api/admin/clients/acme/history?limit=2');
ok('the list can be limited', st === 200 && (j.history || []).length === 2, (j.history || []).length);
[st] = await call(owner, 'GET', '/api/admin/clients/acme/history');
ok('a client cannot read it', st === 403, st);

// ── Deleting a client ────────────────────────────────────────────────────────
const otherBefore = hist('other').length;
await call(admin, 'GET', '/api/leads'); // creates the sales tables the delete clears
[st] = await call(admin, 'DELETE', '/api/admin/clients/acme', { confirm: 'acme' });
h = hist('acme');
ok('deleting a client deletes its history, keeping one row', st === 200 && h.length === 1, `${st} ${h.length}`);
ok('the kept row says the client was deleted, by which admin, and holds nothing else', h[0]?.field === 'client' && val(h[0]?.new_value) === 'deleted' && h[0]?.old_value === null && h[0]?.actor === 'admin' && h[0]?.actor_email === 'boss@bytesfx.com', JSON.stringify(h[0]));
ok('other clients\' history is untouched', otherBefore > 0 && hist('other').length === otherBefore, `${otherBefore} → ${hist('other').length}`);

// ── History is kept for 2 years ──────────────────────────────────────────────
const yearsAgo = (y) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - y); return d.getTime(); };
try {
    db.prepare(`INSERT INTO settings_history (client_id, ts, actor, actor_email, source, store, field, old_value, new_value, masked) VALUES (?, ?, 'automatic', '', 'test', 'chatbot settings', 'mode', NULL, '"ai"', 0)`).run('kept-co', yearsAgo(3));
    db.prepare(`INSERT INTO settings_history (client_id, ts, actor, actor_email, source, store, field, old_value, new_value, masked) VALUES (?, ?, 'automatic', '', 'test', 'chatbot settings', 'mode', NULL, '"ai"', 0)`).run('kept-co', yearsAgo(1));
} catch (_) {}
const jobs = []; const at7 = new Date(); at7.setUTCMinutes(7);
console.error = () => {}; // the other hourly jobs complain about tables this test does not have
await mod.default.scheduled({ scheduledTime: at7.getTime() }, env, { waitUntil: p => jobs.push(p) });
await Promise.allSettled(jobs);
console.error = realError;
h = hist('kept-co');
ok('the hourly job removes history older than 2 years and keeps the rest', h.length === 1 && h[0].ts > yearsAgo(2), h.map(r => new Date(r.ts).toISOString().slice(0, 10)).join());

// ── Guard: every settings write goes through the save functions ──────────────
// A new route that writes settings directly would leave a silent gap in the history.
const src = readFileSync(new URL('./src/index.js', import.meta.url), 'utf8');
const START = '// ── Settings writes: start', END = '// ── Settings writes: end';
const s = src.indexOf(START), e = src.indexOf(END);
ok('the settings save functions are marked once', s > 0 && e > s && src.indexOf(START, s + 1) === -1 && src.indexOf(END, e + 1) === -1, `${s} ${e}`);
const WRITE = /CLIENT_SETTINGS\.(put|delete)\(|OAUTH_TOKENS\.(put|delete)\(\s*`mail:|(INSERT\s+(OR\s+\w+\s+)?INTO|UPDATE|DELETE\s+FROM)\s+crm_settings\b|'crm_settings'/;
// Allowed on purpose: where a sign-up came from is for Analytics, not a setting the client chose
const ALLOWED = ['UPDATE crm_settings SET signup_source'];
const outside = s > 0 && e > s ? src.slice(0, s) + src.slice(e) : src;
const stray = outside.split('\n').filter(l => WRITE.test(l) && !ALLOWED.some(a => l.includes(a))).map(l => l.trim().slice(0, 90));
ok('crm-api writes settings only through the save functions', stray.length === 0, `${stray.length}: ${stray.slice(0, 20).join(' || ')}`);
ok('the save functions are where the writes are', s > 0 && e > s && src.slice(s, e).split('\n').filter(l => WRITE.test(l)).length >= 4);
const others = readdirSync(new URL('./src/', import.meta.url)).filter(f => f.endsWith('.js') && f !== 'index.js');
const chatDir = new URL('../../../../chatbot-api/src/', import.meta.url);
const chatFiles = readdirSync(chatDir).filter(f => f.endsWith('.ts'));
const elsewhere = [...others.map(f => [f, readFileSync(new URL(`./src/${f}`, import.meta.url), 'utf8')]), ...chatFiles.map(f => [`chatbot-api/${f}`, readFileSync(new URL(f, chatDir), 'utf8')])]
    .flatMap(([f, t]) => t.split('\n').filter(l => WRITE.test(l) || /\.(put|delete)\(\s*`(client|mail):/.test(l)).map(l => `${f}: ${l.trim().slice(0, 80)}`));
ok('no other file writes settings (crm-api helpers, chatbot-api)', chatFiles.length > 0 && elsewhere.length === 0, elsewhere.join(' || '));
