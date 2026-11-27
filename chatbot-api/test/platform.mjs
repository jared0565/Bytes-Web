// The platform's four model choices, set by an admin and stored in KV under "platform:models":
// the chat default, the chat fallback, the email default and the email fallback.
import { DatabaseSync } from 'node:sqlite';
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
console.error = () => {}; console.warn = () => {}; // model failures are caused on purpose

// The worker keeps the choices for a minute: the tests move the clock past that after each change
const realNow = Date.now; let skew = 0; Date.now = () => realNow() + skew;
const recent = Math.floor(realNow() / 1000) - 30 * 86400;
const m = (id, price = ['0.000001', '0.000002']) => ({ id, name: `${id.split('/')[0]}: ${id.split('/')[1]}`, created: recent, pricing: { prompt: price[0], completion: price[1] }, supported_parameters: ['reasoning'], reasoning: { supported_efforts: ['high', 'medium', 'low'] } });
const FEED = [m('anthropic/claude-haiku-5.5'), m('anthropic/claude-fable-5.2', ['0.000008', '0.00004']), m('openai/gpt-6-luna'), m('x-ai/grok-4.7')];

// `answers` decides, per model, whether a call succeeds: a string is the reply, anything else is a failure
let answers = {}, asked = [], leadReads = [];
const say = (model, body) => { asked.push({ model, body }); return answers[model]; };
globalThis.fetch = async (u, o) => {
  const url = String(u), body = o?.body ? JSON.parse(o.body) : {};
  if (url.includes('openrouter.ai/api/v1/models')) return new Response(JSON.stringify({ data: FEED }));
  if (url.includes('/webhooks/')) return new Response('{}');
  if (url.includes('generativelanguage')) {
    const model = (url.match(/models\/([^:]+):/) || [])[1];
    if ((body.system_instruction?.parts?.[0]?.text || '').startsWith('You extract facts')) { leadReads.push(model); return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"name":"Ferdy","need":"a website","budget":"","timeline":"","summary":"Wants a website."}' }] } }] })); }
    const out = say(model, body);
    return typeof out === 'string' ? new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: out }] } }] })) : new Response(JSON.stringify({ error: 'down' }), { status: 500 });
  }
  const model = url.includes('openrouter.ai') ? `openrouter:${body.model}` : body.model; // OpenRouter, or OpenAI directly
  const out = say(model, body);
  return typeof out === 'string' ? new Response(JSON.stringify({ choices: [{ message: { content: out } }] })) : new Response(JSON.stringify({ error: { message: 'down' } }), { status: 500 });
};

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE leads (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT NOT NULL, name TEXT, email TEXT, service TEXT, budget TEXT, summary TEXT, status TEXT DEFAULT 'new', timestamp INTEGER, has_lightning_badge BOOLEAN DEFAULT FALSE);
CREATE TABLE chat_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT NOT NULL, user_message TEXT, bot_response TEXT, timestamp INTEGER);`);
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const kv = new Map([['client:default', JSON.stringify({ mode: 'ai' })]]);
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } };
const ENV = { GEMINI_API_KEY: 'test', OPENROUTER_API_KEY: 'test', ADMIN_API_KEY: 'test-key', DB: { prepare: prep }, CLIENT_SETTINGS: KV };
const WITH_OPENAI = { ...ENV, OPENAI_API_KEY: 'test' };
const mod = await import('./bundle.mjs');
const waits = []; const ctx = { waitUntil: p => waits.push(p) };

const choose = (value) => { if (value === null) kv.delete('platform:models'); else kv.set('platform:models', typeof value === 'string' ? value : JSON.stringify(value)); skew += 61e3; };
const catalog = async (env = ENV) => (await mod.default.fetch(new Request('https://ai.bytesfx.com/public/models'), env, ctx)).json();
let ip = 0;
const chat = async (a, env = ENV, message = 'Hello there') => {
  answers = a; asked = [];
  const res = await mod.default.fetch(new Request('https://ai.bytesfx.com/', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://web.bytesfx.com', 'CF-Connecting-IP': '198.51.100.' + ++ip }, body: JSON.stringify({ message, clientId: 'default', sessionId: null }) }), env, ctx);
  const j = await res.json().catch(() => ({}));
  return { status: res.status, text: j.response, order: asked.map(x => x.model).join(' > ') };
};
const email = async (a, args = {}, env = ENV) => {
  answers = a; asked = [];
  const s = new mod.LlmService(); s.env = env;
  try { return { ...(await s.complete({ system: 'One line.', prompt: 'Hello', ...args })), order: asked.map(x => x.model).join(' > ') }; }
  catch (e) { return { error: e.message, order: asked.map(x => x.model).join(' > ') }; }
};
const check = async (input, env = ENV) => { const s = new mod.LlmService(); s.env = env; return s.checkDefaults(input); };
const HAIKU = 'openrouter:anthropic/claude-haiku-5.5', GROK = 'openrouter:x-ai/grok-4.7', LUNA = 'openrouter:openai/gpt-6-luna', FABLE = 'openrouter:anthropic/claude-fable-5.2';
const FIRST = 'gemini-3.5-flash-lite', LAST = 'gemini-2.5-flash-lite', PRO = 'gemini-3.1-pro-preview';

// ─── Nothing chosen: the built-in models ──────────────────────────────────────
let cat = await catalog();
ok('with nothing chosen the chat default is Haiku 5.5 and the email default is GPT-6 Luna', cat.defaultModel === HAIKU && cat.emailDefaultModel === LUNA, `${cat.defaultModel} | ${cat.emailDefaultModel}`);
const fb = (c) => (c.fallbackModels || []).map(x => x.id);
ok('fallback choices are direct supplier models: no OpenRouter, premium or retiring model', fb(cat).includes(FIRST) && fb(cat).includes(LAST) && fb(cat).includes(PRO) && fb(cat).includes('claude-haiku-5-5') && fb(cat).includes('gpt-6-luna') && !fb(cat).some(id => /^openrouter:|claude-opus|gpt-6-astra|gemini-2\.5-flash$|gemini-2\.5-pro$/.test(id)), fb(cat).join());
ok('a fallback choice shows whether its supplier key is set', cat.fallbackModels?.find(x => x.id === PRO)?.available === true && cat.fallbackModels?.find(x => x.id === 'gpt-6-luna')?.available === false);
ok('with nothing chosen the fallback and email fallback are the built-in first backup', cat.chatFallbackModel === FIRST && cat.emailFallbackModel === FIRST, `${cat.chatFallbackModel} | ${cat.emailFallbackModel}`);
let r = await chat({});
ok('with nothing chosen the chain is Haiku, then the two built-in backups', r.order === `${HAIKU} > ${FIRST} > ${LAST}`, r.order);

// ─── The chat default ─────────────────────────────────────────────────────────
choose({ chatDefault: GROK });
r = await chat({ [GROK]: '[business] From the chosen default.' });
ok('a bot with no model of its own is answered by the chosen chat default', r.text === 'From the chosen default.' && r.order === GROK, JSON.stringify(r));
ok('the model list names the chosen chat default', (await catalog()).defaultModel === GROK);

choose({ chatDefault: FABLE });
r = await chat({ [HAIKU]: '[business] From Haiku.' });
ok('a premium chat default is not used: bots not on AI Plus would get a premium model', r.order === HAIKU && (await catalog()).defaultModel === HAIKU, r.order);

// ─── The chat fallback ────────────────────────────────────────────────────────
choose({ chatFallback: PRO });
r = await chat({ [LAST]: '[business] From the last resort.' });
ok('the chosen fallback is tried first, with the fixed last resort behind it', r.text === 'From the last resort.' && r.order === `${HAIKU} > ${PRO} > ${LAST}`, JSON.stringify(r));
choose({ chatFallback: LAST });
r = await chat({});
ok('choosing the last resort itself gives a chain of one backup', r.order === `${HAIKU} > ${LAST}`, r.order);

choose({ chatFallback: 'gpt-6-luna' });
r = await chat({ 'gpt-6-luna': '[business] From OpenAI directly.' }, WITH_OPENAI);
const direct = asked.find(x => x.model === 'gpt-6-luna');
ok('a fallback on another supplier is called on that supplier, at low effort', r.text === 'From OpenAI directly.' && r.order === `${HAIKU} > gpt-6-luna` && direct?.body?.reasoning_effort === 'low', JSON.stringify(r));
r = await chat({});
ok('a chosen fallback whose key is not set is ignored: the built-in backups run', r.order === `${HAIKU} > ${FIRST} > ${LAST}`, r.order);

choose({ chatFallback: GROK });
r = await chat({});
ok('a fallback through OpenRouter is ignored', r.order === `${HAIKU} > ${FIRST} > ${LAST}`, r.order);
choose('{not json');
r = await chat({});
ok('an entry that cannot be read leaves the built-in models in place', r.order === `${HAIKU} > ${FIRST} > ${LAST}`, r.order);

// The lead reader follows the chat fallback
choose(null); leadReads = [];
await chat({ [HAIKU]: '[business] Thanks, noted.' }, ENV, 'I am Ferdy, ferdy@shop7.co, and I need a website');
while (waits.length) await Promise.all(waits.splice(0));
ok('with nothing chosen the lead reader stays on its built-in model', leadReads.join() === LAST, leadReads.join());
choose({ chatFallback: PRO }); leadReads = [];
await chat({ [HAIKU]: '[business] Thanks, noted.' }, ENV, 'I am Dana, dana@shop8.co, and I need a web shop');
while (waits.length) await Promise.all(waits.splice(0));
ok('the lead reader uses the chosen chat fallback', leadReads.join() === PRO, leadReads.join());

// ─── The email default and fallback ───────────────────────────────────────────
choose({ emailDefault: HAIKU, emailFallback: PRO });
let e = await email({ [HAIKU]: 'From the email default.' });
ok('an email with no model of its own is written by the chosen email default', e.text === 'From the email default.' && e.order === HAIKU, JSON.stringify(e));
e = await email({});
ok('the email chain is the default, the chosen fallback, then the last resort', /No model could answer/.test(e.error || '') && e.order === `${HAIKU} > ${PRO} > ${LAST}`, JSON.stringify(e));
e = await email({ [GROK]: 'From the client model.' }, { model: GROK });
ok('a client with its own email model keeps it', e.text === 'From the client model.' && e.order === GROK, JSON.stringify(e));
cat = await catalog();
ok('the model list names the chosen email default and fallback', cat.emailDefaultModel === HAIKU && cat.emailFallbackModel === PRO && cat.chatFallbackModel === FIRST, `${cat.emailDefaultModel} | ${cat.emailFallbackModel}`);

// ─── Checking a set of choices before it is saved ─────────────────────────────
let c = await check({ chatDefault: GROK, chatFallback: PRO, emailDefault: '', emailFallback: LAST });
ok('a valid set is accepted, with empty meaning the built-in model', c.ok === true && c.value.chatDefault === GROK && c.value.emailDefault === '' && Object.keys(c.value).length === 4, JSON.stringify(c));
c = await check({ chatDefault: 'openrouter:acme/made-up-9' });
ok('a default that is not in the model list is refused', c.ok === false && /chat default/i.test(c.error), JSON.stringify(c));
c = await check({ chatDefault: FABLE });
ok('a premium chat default is refused', c.ok === false && /premium/i.test(c.error), JSON.stringify(c));
c = await check({ emailDefault: FABLE });
ok('a premium email default is allowed', c.ok === true, JSON.stringify(c));
c = await check({ chatDefault: 'gpt-6-luna' });
ok('a default on a supplier whose key is not set is refused', c.ok === false && /key/i.test(c.error), JSON.stringify(c));
c = await check({ chatFallback: GROK });
ok('a fallback through OpenRouter is refused', c.ok === false && /chat fallback/i.test(c.error), JSON.stringify(c));
c = await check({ emailFallback: 'gpt-6-luna' });
ok('a fallback on a supplier whose key is not set is refused', c.ok === false && /key/i.test(c.error), JSON.stringify(c));
c = await check({ emailFallback: 'gpt-6-luna' }, WITH_OPENAI);
ok('the same fallback is accepted once the key is set', c.ok === true, JSON.stringify(c));
c = await check({ chatDefault: 42 });
ok('a value that is not text is refused', c.ok === false, JSON.stringify(c));
