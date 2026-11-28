// Moving a bot to the newer version of its model's line. The saved setting is never rewritten: the
// hourly job works out which model stands in for which, and each reply looks that up. A move needs
// the same supplier and line, a higher version that the picker offers, a price at most 25% higher,
// and a passed test call. A premium successor is only for an AI Plus bot or an already premium model.
import { DatabaseSync } from 'node:sqlite';
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
const logs = []; const realLog = console.log;
const capture = async (fn) => { console.log = (...a) => { logs.push(a); }; try { return await fn(); } finally { console.log = realLog; } };
console.error = () => {}; console.warn = () => {};

const START = Date.parse('2026-11-28T12:00:00Z'); let skew = 0; Date.now = () => START + skew;
const HOUR = 3600e3;
const recent = Math.floor(START / 1000) - 30 * 86400;
const routed = (id, name, p, c, created = recent) => ({ id, name, created, pricing: { prompt: String(p / 1e6), completion: String(c / 1e6) }, supported_parameters: ['reasoning'], reasoning: { supported_efforts: ['high', 'medium', 'low'] } });
const FEED = [
  routed('anthropic/claude-haiku-5.5', 'Anthropic: Claude Haiku 5.5', 0.1, 0.5),
  routed('anthropic/claude-haiku-5.6', 'Anthropic: Claude Haiku 5.6', 0.12, 0.6, recent + 86400), // 20% dearer
  routed('openai/gpt-6.1-terra', 'OpenAI: GPT-6.1 Terra', 1, 5),
  routed('openai/gpt-6.3-terra', 'OpenAI: GPT-6.3 Terra', 2, 10, recent + 86400), // twice the price
  routed('google/gemini-4-neon', 'Google: Gemini 4 Neon', 3, 15),
  routed('google/gemini-4.1-neon', 'Google: Gemini 4.1 Neon', 3.5, 16, recent + 86400), // within 25%, but premium
  routed('x-ai/grok-4.7', 'xAI: Grok 4.7', 1, 2),
];
const LISTS = {
  anthropic: ['claude-fable-5-2', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5-20261007', 'claude-haiku-5-6'],
  openai: ['gpt-6.2-astra', 'gpt-6.2-sol', 'gpt-6.1-terra', 'gpt-6-luna', 'gpt-6-astra', 'gpt-6.1-sol', 'gpt-6.3-terra'],
  google: ['gemini-4-neon', 'gemini-4.1-neon', 'gemini-4-hydrogen', 'gemini-4-carbon', 'gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro-preview', 'gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'],
};
let openaiList = LISTS.openai, solDown = true;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
let asked = [];
globalThis.fetch = async (u, o) => {
  const url = String(u), body = o?.body ? JSON.parse(o.body) : {};
  if (url.includes('openrouter.ai/api/v1/models')) return json({ data: FEED });
  if (url.includes('api.anthropic.com/v1/models')) return json({ data: LISTS.anthropic.map(id => ({ id })) });
  if (url.includes('api.openai.com/v1/models')) return json({ data: openaiList.map(id => ({ id })) });
  if (/generativelanguage[^?]*\/models\?/.test(url)) return json({ models: LISTS.google.map(id => ({ name: `models/${id}` })) });
  if (url.includes('generativelanguage')) { asked.push({ model: (url.match(/models\/([^:]+):/) || [])[1], body }); return json({ candidates: [{ content: { parts: [{ text: '[business] From Google.' }] } }] }); }
  if (url.includes('api.anthropic.com')) {
    asked.push({ model: body.model, body });
    return json({ id: 'msg_1', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: '[business] From Anthropic.' }], stop_reason: 'end_turn', usage: { input_tokens: 5, output_tokens: 1 } });
  }
  asked.push({ model: url.includes('openrouter.ai') ? `openrouter:${body.model}` : body.model, body });
  if (body.model === 'gpt-6.2-sol' && solDown) return json({ error: { message: 'The model `gpt-6.2-sol` is overloaded.' } }, 503);
  return json({ choices: [{ message: { content: '[business] From a chat API.' } }] });
};

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE leads (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT NOT NULL, name TEXT, email TEXT, service TEXT, budget TEXT, summary TEXT, status TEXT DEFAULT 'new', timestamp INTEGER, has_lightning_badge BOOLEAN DEFAULT FALSE);
CREATE TABLE chat_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT NOT NULL, user_message TEXT, bot_response TEXT, timestamp INTEGER);`);
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const bot = (mode, llmModel) => JSON.stringify({ mode, ...(llmModel ? { llmModel } : {}), llmEffort: 'low' });
const kv = new Map([
  ['client:astra', bot('ai_plus', 'gpt-6-astra')],
  ['client:sol', bot('ai', 'gpt-6.1-sol')],
  ['client:haiku', bot('ai', 'claude-haiku-5-5')],
  ['client:none', bot('ai')],
  ['client:terra', bot('ai', 'gpt-6.1-terra')],
  ['client:neon', bot('ai', 'gemini-4-neon')],
  ['client:neonplus', bot('ai_plus', 'gemini-4-neon')],
  ['client:flash', bot('ai', 'gemini-2.5-flash')],
  ['client:grok', bot('ai', 'openrouter:x-ai/grok-4.7')],
]);
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } };
const ALL = { GEMINI_API_KEY: 'test', OPENROUTER_API_KEY: 'test', ANTHROPIC_API_KEY: 'test', OPENAI_API_KEY: 'test', ADMIN_API_KEY: 'test-key', DB: { prepare: prep }, CLIENT_SETTINGS: KV };
let ip = 0;
const load = async (tag) => {
  const mod = await import(`./bundle.mjs?${tag}`);
  const svc = new mod.LlmService(); svc.env = ALL;
  return {
    svc,
    catalog: async () => (await mod.default.fetch(new Request('https://ai.bytesfx.com/public/models'), ALL, { waitUntil() {} })).json(),
    hourly: () => capture(async () => { const pending = []; await mod.default.scheduled({}, ALL, { waitUntil: (p) => pending.push(p) }); await Promise.all(pending); }),
    // The model that answered a chat with this bot
    chat: (client) => capture(async () => {
      asked = [];
      const res = await mod.default.fetch(new Request('https://ai.bytesfx.com/', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://web.bytesfx.com', 'CF-Connecting-IP': '198.51.100.' + ++ip }, body: JSON.stringify({ message: 'Hello there', clientId: client, sessionId: null }) }), ALL, { waitUntil() {} });
      return res.status === 200 ? asked[0]?.model : `HTTP ${res.status}`;
    }),
    email: (model) => capture(async () => { asked = []; const r = await svc.complete({ system: 'One line.', prompt: 'Hello', model, effort: 'low' }); return `${asked[0]?.model}|${r.model}`; }),
  };
};
const a = await load('move-a');
const saved = new Map(kv);

// ─── Before the hourly job has run ───────────────────────────────────────────
let m = await a.chat('astra');
ok('nothing moves before the hourly job has proven a newer version', m === 'gpt-6-astra', String(m));
ok('and the model list names no move', JSON.stringify((await a.catalog()).moves) === '[]', JSON.stringify((await a.catalog()).moves));

// ─── The hourly job tests the newer versions ─────────────────────────────────
asked = [];
await a.hourly();
const tested = asked.map(x => x.model).sort().join();
ok('the hourly job tests each table model that is a newer version within the price cap', asked.some(x => x.model === 'gpt-6.2-astra') && asked.some(x => x.model === 'gpt-6.2-sol'), tested);
ok('a newer version over the price cap is not tested for a move (Gemini 3.8 Flash, 3.1 Pro, 3.5 Flash-Lite)', !asked.some(x => /gemini-3/.test(x.model)), tested);
const tests = logs.map(l => l[0]).filter(l => l?.kind === 'successor-test');
ok('each of those tests is logged with its result', tests.length === 2 && tests.find(l => l.model === 'gpt-6.2-astra')?.ok === true && tests.find(l => l.model === 'gpt-6.2-sol')?.ok === false, JSON.stringify(tests));

// ─── Replies after it ────────────────────────────────────────────────────────
m = await a.chat('astra');
ok('a bot on a replaced model is answered by the newer version of its line', m === 'gpt-6.2-astra', String(m));
ok('the move is logged once', logs.map(l => l[0]).filter(l => l?.kind === 'model-move' && l.from === 'gpt-6-astra' && l.to === 'gpt-6.2-astra').length === 1 && (await a.chat('astra')) === 'gpt-6.2-astra' && logs.map(l => l[0]).filter(l => l?.kind === 'model-move' && l.from === 'gpt-6-astra').length === 1);
m = await a.chat('sol');
ok('a newer version that failed its test call is not moved to', m === 'gpt-6.1-sol', String(m));
m = await a.chat('haiku');
ok('a bot saved on the built-in model moves to a proven newer version within the cap', m === 'claude-haiku-5-6', String(m));
m = await a.chat('none');
ok('a bot with no model chosen keeps the platform default', m === 'claude-haiku-5-5', String(m));
m = await a.chat('terra');
ok('a newer version more than 25% dearer is not moved to', m === 'gpt-6.1-terra', String(m));
m = await a.chat('neon');
ok('a bot not on AI Plus is not moved to a premium newer version', m === 'gemini-4-neon', String(m));
m = await a.chat('neonplus');
ok('an AI Plus bot is moved to a premium newer version', m === 'gemini-4.1-neon', String(m));
m = await a.chat('flash');
ok('a retiring model with no newer version inside the cap keeps answering', m === 'gemini-2.5-flash', String(m));
m = await a.chat('grok');
ok('an OpenRouter model is left alone', m === 'openrouter:x-ai/grok-4.7', String(m));
ok('no saved setting was rewritten', [...saved].every(([k, v]) => kv.get(k) === v));

// ─── Email drafting and lead reading ─────────────────────────────────────────
m = await a.email('gpt-6-astra');
ok('an email model moves too, and the answer names the model that wrote it', m === 'gpt-6.2-astra|gpt-6.2-astra', m);
m = await a.email('gemini-4-neon');
ok('an email model that is not premium is not moved to a premium one', m === 'gemini-4-neon|gemini-4-neon', m);

// ─── Another isolate, and later runs ─────────────────────────────────────────
const b = await load('move-b');
m = await b.chat('haiku');
ok('another isolate knows the moves from the stored copy', m === 'claude-haiku-5-6', String(m));
skew = 2 * HOUR; asked = [];
await a.hourly();
ok('a passed test is not repeated, and a failed one not within a day', asked.length === 0, asked.map(x => x.model).join());
skew = 25 * HOUR; solDown = false; asked = [];
await a.hourly();
ok('a failed newer version is tested again after a day', asked.map(x => x.model).join() === 'gpt-6.2-sol', asked.map(x => x.model).join());
m = await a.chat('sol');
ok('and is moved to once it passes', m === 'gpt-6.2-sol', String(m));

// ─── A newer version that is no longer offered ───────────────────────────────
skew = 27 * HOUR; openaiList = LISTS.openai.filter(id => id !== 'gpt-6.2-astra');
await a.hourly();
m = await a.chat('astra');
ok('when the newer version leaves the picker, the bot is answered by its saved model again', m === 'gpt-6-astra', String(m));
m = await a.chat('sol');
ok('and other moves are unchanged', m === 'gpt-6.2-sol', String(m));

// ─── What the dashboard is told ──────────────────────────────────────────────
const told = (await a.catalog()).moves || [];
const move = (from) => told.find(x => x.from === from);
ok('the model list names each move with the newer model\'s name and price', move('gpt-6.1-sol')?.to === 'gpt-6.2-sol' && move('gpt-6.1-sol').name === 'GPT-6.2 Sol' && move('gpt-6.1-sol').inputPrice === 2 && move('gpt-6.1-sol').outputPrice === 10 && move('claude-haiku-5-5')?.to === 'claude-haiku-5-6', JSON.stringify(told));
ok('a move that has ended is not named', !move('gpt-6-astra'), JSON.stringify(told));
ok('a move only an AI Plus bot gets is not named', !move('gemini-4-neon'), JSON.stringify(told));
ok('a model with no move is not named', !move('gpt-6.1-terra') && !move('gemini-2.5-flash'), JSON.stringify(told));
