// Direct models that list themselves: a model a supplier's own list and OpenRouter's picker both name,
// and the hand-kept table lacks, is proven with one real call by the hourly job and then offered,
// with OpenRouter's price marked as not verified.
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
const logs = []; const realLog = console.log;
const capture = async (fn) => { console.log = (...a) => { logs.push(a); }; try { return await fn(); } finally { console.log = realLog; } };
console.error = () => {}; console.warn = () => {};

const START = Date.parse('2026-11-28T12:00:00Z'); let skew = 0; Date.now = () => START + skew;
const HOUR = 3600e3, DAY = 24 * HOUR;
const recent = Math.floor(START / 1000) - 30 * 86400;
const routed = (id, name, p, c, efforts = ['high', 'medium', 'low'], created = recent) => ({
  id, name, created, pricing: { prompt: String(p / 1e6), completion: String(c / 1e6) },
  ...(efforts.length ? { supported_parameters: ['reasoning'], reasoning: { supported_efforts: efforts } } : {}),
});
const BASE_FEED = [
  routed('anthropic/claude-haiku-5.5', 'Anthropic: Claude Haiku 5.5', 0.1, 0.5),
  routed('anthropic/claude-haiku-5.6', 'Anthropic: Claude Haiku 5.6', 0.2, 1, undefined, recent + 86400),
  routed('openai/gpt-6.2-sol', 'OpenAI: GPT-6.2 Sol', 2, 10),
  routed('openai/gpt-6.3-sol', 'OpenAI: GPT-6.3 Sol', 2.5, 12, undefined, recent + 86400),
  routed('openai/gpt-7-nova', 'OpenAI: GPT-7 Nova', 3, 9, ['high', 'medium']),
  routed('openai/gpt-8-lux', 'OpenAI: GPT-8 Lux', 10, 60, []),
  routed('openai/gpt-9-broken', 'OpenAI: GPT-9 Broken', 1, 2),
  routed('openai/gpt-5.5', 'OpenAI: GPT-5.5', 5, 30),
  routed('google/gemma-9-it', 'Google: Gemma 9', 0.1, 0.2, []),
  routed('x-ai/grok-4.7', 'xAI: Grok 4.7', 1, 2),
];
let FEED = BASE_FEED, feedDown = false;
// Each supplier's own list: every table model, plus the new ones
const LISTS = {
  anthropic: ['claude-fable-5-2', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5-20261007', 'claude-haiku-5-6'],
  openai: ['gpt-6.2-astra', 'gpt-6.2-sol', 'gpt-6.1-terra', 'gpt-6-luna', 'gpt-6.3-sol', 'gpt-7-nova', 'gpt-7-nova-mini', 'gpt-8-lux', 'gpt-9-broken', 'gpt-5.5-pro', 'text-embedding-9'],
  google: ['gemini-4-neon', 'gemini-4-hydrogen', 'gemini-4-carbon', 'gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro-preview', 'gemini-2.5-flash-lite'],
};
let openaiList = LISTS.openai, brokenWorks = false;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
let asked = [];
globalThis.fetch = async (u, o) => {
  const url = String(u), body = o?.body ? JSON.parse(o.body) : {};
  if (url.includes('openrouter.ai/api/v1/models')) return feedDown ? json({}, 500) : json({ data: FEED });
  if (url.includes('api.anthropic.com/v1/models')) return json({ data: LISTS.anthropic.map(id => ({ id })) });
  if (url.includes('api.openai.com/v1/models')) return json({ data: openaiList.map(id => ({ id })) });
  if (/generativelanguage.*\/v1beta\/models\?/.test(url)) return json({ models: LISTS.google.map(id => ({ name: `models/${id}` })) });
  if (url.includes('generativelanguage')) { asked.push({ api: 'google', model: (url.match(/models\/([^:]+):/) || [])[1], body }); return json({ candidates: [{ content: { parts: [{ text: 'ready' }] } }] }); }
  if (url.includes('api.anthropic.com')) {
    asked.push({ api: 'anthropic', model: body.model, body });
    return json({ id: 'msg_1', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: 'ready' }], stop_reason: 'end_turn', usage: { input_tokens: 5, output_tokens: 1 } });
  }
  asked.push({ api: 'openai', model: body.model, body });
  if (body.model === 'gpt-9-broken' && !brokenWorks) return json({ error: { message: 'The model `gpt-9-broken` does not exist or you do not have access to it.' } }, 404);
  return json({ choices: [{ message: { content: 'ready' } }] });
};

