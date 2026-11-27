// The platform's default models: an admin reads and saves the four choices (chat default, chat fallback,
// email default, email fallback). The chatbot worker checks a set before it is stored.
import { DatabaseSync } from 'node:sqlite';
const mod = await import('./src/index.js');
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
const logs = []; const realLog = console.log;
const capture = async (fn) => { console.log = (...a) => { logs.push(a); }; try { return await fn(); } finally { console.log = realLog; } };
console.error = () => {};

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, social_id TEXT, provider TEXT, email TEXT UNIQUE, name TEXT, picture TEXT, created_at INTEGER);
INSERT INTO users (id, email) VALUES (7, 'o@acme.com'), (9, 'boss@bytesfx.com');`);
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const kv = new Map([['client:acme', JSON.stringify({ companyName: 'Acme', mode: 'ai' })]]);
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v), delete: async k => kv.delete(k), list: async ({ prefix }) => ({ keys: [...kv.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) };
// Stands in for the chatbot worker's check: it refuses a fallback through OpenRouter and passes the rest
let checked = [];
const LLM = { complete: async () => ({ text: '' }), checkDefaults: async (input) => { checked.push(input); return String(input.chatFallback || '').startsWith('openrouter:') ? { ok: false, error: 'The chat fallback must be a direct supplier model from the fallback list.' } : { ok: true, value: { chatDefault: input.chatDefault || '', chatFallback: input.chatFallback || '', emailDefault: input.emailDefault || '', emailFallback: input.emailFallback || '' } }; } };
const env = { DB: { prepare: prep, batch: async s => { for (const x of s) await x.run(); } }, JWT_SECRET: 'x', OAUTH_TOKENS: KV, CLIENT_SETTINGS: KV, ADMIN_EMAILS: 'boss@bytesfx.com', LLM };
const ctx = { waitUntil: () => {} };
const owner = await mod.signJWT({ role: 'client', clientId: 'acme', userId: 7 }, 'x');
const admin = await mod.signJWT({ role: 'admin', clientId: 'agency_demo', userId: 9 }, 'x');
const call = async (t, m, path, body, e = env) => { const h = { 'Content-Type': 'application/json' }; if (t) h.Authorization = 'Bearer ' + t; const r = await mod.__app.fetch(new Request('http://x' + path, { method: m, headers: h, body: body && JSON.stringify(body) }), e, ctx); return [r.status, await r.json().catch(() => ({}))]; };
const stored = () => JSON.parse(kv.get('platform:models') || 'null');

let [st, j] = await call(null, 'GET', '/api/admin/models');
ok('reading the choices needs a sign-in', st === 401, String(st));
[st, j] = await call(owner, 'GET', '/api/admin/models');
ok('a client cannot read the platform choices', st === 403, String(st));
[st, j] = await call(admin, 'GET', '/api/admin/models');
ok('an admin reads four empty choices before anything is saved', st === 200 && j.chatDefault === '' && j.chatFallback === '' && j.emailDefault === '' && j.emailFallback === '' && !j.updatedAt, JSON.stringify(j));

[st, j] = await call(owner, 'POST', '/api/admin/models', { chatDefault: 'openrouter:x-ai/grok-4.7' });
ok('a client cannot save the platform choices', st === 403 && stored() === null && checked.length === 0, String(st));

const before = Date.now();
[st, j] = await capture(() => call(admin, 'POST', '/api/admin/models', { chatDefault: 'openrouter:x-ai/grok-4.7', chatFallback: 'gemini-3.1-pro-preview', emailDefault: '', emailFallback: 'gemini-2.5-flash-lite', extra: 'ignored' }));
let s = stored();
ok('an admin saves the four choices', st === 200 && j.success === true && s?.chatDefault === 'openrouter:x-ai/grok-4.7' && s.chatFallback === 'gemini-3.1-pro-preview' && s.emailDefault === '' && s.emailFallback === 'gemini-2.5-flash-lite' && !('extra' in s), JSON.stringify(s));
ok('the entry records who saved it and when', s?.updatedBy === 'boss@bytesfx.com' && s.updatedAt >= before, JSON.stringify(s));
ok('the chatbot worker was asked to check exactly the four choices', checked.length === 1 && Object.keys(checked[0]).sort().join() === 'chatDefault,chatFallback,emailDefault,emailFallback', JSON.stringify(checked));
const line = logs.map(a => a[0]).find(x => x && x.kind === 'platform-models');
ok('the change is logged with who made it, the old values and the new', !!line && line.by === 'boss@bytesfx.com' && line.from.chatDefault === '' && line.to.chatDefault === 'openrouter:x-ai/grok-4.7', JSON.stringify(line));

[st, j] = await call(admin, 'GET', '/api/admin/models');
ok('the saved choices are read back', st === 200 && j.chatDefault === 'openrouter:x-ai/grok-4.7' && j.emailFallback === 'gemini-2.5-flash-lite' && j.updatedBy === 'boss@bytesfx.com', JSON.stringify(j));

[st, j] = await call(admin, 'POST', '/api/admin/models', { chatDefault: '', chatFallback: 'openrouter:x-ai/grok-4.7', emailDefault: '', emailFallback: '' });
ok('a set the chatbot worker refuses is not saved, and its reason is returned', st === 400 && /direct supplier/.test(j.error || '') && stored().chatFallback === 'gemini-3.1-pro-preview', JSON.stringify(j));

[st, j] = await call(admin, 'POST', '/api/admin/models', { chatDefault: '' }, { ...env, LLM: undefined });
ok('without the chatbot worker nothing is saved', st === 503 && stored().chatDefault === 'openrouter:x-ai/grok-4.7', String(st));

const rows = db.prepare("SELECT * FROM settings_history WHERE client_id = 'platform' ORDER BY id").all();
ok('each changed choice is kept in the settings history under "platform", with who changed it', rows.length === 3 && rows.every(r => r.actor_email === 'boss@bytesfx.com') && rows.some(r => r.field === 'chatDefault' && JSON.parse(r.new_value) === 'openrouter:x-ai/grok-4.7'), JSON.stringify(rows.map(r => r.field)));
ok('the entry is not stored under a client key', ![...kv.keys()].some(k => k.startsWith('client:') && k.includes('platform')));
