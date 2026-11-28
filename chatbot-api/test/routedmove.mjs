// Moving a bot on an OpenRouter model to the newer version of its line. The newer version is tested
// only once a bot needs it: the first reply notes the wish and is answered by the saved model, the
// hourly job makes the test call, and replies move after that.
import { DatabaseSync } from 'node:sqlite';
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
const logs = []; const realLog = console.log;
const capture = async (fn) => { console.log = (...a) => { logs.push(a); }; try { return await fn(); } finally { console.log = realLog; } };
console.error = () => {}; console.warn = () => {};

const START = Date.parse('2026-11-28T12:00:00Z'); let skew = 0; Date.now = () => START + skew;
const HOUR = 3600e3;
const recent = Math.floor(START / 1000) - 30 * 86400, older = recent - 200 * 86400;
const routed = (id, name, p, c, created = recent, extra = {}) => ({ id, name, created, pricing: { prompt: String(p / 1e6), completion: String(c / 1e6) }, supported_parameters: ['reasoning'], reasoning: { supported_efforts: ['high', 'medium', 'low'] }, ...extra });
const FEED = [
  routed('anthropic/claude-haiku-5.5', 'Anthropic: Claude Haiku 5.5', 0.1, 0.5),
  routed('anthropic/claude-sonnet-4.5', 'Anthropic: Claude Sonnet 4.5', 3, 15, older),
  routed('anthropic/claude-sonnet-5', 'Anthropic: Claude Sonnet 5', 3, 15),
  routed('x-ai/grok-3', 'xAI: Grok 3', 1, 2, older),
  routed('x-ai/grok-4', 'xAI: Grok 4', 3, 6), // three times the price
  routed('openai/gpt-7-pro', 'OpenAI: GPT-7 Pro', 10, 14, older),
  routed('openai/gpt-8-pro', 'OpenAI: GPT-8 Pro', 12, 16), // within 25%, but premium
  routed('deepseek/deepseek-v3', 'DeepSeek: DeepSeek V3', 1, 2, older),
  routed('deepseek/deepseek-v4', 'DeepSeek: DeepSeek V4', 1, 2),
  routed('qwen/qwen-plus', 'Qwen: Qwen Plus', 1, 2, older), // an alias: it follows the newest by itself
  routed('qwen/qwen-plus-2512', 'Qwen: Qwen Plus 2512', 1, 2),
  routed('meta-llama/llama-4-70b', 'Meta: Llama 4 70B', 1, 2, older),
  routed('meta-llama/llama-5-70b', 'Meta: Llama 5 70B', 1, 2, recent, { expiration_date: new Date(START + 86400e3).toISOString() }), // about to be withdrawn
];
const LISTS = {
  anthropic: ['claude-fable-5-2', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'],
  openai: ['gpt-6.2-astra', 'gpt-6.2-sol', 'gpt-6.1-terra', 'gpt-6-luna'],
  google: ['gemini-4-neon', 'gemini-4-hydrogen', 'gemini-4-carbon', 'gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro-preview', 'gemini-2.5-flash-lite'],
};
let deepseekDown = true, feedDown = false;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
let asked = [];
globalThis.fetch = async (u, o) => {
  const url = String(u), body = o?.body ? JSON.parse(o.body) : {};
  if (url.includes('openrouter.ai/api/v1/models')) return feedDown ? json({}, 500) : json({ data: FEED });
  if (url.includes('api.anthropic.com/v1/models')) return json({ data: LISTS.anthropic.map(id => ({ id })) });
  if (url.includes('api.openai.com/v1/models')) return json({ data: LISTS.openai.map(id => ({ id })) });
  if (/generativelanguage[^?]*\/models\?/.test(url)) return json({ models: LISTS.google.map(id => ({ name: `models/${id}` })) });
  if (url.includes('generativelanguage')) { asked.push((url.match(/models\/([^:]+):/) || [])[1]); return json({ candidates: [{ content: { parts: [{ text: '[business] From Google.' }] } }] }); }
  if (url.includes('api.anthropic.com')) { asked.push(body.model); return json({ id: 'msg_1', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: '[business] From Anthropic.' }], stop_reason: 'end_turn', usage: { input_tokens: 5, output_tokens: 1 } }); }
  if (url.includes('openrouter.ai')) {
    asked.push(`openrouter:${body.model}`);
    if (body.model === 'deepseek/deepseek-v4' && deepseekDown) return json({ error: { message: 'Provider returned error' } }, 503);
    return json({ choices: [{ message: { content: '[business] From OpenRouter.' } }] });
  }
  asked.push(body.model);
  return json({ choices: [{ message: { content: '[business] From a chat API.' } }] });
};

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE leads (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT NOT NULL, name TEXT, email TEXT, service TEXT, budget TEXT, summary TEXT, status TEXT DEFAULT 'new', timestamp INTEGER, has_lightning_badge BOOLEAN DEFAULT FALSE);
CREATE TABLE chat_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT NOT NULL, user_message TEXT, bot_response TEXT, timestamp INTEGER);`);
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const bot = (mode, slug) => JSON.stringify({ mode, llmModel: `openrouter:${slug}`, llmEffort: 'low' });
const kv = new Map([
  ['client:sonnet', bot('ai', 'anthropic/claude-sonnet-4.5')],
  ['client:newest', bot('ai', 'anthropic/claude-sonnet-5')],
  ['client:grok', bot('ai', 'x-ai/grok-3')],
  ['client:pro', bot('ai', 'openai/gpt-7-pro')],
  ['client:proplus', bot('ai_plus', 'openai/gpt-7-pro')],
  ['client:deep', bot('ai', 'deepseek/deepseek-v3')],
  ['client:alias', bot('ai', 'qwen/qwen-plus')],
  ['client:llama', bot('ai', 'meta-llama/llama-5-70b')],
  ['client:ghost', bot('ai_plus', 'acme/made-up-9')],
]);
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } };
const ALL = { GEMINI_API_KEY: 'test', OPENROUTER_API_KEY: 'test', ANTHROPIC_API_KEY: 'test', OPENAI_API_KEY: 'test', ADMIN_API_KEY: 'test-key', DB: { prepare: prep }, CLIENT_SETTINGS: KV };
let ip = 0;
const load = async (tag) => {
  const mod = await import(`./bundle.mjs?${tag}`);
  const svc = new mod.LlmService(); svc.env = ALL;
  return {
    catalog: async () => (await mod.default.fetch(new Request('https://ai.bytesfx.com/public/models'), ALL, { waitUntil() {} })).json(),
    // The hourly job; returns the OpenRouter models it called
    hourly: () => capture(async () => { asked = []; const pending = []; await mod.default.scheduled({}, ALL, { waitUntil: (p) => pending.push(p) }); await Promise.all(pending); return asked.filter(x => x.startsWith('openrouter:')).join(); }),
    chat: (client) => capture(async () => {
      asked = [];
      const res = await mod.default.fetch(new Request('https://ai.bytesfx.com/', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://web.bytesfx.com', 'CF-Connecting-IP': '198.51.100.' + ++ip }, body: JSON.stringify({ message: 'Hello there', clientId: client, sessionId: null }) }), ALL, { waitUntil() {} });
      return res.status === 200 ? asked[0] : `HTTP ${res.status}`;
    }),
    email: (slug) => capture(async () => { asked = []; await svc.complete({ system: 'One line.', prompt: 'Hello', model: `openrouter:${slug}`, effort: 'low' }); return asked[0]; }),
  };
};
const a = await load('routed-a');
const saved = new Map(kv);

// ─── Nothing is tested until a bot needs it ──────────────────────────────────
let t = await a.hourly();
ok('with no bot asking, the hourly job tests no OpenRouter model', t === '', t);
let m = await a.chat('sonnet');
ok('the first reply is still answered by the saved model', m === 'openrouter:anthropic/claude-sonnet-4.5', String(m));

// ─── Replies that ask for nothing ────────────────────────────────────────────
for (const c of ['newest', 'grok', 'pro', 'alias', 'llama', 'ghost', 'deep', 'proplus']) await a.chat(c);
t = await a.hourly();
ok('the hourly job then tests the newer versions bots asked for, and only those', t.split(',').sort().join() === 'openrouter:anthropic/claude-sonnet-5,openrouter:deepseek/deepseek-v4,openrouter:openai/gpt-8-pro', t);
const tests = logs.map(l => l[0]).filter(l => l?.kind === 'successor-test' && String(l.model).startsWith('openrouter:'));
ok('each test is logged with its result', tests.length === 3 && tests.find(l => l.model === 'openrouter:anthropic/claude-sonnet-5')?.ok === true && tests.find(l => l.model === 'openrouter:deepseek/deepseek-v4')?.ok === false, JSON.stringify(tests));

// ─── Replies after the test ──────────────────────────────────────────────────
m = await a.chat('sonnet');
ok('a bot on an older OpenRouter model is answered by the newer version of its line', m === 'openrouter:anthropic/claude-sonnet-5', String(m));
ok('the move is logged', logs.map(l => l[0]).some(l => l?.kind === 'model-move' && l.from === 'openrouter:anthropic/claude-sonnet-4.5' && l.to === 'openrouter:anthropic/claude-sonnet-5'));
m = await a.chat('newest');
ok('a bot already on the newest version stays on it', m === 'openrouter:anthropic/claude-sonnet-5', String(m));
m = await a.chat('grok');
ok('a newer version more than 25% dearer is not moved to', m === 'openrouter:x-ai/grok-3', String(m));
m = await a.chat('pro');
ok('a bot not on AI Plus is not moved to a premium newer version', m === 'openrouter:openai/gpt-7-pro', String(m));
m = await a.chat('proplus');
ok('an AI Plus bot is moved to a premium newer version', m === 'openrouter:openai/gpt-8-pro', String(m));
m = await a.chat('deep');
ok('a newer version that failed its test call is not moved to', m === 'openrouter:deepseek/deepseek-v3', String(m));
m = await a.chat('alias');
ok('an alias is left alone', m === 'openrouter:qwen/qwen-plus', String(m));
m = await a.chat('llama');
ok('a model is never moved to a lower version', m === 'openrouter:meta-llama/llama-5-70b', String(m));
m = await a.email('anthropic/claude-sonnet-4.5');
ok('an email model moves too', m === 'openrouter:anthropic/claude-sonnet-5', String(m));
m = await a.email('openai/gpt-7-pro');
ok('an email model that is not premium is not moved to a premium one', m === 'openrouter:openai/gpt-7-pro', String(m));
ok('no saved setting was rewritten', [...saved].every(([k, v]) => kv.get(k) === v));

// ─── What the dashboard is told ──────────────────────────────────────────────
const told = (await a.catalog()).moves || [];
const move = (slug) => told.find(x => x.from === `openrouter:${slug}`);
ok('the model list names the OpenRouter move with the newer model\'s name and price', move('anthropic/claude-sonnet-4.5')?.to === 'openrouter:anthropic/claude-sonnet-5' && /Claude Sonnet 5$/.test(move('anthropic/claude-sonnet-4.5').name) && move('anthropic/claude-sonnet-4.5').outputPrice === 15, JSON.stringify(told));
ok('and names no move that is not made', !move('x-ai/grok-3') && !move('openai/gpt-7-pro') && !move('deepseek/deepseek-v3') && !move('qwen/qwen-plus'), JSON.stringify(told));

// ─── Later runs ──────────────────────────────────────────────────────────────
skew = 2 * HOUR;
t = await a.hourly();
ok('a passed test is not repeated, and a failed one not within a day', t === '', t);
skew = 25 * HOUR; deepseekDown = false;
t = await a.hourly();
ok('a failed newer version is tested again after a day', t === 'openrouter:deepseek/deepseek-v4', t);
m = await a.chat('deep');
ok('and is moved to once it passes', m === 'openrouter:deepseek/deepseek-v4', String(m));
const b = await load('routed-b');
m = await b.chat('sonnet');
ok('another isolate knows the passed tests from the stored copy', m === 'openrouter:anthropic/claude-sonnet-5', String(m));
skew = 27 * HOUR; feedDown = true;
t = await a.hourly();
m = await a.chat('sonnet');
ok('a failed read of OpenRouter\'s list tests nothing and ends no move', t === '' && m === 'openrouter:anthropic/claude-sonnet-5', `${t} ${m}`);
