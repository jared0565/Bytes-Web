// The OpenRouter part of the model list: one model per line, chosen by listing date, with old lines and
// models about to be withdrawn left out. The server still knows every model, for effort and the premium check.
import { DatabaseSync } from 'node:sqlite';
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
console.error = () => {}; console.warn = () => {}; // failed fetches and date/version disagreements are caused on purpose

// The clock: tests move it forward to make the hourly cache expire
const realNow = Date.now; let skew = 0; Date.now = () => realNow() + skew;
const HOUR = 3600e3, DAY = 86400;
const ago = (days) => Math.floor(realNow() / 1000) - days * DAY;
const inDays = (days) => new Date(realNow() + days * DAY * 1000).toISOString().slice(0, 10);
const m = (id, days, extra = {}) => ({ id, name: `${id.split('/')[0].toUpperCase()}: ${id.split('/')[1]}`, created: ago(days), pricing: { prompt: '0.000001', completion: '0.000002' }, supported_parameters: ['reasoning'], ...extra });

const FEED = [
  m('anthropic/claude-haiku-4.5', 400), m('anthropic/claude-haiku-5.5', 50), m('anthropic/claude-fable-5.2', 20, { pricing: { prompt: '0.000008', completion: '0.00004' } }),
  m('anthropic/claude-opus-4.1', 480, { pricing: { prompt: '0.000015', completion: '0.000075' } }), m('anthropic/claude-opus-5.5', 66, { pricing: { prompt: '0.000004', completion: '0.00002' } }),
  m('x-ai/grok-4.20', 240), m('x-ai/grok-4.7', 60),                       // 4.20 reads as the higher number but is the older model
  m('openai/gpt-5.2-chat', 300), m('openai/gpt-chat-latest', 100),         // an alias with no number never wins its line
  m('openai/gpt-6-luna', 60), m('openai/gpt-6-luna-pro', 61),              // two lines
  m('openai/gpt-4o', 900), m('openai/gpt-4o-2024-11-20', 730),             // a whole line over 12 months old
  m('meta-llama/llama-4-maverick', 600),
  m('google/gemini-2.5-flash', 500, { expiration_date: inDays(4) }), m('google/gemini-3.8-flash', 80),
  m('google/gemini-3.5-flash-lite', 120), m('google/gemini-3.9-flash-lite', 10, { expiration_date: inDays(10) }), // the newest is being withdrawn
  m('mistralai/mistral-large', 30), m('mistralai/mistral-large-2512', 360), m('mistralai/mistral-large-4-0', 50),
  m('mistralai/mistral-medium-3-5', 200, { expiration_date: inDays(65) }), // an end date further off does not hide it
  m('qwen/qwen-plus', 10), m('qwen/qwen3.7-plus', 170), m('qwen/qwen3.5-plus-02-15', 280),
  m('cohere/command-x', 20),                                               // a vendor the picker does not offer
  m('openai/gpt-image-2', 5), m('deepseek/deepseek-v4-flash:free', 5, { pricing: { prompt: '0', completion: '0' } }),
];

let feed = FEED, feedDown = false, fetches = 0, asked = [];
globalThis.fetch = async (u, o) => {
  const url = String(u), body = o?.body ? JSON.parse(o.body) : {};
  if (url.includes('openrouter.ai/api/v1/models')) { fetches++; return feedDown ? new Response('{}', { status: 503 }) : new Response(JSON.stringify({ data: feed })); }
  if (url.includes('openrouter.ai')) { asked.push(body); return new Response(JSON.stringify({ choices: [{ message: { content: '[business] From the router.' } }] })); }
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '[business] From a backup.' }] } }] }));
};

const kv = new Map();
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } };
const ENV = { GEMINI_API_KEY: 'test', OPENROUTER_API_KEY: 'test', CLIENT_SETTINGS: KV };
const load = async (tag) => import(`./bundle.mjs?${tag}`); // each tag is a fresh worker, as after a restart
const catalogOf = async (mod, env = ENV) => (await mod.default.fetch(new Request('https://ai.bytesfx.com/public/models'), env, { waitUntil() {} })).json();
const routed = (cat) => cat.models.filter(x => x.provider === 'openrouter').map(x => x.id.replace('openrouter:', ''));

// ─── What the picker shows ────────────────────────────────────────────────────
const first = await load('first');
let cat = await catalogOf(first);
let ids = routed(cat);
const has = (id) => ids.includes(id);