const kv = new Map();
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } };
const ALL = { GEMINI_API_KEY: 'test', OPENROUTER_API_KEY: 'test', ANTHROPIC_API_KEY: 'test', OPENAI_API_KEY: 'test', CLIENT_SETTINGS: KV };
const load = async (tag) => {
  const mod = await import(`./bundle.mjs?${tag}`);
  const svc = new mod.LlmService(); svc.env = ALL;
  return {
    svc,
    catalog: async () => (await mod.default.fetch(new Request('https://ai.bytesfx.com/public/models'), ALL, { waitUntil() {} })).json(),
    // The hourly job, waited for
    hourly: async () => { const pending = []; await mod.default.scheduled({}, ALL, { waitUntil: (p) => pending.push(p) }); await Promise.all(pending); },
  };
};
const a = await load('auto-a');
let cat = await a.catalog();
const model = (id) => cat.models.find(x => x.id === id);
const direct = () => cat.models.filter(x => x.provider !== 'openrouter');
const testedIds = () => asked.map(x => x.model).sort().join();

// ─── Before the hourly job has run ───────────────────────────────────────────
ok('nothing is offered before it is proven: the picker holds the 16 table models', direct().length === 16 && !model('gpt-7-nova'), direct().map(x => x.id).join());
ok('reading the model list makes no test call', asked.length === 0, testedIds());

// ─── The hourly job proves the new models ────────────────────────────────────
await capture(() => a.hourly());
ok('each new model both lists name gets one test call, and no other model does', testedIds() === 'claude-haiku-5-6,gpt-6.3-sol,gpt-7-nova,gpt-8-lux,gpt-9-broken', testedIds());
ok('a model the supplier does not list is not tested (Gemma, and GPT-5.5 where only gpt-5.5-pro is listed)', !asked.some(x => /gemma|gpt-5\.5/.test(x.model)), testedIds());
ok('a supplier model OpenRouter does not offer is not tested', !asked.some(x => /nova-mini|embedding/.test(x.model)), testedIds());
const sent = (id) => asked.find(x => x.model === id)?.body || {};
ok('the test call uses medium effort where the model accepts it', sent('gpt-7-nova').reasoning_effort === 'medium' && sent('claude-haiku-5-6').output_config?.effort === 'medium', JSON.stringify(sent('gpt-7-nova')));
ok('a model with no effort setting is tested without one', !('reasoning_effort' in sent('gpt-8-lux')), JSON.stringify(sent('gpt-8-lux')));
const autoLogs = logs.map(l => l[0]).filter(l => l?.kind === 'auto-model');
ok('each test is logged with its result', autoLogs.length === 5 && autoLogs.find(l => l.model === 'gpt-7-nova')?.ok === true && autoLogs.find(l => l.model === 'gpt-9-broken')?.ok === false && /does not exist/.test(autoLogs.find(l => l.model === 'gpt-9-broken')?.error || ''), JSON.stringify(autoLogs));

cat = await a.catalog();
const nova = model('gpt-7-nova');
ok('a proven model is offered as a direct model with its name, price and effort levels from OpenRouter', nova?.provider === 'openai' && nova.providerName === 'OpenAI' && nova.name === 'GPT-7 Nova' && nova.inputPrice === 3 && nova.outputPrice === 9 && nova.efforts.join() === 'medium,high' && nova.available === true && nova.premium === false, JSON.stringify(nova));
ok('its price is marked as not verified, with no read date', nova?.priceUnverified === true && !('priceRead' in nova) && nova.priceStale === false && !('auto' in nova), JSON.stringify(nova));
ok('a table model is not marked as unverified', !('priceUnverified' in model('gpt-6-luna')) && model('gpt-6-luna').priceRead === '2026-11-28');
ok('a model that failed its test call is not offered', !model('gpt-9-broken'));
ok('a proven model above the premium price is offered as premium', model('gpt-8-lux')?.premium === true && model('gpt-8-lux').efforts.length === 0, JSON.stringify(model('gpt-8-lux')));
ok('models never tested are not offered as direct models', !model('gemma-9-it') && !model('gpt-5.5') && !!model('openrouter:google/gemma-9-it'));

// ─── A newer version replaces the older one in the picker ────────────────────
ok('a proven newer version of a table model\'s line takes its place in the picker', !!model('gpt-6.3-sol') && !model('gpt-6.2-sol'), direct().map(x => x.id).join());
ok('the built-in default stays in the picker beside its newer version', !!model('claude-haiku-5-6') && !!model('claude-haiku-5-5'));
ok('a model of another line is not replaced', !!model('gpt-6-luna') && !!model('gpt-6.2-astra'));
asked = [];
let res = await capture(() => a.svc.testModels([{ model: 'gpt-6.2-sol', effort: 'low' }]));
ok('a bot already on the replaced model still gets its answers from it', res[0].ok === true && asked[0]?.model === 'gpt-6.2-sol', JSON.stringify(res));

