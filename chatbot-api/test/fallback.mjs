// The email models' backup chain (LlmService, used by the CRM for drafting and reading emails).
const { LlmService } = await import('./bundle.mjs');
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
console.error = () => {}; // the service logs the model failures these checks cause on purpose

// OpenRouter's model list: a newer Anthropic model sits above Haiku 5.5, as it does on the live list
const RECENT = Math.floor(Date.now() / 1000) - 30 * 86400; // listed a month ago: the picker leaves out lines over 12 months old
const ROUTER_LIST = [
  { id: 'anthropic/claude-fable-5.2', name: 'Anthropic: Claude Fable 5.2', created: RECENT + 86400, pricing: { prompt: '0.000008', completion: '0.00004' }, supported_parameters: ['reasoning'] },
  { id: 'anthropic/claude-haiku-5.5', name: 'Anthropic: Claude Haiku 5.5', created: RECENT, pricing: { prompt: '0.0000001', completion: '0.0000005' }, supported_parameters: ['reasoning'] },
];

// `answers` decides, per model, whether a call succeeds: a string is the reply, anything else is a failure
let answers = {};
let asked = [];
globalThis.fetch = async (u, o) => {
  const url = String(u), body = o?.body ? JSON.parse(o.body) : {};
  if (url.includes('openrouter.ai/api/v1/models')) return new Response(JSON.stringify({ data: ROUTER_LIST }));
  const model = url.includes('openrouter.ai') ? `openrouter:${body.model}` : (url.match(/models\/([^:]+):/) || [])[1];
  asked.push({ model, body });
  const out = answers[model];
  if (typeof out !== 'string') return new Response(JSON.stringify({ error: { message: 'down' } }), { status: 500 });
  return new Response(JSON.stringify(url.includes('openrouter.ai')
    ? { choices: [{ message: { content: out } }] }
    : { candidates: [{ content: { parts: [{ text: out }] } }] }));
};
const service = (env) => { const s = new LlmService(); s.env = env; return s; };
const run = async (env, args, a) => {
  answers = a; asked = [];
  try { return { ...(await service(env).complete({ system: 'Write one line.', prompt: 'Hello', ...args })), order: asked.map(x => x.model).join(' > ') }; }
  catch (e) { return { error: e.message, order: asked.map(x => x.model).join(' > ') }; }
};
const BOTH = { GEMINI_API_KEY: 'test', OPENROUTER_API_KEY: 'test' };
const FIRST = 'gemini-3.5-flash-lite', LAST = 'gemini-2.5-flash-lite';

let r = await run(BOTH, {}, { [FIRST]: 'From the first backup.' });
ok('the email model fails: the first backup answers', r.text === 'From the first backup.' && r.model === FIRST && r.order === `openrouter:openai/gpt-6-luna > ${FIRST}`, JSON.stringify(r));

r = await run(BOTH, {}, { [LAST]: 'From the last backup.' });
ok('the first backup fails too: the last backup answers', r.text === 'From the last backup.' && r.model === LAST && r.order === `openrouter:openai/gpt-6-luna > ${FIRST} > ${LAST}`, JSON.stringify(r));

ok('a backup call carries no thinking setting, the form already used in production', asked.slice(1).every(x => !('thinkingConfig' in (x.body.generationConfig || {}))), JSON.stringify(asked.slice(1).map(x => x.body.generationConfig)));

r = await run(BOTH, { model: 'openrouter:anthropic/claude-haiku-5.5' }, { 'openrouter:anthropic/claude-haiku-5.5': 'From the chosen model.' });
ok('a chosen model that works is used and no backup is called', r.text === 'From the chosen model.' && r.order === 'openrouter:anthropic/claude-haiku-5.5', JSON.stringify(r));

r = await run(BOTH, {}, {});
ok('every model fails: the service throws after trying each once', /No model could answer/.test(r.error || '') && r.order === `openrouter:openai/gpt-6-luna > ${FIRST} > ${LAST}`, JSON.stringify(r));

r = await run({ GEMINI_API_KEY: 'test' }, {}, { [LAST]: 'Only Google is set up.' });
ok('with only a Google key the backups are the whole chain, each tried once', r.text === 'Only Google is set up.' && r.order === `${FIRST} > ${LAST}`, JSON.stringify(r));

ok('no retired model is ever asked', !/gemini-2\.5-flash(?!-lite)|gemini-3\.1-flash-lite-preview/.test(r.order));

// ─── The default chat model ───────────────────────────────────────────────────
// Claude Haiku 5.5: on Anthropic's own API when that key is set, otherwise through OpenRouter.
const worker = (await import('./bundle.mjs')).default;
const catalog = async (env) => (await worker.fetch(new Request('https://ai.bytesfx.com/public/models'), env, { waitUntil() {} })).json();
const HAIKU_ROUTED = 'openrouter:anthropic/claude-haiku-5.5';

let cat = await catalog(BOTH);
let entry = cat.models.find(m => m.id === HAIKU_ROUTED);
ok('with OpenRouter and Google keys the default is Haiku 5.5 through OpenRouter', cat.defaultModel === HAIKU_ROUTED, cat.defaultModel);
ok('the default is in the model list with its live price, though a newer Anthropic model exists', !!entry && entry.inputPrice === 0.1 && entry.outputPrice === 0.5 && entry.available === true && cat.models.some(m => m.id === 'openrouter:anthropic/claude-fable-5.2'), JSON.stringify(entry));

cat = await catalog({ ...BOTH, ANTHROPIC_API_KEY: 'test' });
entry = cat.models.find(m => m.id === 'claude-haiku-5-5');
ok('with an Anthropic key the default is Haiku 5.5 on Anthropic directly', cat.defaultModel === 'claude-haiku-5-5' && !!entry && entry.available === true, cat.defaultModel);

cat = await catalog({ GEMINI_API_KEY: 'test' });
ok('with only a Google key the default is the first backup model', cat.defaultModel === FIRST, cat.defaultModel);