ok('a line shows only its newest model', has('anthropic/claude-haiku-5.5') && !has('anthropic/claude-haiku-4.5') && has('anthropic/claude-opus-5.5') && !has('anthropic/claude-opus-4.1'), ids.join());
ok('lines of one vendor are listed side by side', has('anthropic/claude-fable-5.2') && has('openai/gpt-6-luna') && has('openai/gpt-6-luna-pro'), ids.join());
ok('the newest is chosen by listing date, not by reading 4.20 as above 4.7', has('x-ai/grok-4.7') && !has('x-ai/grok-4.20'), ids.join());
ok('an alias with no version does not replace the numbered model', has('openai/gpt-5.2-chat') && !has('openai/gpt-chat-latest') && has('qwen/qwen3.7-plus') && !has('qwen/qwen-plus'), ids.join());
ok('a version written with hyphens stays in its line', has('mistralai/mistral-large-4-0') && !has('mistralai/mistral-large-2512') && !has('mistralai/mistral-large'), ids.join());
ok('a line whose newest model is over 12 months old is left out', !ids.some(id => /gpt-4o|llama/.test(id)), ids.join());
ok('a model withdrawn within 30 days is left out and the one before it shows', has('google/gemini-3.5-flash-lite') && !has('google/gemini-3.9-flash-lite') && has('google/gemini-3.8-flash') && !has('google/gemini-2.5-flash'), ids.join());
ok('a model with an end date further off still shows', has('mistralai/mistral-medium-3-5'), ids.join());
ok('other vendors, image models and free routes are not offered', !ids.some(id => /cohere|image|:free/.test(id)), ids.join());
const vendorsInOrder = [...new Set(ids.map(id => id.split('/')[0]))];
ok('models are grouped by vendor, newest first inside a vendor', vendorsInOrder.join() === 'anthropic,openai,google,x-ai,mistralai,qwen' && ids.indexOf('anthropic/claude-fable-5.2') < ids.indexOf('anthropic/claude-haiku-5.5'), ids.join());
const fable = cat.models.find(x => x.id === 'openrouter:anthropic/claude-fable-5.2');
ok('each model carries its vendor name, price, effort support and premium mark', fable?.vendorName === 'ANTHROPIC' && fable.inputPrice === 8 && fable.outputPrice === 40 && fable.reasoning === true && fable.premium === true && fable.available === true && !('listed' in fable), JSON.stringify(fable));

// ─── A model that left the picker is still known to the server ────────────────
const service = (mod) => { const s = new mod.LlmService(); s.env = ENV; return s; };
asked = [];
await service(first).complete({ system: 'One line.', prompt: 'Hello', model: 'openrouter:anthropic/claude-haiku-4.5', effort: 'low' });
ok('a superseded model still gets its effort setting', asked[0]?.model === 'anthropic/claude-haiku-4.5' && asked[0].reasoning?.effort === 'low', JSON.stringify(asked[0]?.reasoning));

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE leads (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT NOT NULL, name TEXT, email TEXT, service TEXT, budget TEXT, summary TEXT, status TEXT DEFAULT 'new', timestamp INTEGER, has_lightning_badge BOOLEAN DEFAULT FALSE);
CREATE TABLE chat_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT NOT NULL, user_message TEXT, bot_response TEXT, timestamp INTEGER);`);
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const chatEnv = { ...ENV, ADMIN_API_KEY: 'test-key', DB: { prepare: prep } };
kv.set('client:old', JSON.stringify({ mode: 'ai', llmModel: 'openrouter:anthropic/claude-opus-4.1' }));
kv.set('client:cheap', JSON.stringify({ mode: 'ai', llmModel: 'openrouter:anthropic/claude-haiku-4.5' }));
let ip = 0;
const chatAs = async (client) => {
  asked = [];
  const res = await first.default.fetch(new Request('https://ai.bytesfx.com/', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://web.bytesfx.com', 'CF-Connecting-IP': '198.51.100.' + ++ip }, body: JSON.stringify({ message: 'Hello there', clientId: client, sessionId: null }) }), chatEnv, { waitUntil() {} });
  return { status: res.status, model: asked[0]?.model };
};
let r = await chatAs('cheap');
ok('a bot on a superseded model that is not premium keeps it', r.status === 200 && r.model === 'anthropic/claude-haiku-4.5', JSON.stringify(r));
r = await chatAs('old');
ok('a bot not on AI Plus with a superseded premium model is answered by the default', r.status === 200 && r.model === 'anthropic/claude-haiku-5.5', JSON.stringify(r));

// ─── The last good list survives a bad fetch ──────────────────────────────────
const good = routed(await catalogOf(first)).join();
let before = fetches;
ok('the list is fetched once and reused within the hour', (await catalogOf(first), fetches === before), `${fetches} vs ${before}`);

skew += HOUR + 1000; feedDown = true; before = fetches;
ok('OpenRouter is down: the picker keeps the last good list', routed(await catalogOf(first)).join() === good && fetches === before + 1, `${fetches - before} fetches`);
before = fetches;
ok('a failed fetch is not retried on every request', (await catalogOf(first), fetches === before), `${fetches - before} fetches`);

skew += HOUR; feedDown = false; feed = [];
ok('an empty list from OpenRouter is not taken as every model being withdrawn', routed(await catalogOf(first)).join() === good);

skew += HOUR; feed = [...FEED, m('anthropic/claude-haiku-6', 1)];
ids = routed(await catalogOf(first));
ok('a new version replaces the old one at the next good fetch, and the default stays listed', ids.includes('anthropic/claude-haiku-6') && ids.includes('anthropic/claude-haiku-5.5') && !ids.includes('anthropic/claude-haiku-4.5'), ids.join());

// A fresh worker while OpenRouter is down: the stored copy fills the picker
feedDown = true;
const second = await load('second');
ids = routed(await catalogOf(second));
ok('after a restart with OpenRouter down, the stored list is used', ids.includes('anthropic/claude-haiku-6') && ids.includes('x-ai/grok-4.7'), ids.join());
const third = await load('third');
ok('with no stored list and OpenRouter down the direct models still show', (cat = await catalogOf(third, { GEMINI_API_KEY: 'test', OPENROUTER_API_KEY: 'test' }), routed(cat).length === 0 && cat.models.some(x => x.provider === 'google')), String(cat.models.length));
