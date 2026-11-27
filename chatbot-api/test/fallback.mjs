// The email models' backup chain (LlmService, used by the CRM for drafting and reading emails).
const { LlmService } = await import('./bundle.mjs');
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
console.error = () => {}; // the service logs the model failures these checks cause on purpose

// `answers` decides, per model, whether a call succeeds: a string is the reply, anything else is a failure
let answers = {};
let asked = [];
globalThis.fetch = async (u, o) => {
  const url = String(u), body = o?.body ? JSON.parse(o.body) : {};
  if (url.includes('openrouter.ai/api/v1/models')) return new Response(JSON.stringify({ data: [] }));
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
