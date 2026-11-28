// What the public model list says about a direct model's price: the day it was read, whether that is
// too long ago, an announced change, a long-prompt price, and a difference from OpenRouter's price.
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
console.error = () => {}; console.warn = () => {};

// A fixed clock: 28 November 2026, the day the table's prices were read
const START = Date.parse('2026-11-28T12:00:00Z'); let skew = 0; Date.now = () => START + skew;
const DAY = 86400e3;

const recent = Math.floor(START / 1000) - 30 * 86400;
const routed = (id, p, c) => ({ id, name: id, created: recent, pricing: { prompt: String(p / 1e6), completion: String(c / 1e6) }, supported_parameters: ['reasoning'], reasoning: { supported_efforts: ['high', 'medium', 'low'] } });
// OpenRouter agrees on Haiku 5.5 and lists Sonnet 5.5 dearer
const FEED = [routed('anthropic/claude-haiku-5.5', 0.1, 0.5), routed('anthropic/claude-sonnet-5.5', 3, 15), routed('x-ai/grok-4.7', 1, 2)];
globalThis.fetch = async (u) => {
  const url = String(u);
  if (url.includes('openrouter.ai/api/v1/models')) return new Response(JSON.stringify({ data: FEED }));
  return new Response('{}', { status: 500 }); // the suppliers' own lists are not under test: a failed read hides nothing
};
const kv = new Map();
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } };
const ALL = { GEMINI_API_KEY: 'test', OPENROUTER_API_KEY: 'test', ANTHROPIC_API_KEY: 'test', OPENAI_API_KEY: 'test', CLIENT_SETTINGS: KV };
const ctx = { waitUntil() {} };
const mod = await import('./bundle.mjs?pricenotes');
const catalog = async () => (await mod.default.fetch(new Request('https://ai.bytesfx.com/public/models'), ALL, ctx)).json();
let cat = await catalog();
const model = (id) => cat.models.find(x => x.id === id);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ─── The day a price was read ────────────────────────────────────────────────
const direct = () => cat.models.filter(x => x.provider !== 'openrouter');
ok('every direct model says when its price was read, and it is not old', direct().length === 16 && direct().every(x => x.priceRead === '2026-11-28' && x.priceStale === false), direct().filter(x => x.priceStale !== false).map(x => x.id).join());
ok('an OpenRouter model carries none of the price notes', ['priceRead', 'priceStale', 'priceChange', 'longPrompt', 'routedPrice'].every(k => !(k in model('openrouter:x-ai/grok-4.7'))), JSON.stringify(model('openrouter:x-ai/grok-4.7')));

// ─── An announced change ─────────────────────────────────────────────────────
ok('Gemini 4 Carbon shows its rise on 1 December, and that it becomes premium', same(model('gemini-4-carbon')?.priceChange, { from: '2026-12-01', inputPrice: 4, outputPrice: 20, premium: true }) && model('gemini-4-carbon').premium === false, JSON.stringify(model('gemini-4-carbon')?.priceChange));
ok('Gemini 3.8 Flash shows its rise on 1 January, and stays below premium', same(model('gemini-3.8-flash')?.priceChange, { from: '2027-01-01', inputPrice: 1.5, outputPrice: 7.5, premium: false }), JSON.stringify(model('gemini-3.8-flash')?.priceChange));
ok('a model with no announced change shows none', !('priceChange' in model('claude-haiku-5-5')) && !('priceChange' in model('gpt-6-luna')));

// ─── A long-prompt price ─────────────────────────────────────────────────────
ok('Claude Haiku 5.5 shows its price over 100,000 tokens', same(model('claude-haiku-5-5')?.longPrompt, { over: 100000, inputPrice: 0.5, outputPrice: 2.5 }), JSON.stringify(model('claude-haiku-5-5')?.longPrompt));
ok('the OpenAI models show their price over 272,000 tokens', same(model('gpt-6.2-sol')?.longPrompt, { over: 272000, inputPrice: 4, outputPrice: 15 }) && same(model('gpt-6-luna')?.longPrompt, { over: 272000, inputPrice: 0.2, outputPrice: 0.75 }) && same(model('gpt-6.2-astra')?.longPrompt, { over: 272000, inputPrice: 16, outputPrice: 60 }) && same(model('gpt-6.1-terra')?.longPrompt, { over: 272000, inputPrice: 2, outputPrice: 7.5 }), JSON.stringify(model('gpt-6.2-sol')?.longPrompt));
ok('Gemini 3.1 Pro shows its price over 200,000 tokens', same(model('gemini-3.1-pro-preview')?.longPrompt, { over: 200000, inputPrice: 4, outputPrice: 18 }), JSON.stringify(model('gemini-3.1-pro-preview')?.longPrompt));
ok('a model with one price shows no long-prompt price', !('longPrompt' in model('gemini-4-neon')) && !('longPrompt' in model('claude-sonnet-5-5')));

// ─── A difference from OpenRouter ────────────────────────────────────────────
ok('a model OpenRouter lists at another price shows that price', same(model('claude-sonnet-5-5')?.routedPrice, { inputPrice: 3, outputPrice: 15 }), JSON.stringify(model('claude-sonnet-5-5')?.routedPrice));
ok('a model OpenRouter lists at the same price, or not at all, shows none', !('routedPrice' in model('claude-haiku-5-5')) && !('routedPrice' in model('gpt-6-luna')));

// ─── Nothing the picker should not see ───────────────────────────────────────
ok('the table\'s own bookkeeping is not published', direct().every(x => !('superseded' in x) && !('retires' in x)) && (cat.fallbackModels || []).every(x => !('superseded' in x) && !('priceChange' in x)), JSON.stringify(direct().find(x => 'superseded' in x || 'retires' in x) || ''));

// ─── After the change, and as the price ages ─────────────────────────────────
skew = 4 * DAY; // 2 December
cat = await catalog();
ok('once the rise has happened the model shows the new price and no pending change', model('gemini-4-carbon')?.inputPrice === 4 && model('gemini-4-carbon').outputPrice === 20 && !('priceChange' in model('gemini-4-carbon')) && model('gemini-4-carbon').premium === true, JSON.stringify(model('gemini-4-carbon')));

skew = 90 * DAY - 13 * 3600e3; // just inside 90 days of the read date
cat = await catalog();
ok('a price read up to 90 days ago is not marked', direct().length > 0 && direct().every(x => x.priceStale === false), direct().filter(x => x.priceStale).map(x => x.id).join());
skew = 91 * DAY;
cat = await catalog();
ok('a price read more than 90 days ago is marked as not checked', direct().length > 0 && direct().every(x => x.priceStale === true), direct().filter(x => !x.priceStale).map(x => x.id).join());
