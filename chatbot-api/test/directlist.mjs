// The direct supplier models (Anthropic, OpenAI and Google on their own APIs): which ones the picker
// offers, their prices by date, and the check against each supplier's own model list.
import { DatabaseSync } from 'node:sqlite';
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
const warns = []; console.error = () => {}; console.warn = (...a) => { warns.push(a.join(' ')); };

// A fixed clock: 28 November 2026, three days before Google retires two models and changes two prices
const START = Date.parse('2026-11-28T12:00:00Z'); let skew = 0; Date.now = () => START + skew;
const HOUR = 3600e3, DAY = 86400e3;

// What each supplier's own model list returns; null makes that call fail
let lists = {
  anthropic: ['claude-fable-5-2', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5-20261007'],
  openai: ['gpt-6.2-astra', 'gpt-6.2-sol', 'gpt-6.1-terra', 'gpt-6-luna', 'gpt-6-astra', 'gpt-6.1-sol', 'gpt-image-2.6-flare'],
  google: ['gemini-4-neon', 'gemini-4-hydrogen', 'gemini-4-carbon', 'gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro-preview', 'gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'],
};
let listCalls = 0, asked = [];
const recent = Math.floor(START / 1000) - 30 * 86400;
const routed = (id, p, c) => ({ id, name: id, created: recent, pricing: { prompt: String(p / 1e6), completion: String(c / 1e6) }, supported_parameters: ['reasoning'], reasoning: { supported_efforts: ['high', 'medium', 'low'] } });
// OpenRouter agrees with every table price except Sonnet 5.5, which it lists dearer
const FEED = [routed('anthropic/claude-haiku-5.5', 0.1, 0.5), routed('anthropic/claude-sonnet-5.5', 3, 15), routed('openai/gpt-6-luna', 0.1, 0.5), routed('google/gemini-4-neon', 3, 15)];
const list = (rows, shape) => rows === null ? new Response('{}', { status: 500 }) : new Response(JSON.stringify(shape(rows)));
globalThis.fetch = async (u, o) => {
  const url = String(u), body = o?.body ? JSON.parse(o.body) : {};
  if (url.includes('openrouter.ai/api/v1/models')) return new Response(JSON.stringify({ data: FEED }));
  if (url.includes('api.anthropic.com/v1/models')) { listCalls++; return list(lists.anthropic, r => ({ data: r.map(id => ({ id })) })); }
  if (url.includes('api.openai.com/v1/models')) { listCalls++; return list(lists.openai, r => ({ data: r.map(id => ({ id })) })); }
  if (/generativelanguage[^?]*\/models\?/.test(url)) { listCalls++; return list(lists.google, r => ({ models: r.map(id => ({ name: 'models/' + id })) })); }
  if (url.includes('generativelanguage')) {
    asked.push({ model: (url.match(/models\/([^:]+):/) || [])[1], body });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '[business] From Google.' }] } }] }));
  }
  asked.push({ model: url.includes('openrouter.ai') ? `openrouter:${body.model}` : body.model, body });
  return new Response(JSON.stringify({ choices: [{ message: { content: '[business] From a chat API.' } }] }));
};

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE leads (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT NOT NULL, name TEXT, email TEXT, service TEXT, budget TEXT, summary TEXT, status TEXT DEFAULT 'new', timestamp INTEGER, has_lightning_badge BOOLEAN DEFAULT FALSE);
CREATE TABLE chat_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT NOT NULL, user_message TEXT, bot_response TEXT, timestamp INTEGER);`);
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const kv = new Map([
  ['client:old', JSON.stringify({ mode: 'ai', llmModel: 'gemini-2.5-flash', llmEffort: 'medium' })],
  ['client:four', JSON.stringify({ mode: 'ai', llmModel: 'gemini-4-carbon', llmEffort: 'high' })],
]);
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } };
const ALL = { GEMINI_API_KEY: 'test', OPENROUTER_API_KEY: 'test', ANTHROPIC_API_KEY: 'test', OPENAI_API_KEY: 'test', ADMIN_API_KEY: 'test-key', DB: { prepare: prep }, CLIENT_SETTINGS: KV };
const ctx = { waitUntil() {} };
const load = async (tag) => import(`./bundle.mjs?${tag}`);
const catalogOf = async (mod, env = ALL) => (await mod.default.fetch(new Request('https://ai.bytesfx.com/public/models'), env, ctx)).json();
const directIds = (cat) => cat.models.filter(x => x.provider !== 'openrouter').map(x => x.id);
let ip = 0;
const chatAs = async (mod, client) => {
  asked = [];
  const res = await mod.default.fetch(new Request('https://ai.bytesfx.com/', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://web.bytesfx.com', 'CF-Connecting-IP': '198.51.100.' + ++ip }, body: JSON.stringify({ message: 'Hello there', clientId: client, sessionId: null }) }), ALL, ctx);
  return { status: res.status, model: asked[0]?.model, body: asked[0]?.body };
};

// ─── What the picker offers ───────────────────────────────────────────────────
const first = await load('first');
let cat = await catalogOf(first);
let ids = directIds(cat);
const model = (id, c = cat) => c.models.find(x => x.id === id);
ok('each supplier\'s current chat models are offered', ['claude-fable-5-2', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'gpt-6.2-astra', 'gpt-6.2-sol', 'gpt-6.1-terra', 'gpt-6-luna', 'gemini-4-neon', 'gemini-4-hydrogen', 'gemini-4-carbon', 'gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro-preview', 'gemini-2.5-flash-lite'].every(id => ids.includes(id)) && ids.length === 16, ids.join());
ok('a model the supplier retires within 30 days is not offered', !ids.includes('gemini-2.5-flash') && !ids.includes('gemini-2.5-pro'), ids.join());
ok('a model replaced by a newer one of its line is not offered', !ids.includes('gpt-6-astra') && !ids.includes('gpt-6.1-sol'), ids.join());
ok('a model carries the supplier\'s price and the day it was read', model('claude-fable-5-2')?.inputPrice === 8 && model('claude-fable-5-2').outputPrice === 40 && model('claude-fable-5-2').premium === true && model('gpt-6.1-terra')?.inputPrice === 1 && model('gpt-6.1-terra').outputPrice === 5 && /^2026-11-\d\d$/.test(model('gpt-6.1-terra').priceRead || ''), JSON.stringify(model('gpt-6.1-terra')));
ok('every direct model lists low, medium and high', cat.models.filter(x => x.provider !== 'openrouter').every(x => (x.efforts || []).join() === 'low,medium,high'));
ok('a supplier that lists a dated id still confirms the model', ids.includes('claude-haiku-5-5'));

// ─── A model that left the picker still works for a bot on it ─────────────────
let r = await chatAs(first, 'old');
ok('a bot on a retiring model is still answered by it, with its token budget', r.status === 200 && r.model === 'gemini-2.5-flash' && r.body?.generationConfig?.thinkingConfig?.thinkingBudget === 1024, JSON.stringify(r.body?.generationConfig?.thinkingConfig));
asked = [];
const svc = new first.LlmService(); svc.env = ALL;
await svc.complete({ system: 'One line.', prompt: 'Hello', model: 'gpt-6-astra', effort: 'low' });
ok('a replaced model can still be called', asked[0]?.model === 'gpt-6-astra' && asked[0].body.reasoning_effort === 'low', JSON.stringify(asked[0]?.model));

// ─── Gemini 4 takes a thinking level, not a token budget ──────────────────────
r = await chatAs(first, 'four');
ok('a Gemini 4 model is sent a thinking level', r.model === 'gemini-4-carbon' && r.body?.generationConfig?.thinkingConfig?.thinkingLevel === 'high' && !('thinkingBudget' in (r.body?.generationConfig?.thinkingConfig || {})), JSON.stringify(r.body?.generationConfig?.thinkingConfig));

// ─── Prices checked against OpenRouter ────────────────────────────────────────
ok('a price that differs from OpenRouter\'s is logged, and only that one', warns.filter(w => /price/i.test(w)).length === 1 && /claude-sonnet-5-5/.test(warns.find(w => /price/i.test(w)) || ''), warns.filter(w => /price/i.test(w)).join(' | '));

// ─── The supplier's own list ──────────────────────────────────────────────────
const before = listCalls;
await catalogOf(first);
ok('each supplier list is read once and reused within the hour', before === 3 && listCalls === 3, `${before} then ${listCalls}`);

skew += HOUR + 1000; lists = { ...lists, google: lists.google.filter(id => id !== 'gemini-3.1-pro-preview') };
ids = directIds(await catalogOf(first));
ok('a model the supplier no longer lists is taken out of the picker', !ids.includes('gemini-3.1-pro-preview') && ids.includes('gemini-3.8-flash') && ids.length === 15, ids.join());

skew += HOUR + 1000; lists = { ...lists, google: null, openai: [] };
ids = directIds(await catalogOf(first));
ok('a failed or empty supplier list changes nothing', !ids.includes('gemini-3.1-pro-preview') && ids.includes('gemini-3.8-flash') && ids.includes('gpt-6-luna') && ids.length === 15, ids.join());

skew += HOUR + 1000; lists = { ...lists, anthropic: ['claude-3-haiku', 'claude-instant'] };
ids = directIds(await catalogOf(first));
ok('a list that names none of a supplier\'s models is not trusted: nothing is hidden', ids.includes('claude-haiku-5-5') && ids.includes('claude-fable-5-2'), ids.join());

const second = await load('second'); // a fresh worker while Google's list is still down: the stored copy is used
ids = directIds(await catalogOf(second));
ok('after a restart the stored supplier list is used', !ids.includes('gemini-3.1-pro-preview') && ids.includes('gemini-3.8-flash'), ids.join());

const third = await load('third');
ids = directIds(await catalogOf(third, { GEMINI_API_KEY: 'test', OPENROUTER_API_KEY: 'test' }));
ok('a supplier with no key is listed from the table, marked as having no key', ids.includes('claude-haiku-5-5') && model('claude-haiku-5-5', await catalogOf(third, { GEMINI_API_KEY: 'test', OPENROUTER_API_KEY: 'test' })).available === false, ids.join());

// ─── A price the supplier has announced ───────────────────────────────────────
cat = await catalogOf(first);
ok('before 1 December Gemini 4 Carbon is $2 in and $10 out, and not premium', model('gemini-4-carbon')?.inputPrice === 2 && model('gemini-4-carbon').outputPrice === 10 && model('gemini-4-carbon').premium === false, JSON.stringify(model('gemini-4-carbon')));
r = await chatAs(first, 'four');
ok('before 1 December a bot not on AI Plus keeps Gemini 4 Carbon', r.model === 'gemini-4-carbon', String(r.model));
ok('fallback choices are the offered direct models that are not premium', (cat.fallbackModels || []).some(x => x.id === 'gemini-4-carbon') && !(cat.fallbackModels || []).some(x => /fable|opus|astra|gemini-2\.5-(flash|pro)$|gpt-6\.1-sol/.test(x.id)), (cat.fallbackModels || []).map(x => x.id).join());

skew += 4 * DAY; // 2 December
cat = await catalogOf(first);
ok('from 1 December it is $4 in and $20 out, and premium', model('gemini-4-carbon')?.inputPrice === 4 && model('gemini-4-carbon').outputPrice === 20 && model('gemini-4-carbon').premium === true, JSON.stringify(model('gemini-4-carbon')));
r = await chatAs(first, 'four');
ok('from 1 December a bot not on AI Plus is moved off it to the default', r.status === 200 && r.model === 'claude-haiku-5-5', String(r.model));
ok('from 1 December it is no longer a fallback choice', !(cat.fallbackModels || []).some(x => x.id === 'gemini-4-carbon'));
ok('Gemini 3.8 Flash keeps its price until 1 January', model('gemini-3.8-flash')?.inputPrice === 0.75 && model('gemini-3.8-flash').outputPrice === 3.75, JSON.stringify(model('gemini-3.8-flash')));
skew += 31 * DAY;
cat = await catalogOf(first);
ok('from 1 January Gemini 3.8 Flash is $1.50 in and $7.50 out', model('gemini-3.8-flash')?.inputPrice === 1.5 && model('gemini-3.8-flash').outputPrice === 7.5, JSON.stringify(model('gemini-3.8-flash')));