// ─── Calling a proven model ──────────────────────────────────────────────────
asked = [];
res = await capture(() => a.svc.testModels([{ model: 'gpt-7-nova', effort: 'high' }, { model: 'claude-haiku-5-6', effort: 'low' }, { model: 'gpt-9-broken' }, { model: 'gpt-7-nova', effort: 'low' }]));
ok('a proven model is called on its supplier\'s own API at the chosen effort', res[0].ok && asked[0]?.api === 'openai' && asked[0].body.reasoning_effort === 'high' && res[1].ok && asked.find(x => x.model === 'claude-haiku-5-6')?.api === 'anthropic', JSON.stringify(res));
ok('a model that was never proven cannot be called', res[2].ok === false && /not a model the chatbot server knows/.test(res[2].error), JSON.stringify(res[2]));
ok('an effort the model does not accept is not sent', res[3].ok && !('reasoning_effort' in asked[asked.length - 1].body), JSON.stringify(asked[asked.length - 1]?.body));
const b = await load('auto-b'); // a new isolate: nothing in memory, only the stored copy
asked = [];
res = await capture(() => b.svc.testModels([{ model: 'gpt-7-nova' }]));
ok('another isolate knows a proven model from the stored copy', res[0].ok === true && asked[0]?.model === 'gpt-7-nova', JSON.stringify(res));

// ─── The platform's choices ──────────────────────────────────────────────────
ok('a proven model can be the email default', (await a.svc.checkDefaults({ emailDefault: 'gpt-7-nova' })).ok === true);
const prem = await a.svc.checkDefaults({ chatDefault: 'gpt-8-lux' });
ok('a proven premium model cannot be the chat default', prem.ok === false && /premium/.test(prem.error), JSON.stringify(prem));
const fb = await a.svc.checkDefaults({ chatFallback: 'gpt-7-nova' });
ok('a fallback must still be a hand-checked table model', fb.ok === false && /fallback list/.test(fb.error), JSON.stringify(fb));
ok('the fallback list holds no automatic model', (cat.fallbackModels || []).length > 0 && !(cat.fallbackModels || []).some(x => /nova|lux|6\.3|5-6/.test(x.id)), (cat.fallbackModels || []).map(x => x.id).join());

// ─── Later runs ──────────────────────────────────────────────────────────────
asked = []; skew = 2 * HOUR;
await capture(() => a.hourly());
ok('a proven model is not tested again, and a failed one not within a day', asked.length === 0, testedIds());
skew = 25 * HOUR; brokenWorks = true;
await capture(() => a.hourly());
ok('a failed model is tried again after a day', testedIds() === 'gpt-9-broken', testedIds());
cat = await a.catalog();
ok('and is offered once it passes', !!model('gpt-9-broken'));

// ─── When a list stops naming it ─────────────────────────────────────────────
skew = 27 * HOUR; FEED = BASE_FEED.filter(m => m.id !== 'openai/gpt-7-nova');
await capture(() => a.hourly());
cat = await a.catalog();
ok('a model OpenRouter no longer offers leaves the picker', !model('gpt-7-nova') && !!model('gpt-8-lux'), direct().map(x => x.id).join());
asked = [];
res = await capture(() => a.svc.testModels([{ model: 'gpt-7-nova' }]));
ok('but a bot already on it still gets its answers from it', res[0].ok === true && asked[0]?.model === 'gpt-7-nova', JSON.stringify(res));
skew = 29 * HOUR; FEED = BASE_FEED; openaiList = LISTS.openai.filter(id => id !== 'gpt-8-lux');
await capture(() => a.hourly());
cat = await a.catalog();
ok('a model its supplier no longer lists leaves the picker', !model('gpt-8-lux') && !!model('gpt-7-nova'), direct().map(x => x.id).join());

// ─── When OpenRouter's list cannot be read ───────────────────────────────────
skew = 31 * HOUR; openaiList = LISTS.openai; feedDown = true; asked = [];
await capture(() => a.hourly());
cat = await a.catalog();
ok('a failed read of OpenRouter\'s list tests nothing and removes nothing', asked.length === 0 && !!model('gpt-7-nova') && !!model('gpt-6.3-sol'), direct().map(x => x.id).join());

// ─── No more than six tests in one run ───────────────────────────────────────
kv.clear(); feedDown = false; skew = 40 * HOUR; brokenWorks = false;
const many = Array.from({ length: 9 }, (_, i) => `gpt-7-bulk${String.fromCharCode(97 + i)}`);
FEED = [...BASE_FEED.filter(m => !/nova|lux|broken|6\.3|5\.6/.test(m.id)), ...many.map(id => routed(`openai/${id}`, `OpenAI: ${id}`, 1, 2))];
openaiList = [...LISTS.openai, ...many];
const c = await load('auto-c');
asked = [];
await capture(() => c.hourly());
ok('one run tests at most six new models', asked.length === 6, String(asked.length));
skew = 41 * HOUR + 60e3;
await capture(() => c.hourly());
ok('and the next run tests the rest', asked.length === 9 && new Set(asked.map(x => x.model)).size === 9, String(asked.length));
