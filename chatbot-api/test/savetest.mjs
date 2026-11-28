// The test call made before a model choice is saved: one tiny real call to the exact model at the
// exact effort, with no fallback, reported as passed or with the supplier's own reason.
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
const logs = []; const realLog = console.log;
const capture = async (fn) => { console.log = (...a) => { logs.push(a); }; try { return await fn(); } finally { console.log = realLog; } };
console.error = () => {}; console.warn = () => {};

// The 20-second limit runs in 30 ms here
const realTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms, ...a) => realTimeout(fn, ms >= 20000 ? 30 : ms, ...a);

const recent = Math.floor(Date.now() / 1000) - 30 * 86400;
const routed = (id) => ({ id, name: id, created: recent, pricing: { prompt: '0.000001', completion: '0.000002' }, supported_parameters: ['reasoning'], reasoning: { supported_efforts: ['high', 'medium', 'low'] } });
const FEED = [routed('x-ai/grok-4.7'), routed('x-ai/grok-hang')];
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
let asked = [];
globalThis.fetch = async (u, o) => {
  const url = String(u), body = o?.body ? JSON.parse(o.body) : {};
  if (url.includes('openrouter.ai/api/v1/models')) return json({ data: FEED });
  if (/\/v1(beta)?\/models(\?|$)/.test(url)) return json({}, 500); // the suppliers' model lists are not under test
  if (url.includes('generativelanguage')) {
    const model = (url.match(/models\/([^:]+):/) || [])[1];
    asked.push({ api: 'google', model, body });
    if (model === 'gemini-4-neon') return json({ error: { code: 400, message: 'Invalid value at generation_config.thinking_config.thinking_level', status: 'INVALID_ARGUMENT' } }, 400);
    return json({ candidates: [{ content: { parts: [{ text: 'ready' }] } }] });
  }
  if (url.includes('api.anthropic.com')) {
    asked.push({ api: 'anthropic', model: body.model, body });
    if (body.model === 'claude-opus-5-5') return json({ type: 'error', error: { type: 'not_found_error', message: 'model: claude-opus-5-5' } }, 404);
    return json({ id: 'msg_1', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: 'ready' }], stop_reason: 'end_turn', usage: { input_tokens: 5, output_tokens: 1 } });
  }
  if (url.includes('openrouter.ai')) {
    asked.push({ api: 'openrouter', model: body.model, body });
    if (body.model === 'x-ai/grok-hang') return new Promise(() => {}); // never answers
    return json({ choices: [{ message: { content: 'ready' } }] });
  }
  asked.push({ api: 'openai', model: body.model, body });
  if (body.model === 'gpt-6.2-sol') return json({ error: { message: 'The model `gpt-6.2-sol` does not exist or you do not have access to it.' } }, 404);
  return json({ choices: [{ message: { content: 'ready' } }] });
};

const kv = new Map();
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } };
const ALL = { GEMINI_API_KEY: 'test', OPENROUTER_API_KEY: 'test', ANTHROPIC_API_KEY: 'test', OPENAI_API_KEY: 'test', CLIENT_SETTINGS: KV };
const mod = await import('./bundle.mjs?savetest');
const service = (env = ALL) => { const s = new mod.LlmService(); s.env = env; return s; };
const run = async (items, env = ALL) => { asked = []; return service(env).testModels(items); };

ok('the chat worker offers the test call to the CRM', typeof mod.LlmService.prototype.testModels === 'function');

let r = await capture(() => run([{ model: 'gpt-6-luna', effort: 'high' }]));
ok('a working model passes', r?.length === 1 && r[0].ok === true && r[0].model === 'gpt-6-luna' && r[0].effort === 'high' && typeof r[0].ms === 'number', JSON.stringify(r));
ok('it is called once, as itself, at the effort being saved', asked.length === 1 && asked[0].model === 'gpt-6-luna' && asked[0].body.reasoning_effort === 'high', JSON.stringify(asked.map(a => a.model)));
ok('the test prompt is tiny', JSON.stringify(asked[0]?.body?.messages || '').length < 300, String(JSON.stringify(asked[0]?.body?.messages || '').length));
const line = logs.map(a => a[0]).find(x => x && x.kind === 'model-test');
ok('the test is logged with the model, effort, result and time taken', !!line && line.model === 'gpt-6-luna' && line.effort === 'high' && line.ok === true && typeof line.ms === 'number', JSON.stringify(line));

