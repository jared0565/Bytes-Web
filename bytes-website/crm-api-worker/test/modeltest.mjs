// A save that changes a model, or the effort of a chosen model, first has the chatbot worker test it
// with one real call. A failed test stores nothing. An unchanged model is not tested again.
import { DatabaseSync } from 'node:sqlite';
const mod = await import('./src/index.js');
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
console.error = () => {};

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE crm_settings (client_id TEXT PRIMARY KEY, default_campaign_mode TEXT DEFAULT 'ai', auto_approve_campaigns INTEGER DEFAULT 0, plan TEXT DEFAULT 'free', trial_started_at INTEGER DEFAULT 0, trial_ends_at INTEGER DEFAULT 0);
INSERT INTO crm_settings VALUES ('acme','ai',0,'business',0,0);
CREATE TABLE users (id INTEGER PRIMARY KEY, social_id TEXT, provider TEXT, email TEXT UNIQUE, name TEXT, picture TEXT, created_at INTEGER);
INSERT INTO users (id, email) VALUES (7, 'o@acme.com'), (9, 'boss@bytesfx.com');`);
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const kv = new Map([
    ['client:acme', JSON.stringify({ companyName: 'Acme', mode: 'ai', llmModel: 'gpt-6-luna', llmEffort: 'medium', draftModel: '', readModel: '', allowedDomains: ['acme.com'] })],
    ['client:default', JSON.stringify({ companyName: 'Bytes', mode: 'ai_plus', llmModel: '', llmEffort: 'medium' })],
]);
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v), delete: async k => kv.delete(k), list: async ({ prefix }) => ({ keys: [...kv.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) };
// Stands in for the chatbot worker: a model with "bad" in its id fails its test
let tested = [];
const LLM = {
    complete: async () => ({ text: '' }),
    checkDefaults: async (input) => ({ ok: true, value: { chatDefault: input.chatDefault || '', chatFallback: input.chatFallback || '', emailDefault: input.emailDefault || '', emailFallback: input.emailFallback || '' } }),
    testModels: async (items) => { tested.push(...items); return items.map(i => /bad/.test(i.model) ? { model: i.model, effort: i.effort, ok: false, ms: 5, error: 'OpenAI 404: The model does not exist.' } : { model: i.model, effort: i.effort, ok: true, ms: 5 }); },
};
const env = { DB: { prepare: prep, batch: async s => { for (const x of s) await x.run(); } }, JWT_SECRET: 'x', OAUTH_TOKENS: KV, CLIENT_SETTINGS: KV, ADMIN_EMAILS: 'boss@bytesfx.com', LLM };
const ctx = { waitUntil: () => {} };
const owner = await mod.signJWT({ role: 'client', clientId: 'acme', userId: 7 }, 'x');
const admin = await mod.signJWT({ role: 'admin', clientId: 'agency_demo', userId: 9 }, 'x');
const call = async (t, path, body, e = env) => { tested = []; const r = await mod.__app.fetch(new Request('http://x' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(body) }), e, ctx); return [r.status, await r.json().catch(() => ({}))]; };
const cfg = (id = 'acme') => JSON.parse(kv.get(`client:${id}`));
const save = (settings, t = admin, e = env) => call(t, '/api/config', { clientId: 'acme', settings }, e);

// ─── A client's chatbot settings ─────────────────────────────────────────────
let [st, j] = await save({ companyName: 'Acme Ltd', llmModel: 'gpt-6-luna', llmEffort: 'medium' });
ok('a save that leaves the model and effort as they were runs no test', st === 200 && tested.length === 0 && cfg().companyName === 'Acme Ltd', `${st} ${JSON.stringify(tested)}`);

[st, j] = await save({ llmModel: 'claude-sonnet-5-5', llmEffort: 'high' });
ok('a changed chat model is tested once, at the effort being saved, and then stored', st === 200 && tested.length === 1 && tested[0].model === 'claude-sonnet-5-5' && tested[0].effort === 'high' && cfg().llmModel === 'claude-sonnet-5-5', `${st} ${JSON.stringify(tested)}`);

[st, j] = await save({ llmModel: 'claude-sonnet-5-5', llmEffort: 'low' });
ok('a changed effort on a chosen model is tested', st === 200 && tested.length === 1 && tested[0].effort === 'low' && cfg().llmEffort === 'low', `${st} ${JSON.stringify(tested)}`);

const historyBefore = db.prepare("SELECT COUNT(*) n FROM settings_history WHERE client_id = 'acme'").get().n;
[st, j] = await save({ companyName: 'Changed too', llmModel: 'gpt-bad-model', llmEffort: 'low' });
ok('a model that fails its test is refused with the model and the supplier\'s reason', st === 400 && /gpt-bad-model/.test(j.error || '') && /does not exist/.test(j.error || '') && /nothing was saved/i.test(j.error || '') && j.modelTest === true, JSON.stringify(j));
ok('nothing from the refused save is stored, and no history is written', cfg().llmModel === 'claude-sonnet-5-5' && cfg().companyName === 'Acme Ltd' && db.prepare("SELECT COUNT(*) n FROM settings_history WHERE client_id = 'acme'").get().n === historyBefore);

[st, j] = await save({ llmModel: '', llmEffort: 'high' });
ok('choosing the default model is saved without a test', st === 200 && tested.length === 0 && cfg().llmModel === '' && cfg().llmEffort === 'high', `${st} ${JSON.stringify(tested)}`);
[st, j] = await save({ llmModel: '', llmEffort: 'low' });
ok('an effort change on the default model runs no test', st === 200 && tested.length === 0, `${st} ${JSON.stringify(tested)}`);

[st, j] = await save({ draftModel: 'openrouter:x-ai/grok-4.7', readModel: 'openrouter:x-ai/grok-4.7' });
ok('changed email models are tested at medium effort, the same model once', st === 200 && tested.length === 1 && tested[0].model === 'openrouter:x-ai/grok-4.7' && tested[0].effort === 'medium' && cfg().draftModel === 'openrouter:x-ai/grok-4.7', `${st} ${JSON.stringify(tested)}`);
[st, j] = await save({ draftModel: 'openrouter:x-ai/grok-4.7', readModel: 'gemini-bad' });
ok('one failing email model refuses the whole save', st === 400 && /gemini-bad/.test(j.error || '') && tested.length === 1 && cfg().readModel === 'openrouter:x-ai/grok-4.7', `${st} ${JSON.stringify(j)}`);

[st, j] = await save({ companyName: 'By the owner', llmModel: 'gpt-6.2-astra', draftModel: 'gpt-6.2-astra' }, owner);
ok('a client still cannot change a model, and no test runs for them', st === 200 && tested.length === 0 && cfg().llmModel === '' && cfg().draftModel === 'openrouter:x-ai/grok-4.7' && cfg().companyName === 'By the owner', `${st} ${JSON.stringify(cfg())}`);

// ─── When the test cannot run ────────────────────────────────────────────────
[st, j] = await save({ llmModel: 'gpt-6.2-sol' }, admin, { ...env, LLM: undefined });
ok('with no chatbot worker a changed model is not saved', st === 503 && /nothing was saved/i.test(j.error || '') && cfg().llmModel === '', `${st} ${JSON.stringify(j)}`);
[st, j] = await save({ llmModel: 'gpt-6.2-sol' }, admin, { ...env, LLM: { ...LLM, testModels: async () => { throw new Error('binding down'); } } });
ok('when the test call itself breaks a changed model is not saved', st === 503 && cfg().llmModel === '', `${st} ${JSON.stringify(j)}`);
[st, j] = await save({ llmModel: 'gpt-6.2-sol' }, admin, { ...env, LLM: { ...LLM, testModels: async () => [] } });
ok('a test that returns no result is a failure, not a pass', st === 503 && cfg().llmModel === '', `${st} ${JSON.stringify(j)}`);
[st, j] = await save({ companyName: 'No worker, no model change' }, admin, { ...env, LLM: undefined });
ok('with no chatbot worker a save that changes no model still goes through', st === 200 && cfg().companyName === 'No worker, no model change', `${st} ${JSON.stringify(j)}`);

// ─── The Bytes website's own bot ─────────────────────────────────────────────
[st, j] = await call(admin, '/api/site-settings', { companyName: 'Bytes', llmModel: 'gemini-3.8-flash', llmEffort: 'high', draftModel: 'gpt-6-luna' });
ok('the website settings test a changed chat model and email model', st === 200 && tested.length === 2 && tested.some(t => t.model === 'gemini-3.8-flash' && t.effort === 'high') && tested.some(t => t.model === 'gpt-6-luna' && t.effort === 'medium') && cfg('default').llmModel === 'gemini-3.8-flash', `${st} ${JSON.stringify(tested)}`);
[st, j] = await call(admin, '/api/site-settings', { companyName: 'Bytes FX', llmModel: 'gemini-3.8-flash', llmEffort: 'high', draftModel: 'gpt-6-luna' });
ok('saving them again unchanged runs no test', st === 200 && tested.length === 0 && cfg('default').companyName === 'Bytes FX', `${st} ${JSON.stringify(tested)}`);
[st, j] = await call(admin, '/api/site-settings', { companyName: 'Refused', llmModel: 'claude-bad' });
ok('the website settings refuse a model that fails its test', st === 400 && /claude-bad/.test(j.error || '') && cfg('default').llmModel === 'gemini-3.8-flash' && cfg('default').companyName === 'Bytes FX', `${st} ${JSON.stringify(j)}`);

// ─── The platform's default models ───────────────────────────────────────────
const stored = () => JSON.parse(kv.get('platform:models') || 'null');
[st, j] = await call(admin, '/api/admin/models', { chatDefault: 'claude-haiku-5-5', chatFallback: 'gpt-6-luna', emailDefault: '', emailFallback: 'gemini-3.5-flash-lite' });
const fb = tested.filter(t => t.fallback === true).map(t => t.model).sort().join();
ok('each chosen platform model is tested, a fallback as a fallback, an empty choice not at all', st === 200 && tested.length === 3 && fb === 'gemini-3.5-flash-lite,gpt-6-luna' && tested.some(t => t.model === 'claude-haiku-5-5' && !t.fallback && t.effort === 'medium') && stored()?.chatFallback === 'gpt-6-luna', `${st} ${JSON.stringify(tested)}`);
[st, j] = await call(admin, '/api/admin/models', { chatDefault: 'claude-haiku-5-5', chatFallback: 'gpt-6-luna', emailDefault: 'gpt-6.1-terra', emailFallback: 'gemini-3.5-flash-lite' });
ok('only the changed platform choice is tested', st === 200 && tested.length === 1 && tested[0].model === 'gpt-6.1-terra' && stored().emailDefault === 'gpt-6.1-terra', `${st} ${JSON.stringify(tested)}`);
[st, j] = await call(admin, '/api/admin/models', { chatDefault: 'claude-haiku-5-5', chatFallback: 'gemini-bad-lite', emailDefault: 'gpt-6.1-terra', emailFallback: 'gemini-3.5-flash-lite' });
ok('a platform choice that fails its test is refused and the saved set is kept', st === 400 && /gemini-bad-lite/.test(j.error || '') && /chat fallback/i.test(j.error || '') && stored().chatFallback === 'gpt-6-luna', `${st} ${JSON.stringify(j)}`);
