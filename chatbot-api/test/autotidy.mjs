// Two limits on the direct models that list themselves: a tool-calling variant of a model is not
// listed beside it, and a model its supplier refuses as "not a chat model" is not tested again.
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
const realLog = console.log;
const quiet = async (fn) => { console.log = () => {}; try { return await fn(); } finally { console.log = realLog; } };
console.error = () => {}; console.warn = () => {};

const START = Date.parse('2026-11-28T12:00:00Z'); let skew = 0; Date.now = () => START + skew;
const HOUR = 3600e3;
const recent = Math.floor(START / 1000) - 30 * 86400;
const routed = (id, name, p, c) => ({ id, name, created: recent, pricing: { prompt: String(p / 1e6), completion: String(c / 1e6) }, supported_parameters: ['reasoning'], reasoning: { supported_efforts: ['high', 'medium', 'low'] } });
const FEED = [
  routed('anthropic/claude-haiku-5.5', 'Anthropic: Claude Haiku 5.5', 0.1, 0.5),
  routed('google/gemini-3.1-pro-preview-customtools', 'Google: Gemini 3.1 Pro Preview Custom Tools', 2, 12),
  routed('google/gemini-5-customtools', 'Google: Gemini 5 Custom Tools', 2, 12),
  routed('openai/gpt-5.5-pro', 'OpenAI: GPT-5.5 Pro', 30, 180),
  routed('openai/gpt-5.3-codex', 'OpenAI: GPT-5.3 Codex', 1.75, 14),
  routed('openai/gpt-9-busy', 'OpenAI: GPT-9 Busy', 1, 2),
  routed('openai/gpt-7-nova', 'OpenAI: GPT-7 Nova', 3, 9),
];
const LISTS = {
  anthropic: ['claude-fable-5-2', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'],
  openai: ['gpt-6.2-astra', 'gpt-6.2-sol', 'gpt-6.1-terra', 'gpt-6-luna', 'gpt-5.5-pro', 'gpt-5.3-codex', 'gpt-9-busy', 'gpt-7-nova'],
  google: ['gemini-4-neon', 'gemini-4-hydrogen', 'gemini-4-carbon', 'gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro-preview', 'gemini-2.5-flash-lite', 'gemini-3.1-pro-preview-customtools', 'gemini-5-customtools'],
};
const REFUSALS = {
  'gpt-5.5-pro': 'This is not a chat model and thus not supported in the v1/chat/completions endpoint. Did you mean to use v1/completions?',
  'gpt-5.3-codex': 'This model is not supported in the v1/chat/completions endpoint. Use the v1/responses endpoint instead.',
  'gpt-9-busy': 'The server is overloaded.',
};
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
let asked = [];
globalThis.fetch = async (u, o) => {
  const url = String(u), body = o?.body ? JSON.parse(o.body) : {};
  if (url.includes('openrouter.ai/api/v1/models')) return json({ data: FEED });
  if (url.includes('api.anthropic.com/v1/models')) return json({ data: LISTS.anthropic.map(id => ({ id })) });
  if (url.includes('api.openai.com/v1/models')) return json({ data: LISTS.openai.map(id => ({ id })) });
  if (/generativelanguage[^?]*\/models\?/.test(url)) return json({ models: LISTS.google.map(id => ({ name: `models/${id}` })) });
  if (url.includes('generativelanguage')) { asked.push((url.match(/models\/([^:]+):/) || [])[1]); return json({ candidates: [{ content: { parts: [{ text: 'ready' }] } }] }); }
  asked.push(body.model);
  if (REFUSALS[body.model]) return json({ error: { message: REFUSALS[body.model] } }, body.model === 'gpt-9-busy' ? 503 : 404);
  return json({ choices: [{ message: { content: 'ready' } }] });
};

// The stored list as production has it today: the Custom Tools variant was proven before this rule
const customTools = { provider: 'google', slug: 'google/gemini-3.1-pro-preview-customtools', name: 'Gemini 3.1 Pro Preview Custom Tools', inputPrice: 2, outputPrice: 12, efforts: ['low', 'medium', 'high'], provenAt: START - HOUR };
const kv = new Map([['cache:auto-models', JSON.stringify({ at: START - HOUR, models: { 'gemini-3.1-pro-preview-customtools': customTools }, failed: {} })]]);
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } };
const ALL = { GEMINI_API_KEY: 'test', OPENROUTER_API_KEY: 'test', ANTHROPIC_API_KEY: 'test', OPENAI_API_KEY: 'test', CLIENT_SETTINGS: KV };
const mod = await import('./bundle.mjs?tidy');
const svc = new mod.LlmService(); svc.env = ALL;
const catalog = async () => (await mod.default.fetch(new Request('https://ai.bytesfx.com/public/models'), ALL, { waitUntil() {} })).json();
const hourly = () => quiet(async () => { asked = []; const pending = []; await mod.default.scheduled({}, ALL, { waitUntil: (p) => pending.push(p) }); await Promise.all(pending); });
const has = (cat, id) => cat.models.some(x => x.id === id);

// ─── A tool-calling variant ──────────────────────────────────────────────────
let cat = await catalog();
ok('a Custom Tools variant already proven is no longer offered as a direct model', !has(cat, 'gemini-3.1-pro-preview-customtools') && has(cat, 'gemini-3.1-pro-preview'), cat.models.filter(x => x.provider === 'google').map(x => x.id).join());
ok('it is still offered through OpenRouter', has(cat, 'openrouter:google/gemini-3.1-pro-preview-customtools'));
await hourly();
ok('a Custom Tools variant is not tested', !asked.some(id => /customtools/.test(id)), asked.join());
ok('an ordinary new model is still tested and offered', asked.includes('gpt-7-nova') && has(await catalog(), 'gpt-7-nova'), asked.join());
const res = await quiet(() => svc.testModels([{ model: 'gemini-3.1-pro-preview-customtools', effort: 'low' }]));
ok('a bot already on the proven variant still gets its answers from it', res[0].ok === true, JSON.stringify(res));

// ─── A model that is not a chat model ────────────────────────────────────────
ok('each refused model was tested once', ['gpt-5.5-pro', 'gpt-5.3-codex', 'gpt-9-busy'].every(id => asked.filter(x => x === id).length === 1), asked.join());
skew = 25 * HOUR;
await hourly();
ok('a model refused as not a chat model is not tested again after a day', !asked.includes('gpt-5.5-pro') && !asked.includes('gpt-5.3-codex'), asked.join());
ok('a model that failed for another reason is tested again after a day', asked.includes('gpt-9-busy'), asked.join());
skew = 24 * 30 * HOUR;
await hourly();
ok('nor is it tested a month later', !asked.includes('gpt-5.5-pro') && !asked.includes('gpt-5.3-codex') && asked.includes('gpt-9-busy'), asked.join());
cat = await catalog();
ok('a refused model is never offered as a direct model', !has(cat, 'gpt-5.5-pro') && !has(cat, 'gpt-5.3-codex') && !has(cat, 'gpt-9-busy'));