r = await run([{ model: 'gpt-6.2-sol', effort: 'medium' }]);
ok('a model the supplier refuses fails with the supplier\'s own reason', r?.[0]?.ok === false && /does not exist/.test(r[0].error || '') && /OpenAI/.test(r[0].error || ''), JSON.stringify(r));
ok('no other model is tried in its place', asked.length === 1 && asked[0].model === 'gpt-6.2-sol', JSON.stringify(asked.map(a => a.model)));

r = await run([{ model: 'gemini-4-neon', effort: 'low' }]);
ok('a Google refusal is reported as its message, not as raw JSON', r?.[0]?.ok === false && /Invalid value at generation_config/.test(r[0].error || '') && !/[{}]/.test(r[0].error || ''), JSON.stringify(r));

r = await run([{ model: 'gpt-6-luna', effort: 'medium' }], { ...ALL, OPENAI_API_KEY: '' });
ok('a model with no key fails without a call', r?.[0]?.ok === false && /No API key is set for OpenAI/.test(r[0].error || '') && asked.length === 0, JSON.stringify(r));

r = await run([{ model: 'gpt-9-made-up', effort: 'medium' }]);
ok('a model the worker does not know fails without a call', r?.[0]?.ok === false && /not a model the chatbot server knows/.test(r[0].error || '') && asked.length === 0, JSON.stringify(r));
r = await run([{ model: '', effort: 'medium' }]);
ok('an empty model fails', r?.[0]?.ok === false && asked.length === 0, JSON.stringify(r));

r = await run([{ model: 'claude-sonnet-5-5', effort: 'low' }]);
ok('an Anthropic model is tested on Anthropic at its effort', r?.[0]?.ok === true && asked[0]?.api === 'anthropic' && asked[0].body.output_config?.effort === 'low', JSON.stringify([r, asked[0]?.body?.output_config]));

r = await run([{ model: 'claude-opus-5-5', effort: 'medium' }]);
ok('an Anthropic refusal is reported as its message, not as raw JSON', r?.[0]?.ok === false && /^Anthropic 404: model: claude-opus-5-5$/.test(r[0].error || ''), JSON.stringify(r));

r = await run([{ model: 'openrouter:x-ai/grok-4.7', effort: 'high' }]);
ok('an OpenRouter model is tested through OpenRouter at its effort', r?.[0]?.ok === true && asked[0]?.api === 'openrouter' && asked[0].model === 'x-ai/grok-4.7' && asked[0].body.reasoning?.effort === 'high', JSON.stringify([r, asked[0]?.body?.reasoning]));

r = await run([{ model: 'gemini-3.8-flash', fallback: true }, { model: 'gpt-6-luna', fallback: true }]);
const g = asked.find(a => a.api === 'google'), o = asked.find(a => a.api === 'openai');
ok('a fallback is tested the way a fallback is called: Google with no thinking setting, others at low effort', r?.length === 2 && r.every(x => x.ok) && g && !('thinkingConfig' in (g.body.generationConfig || {})) && o?.body.reasoning_effort === 'low', JSON.stringify([r, g?.body?.generationConfig, o?.body?.reasoning_effort]));

r = await run([{ model: 'openrouter:x-ai/grok-hang', effort: 'medium' }]);
ok('a model that does not answer in 20 seconds fails', r?.[0]?.ok === false && /20 seconds/.test(r[0].error || ''), JSON.stringify(r));

r = await run([{ model: 'gpt-6-luna', effort: 'low' }, { model: 'gpt-6.2-sol', effort: 'low' }, { model: 'claude-haiku-5-5', effort: 'medium' }]);
ok('several models come back in the order asked, one result each', r?.length === 3 && r.map(x => x.model).join() === 'gpt-6-luna,gpt-6.2-sol,claude-haiku-5-5' && r.map(x => x.ok).join() === 'true,false,true', JSON.stringify(r));

let threw = false;
try { await run(Array.from({ length: 9 }, () => ({ model: 'gpt-6-luna', effort: 'low' }))); } catch { threw = true; }
ok('more than 8 models in one request is refused, and none is called', threw && asked.length === 0, `${threw} ${asked.length}`);
threw = false;
try { await run('gpt-6-luna'); } catch { threw = true; }
ok('a request that is not a list is refused', threw);
