import Anthropic from '@anthropic-ai/sdk';

// Models called on their supplier's own API. The dashboard reads the list from GET /public/models.
export type Provider = 'anthropic' | 'openai' | 'google' | 'openrouter';
export type Effort = 'low' | 'medium' | 'high';

export interface ModelInfo {
	id: string;
	provider: Provider;
	name: string;
	inputPrice: number;
	outputPrice: number;
	efforts: Effort[]; // the levels the model accepts, of low, medium and high; empty when it has no effort setting
}
export const EFFORTS: Effort[] = ['low', 'medium', 'high'];

export const PROVIDER_NAMES: Record<Provider, string> = {
	anthropic: 'Anthropic',
	openai: 'OpenAI',
	google: 'Google',
	openrouter: 'OpenRouter',
};

// A direct model. Prices are USD per 1M tokens (standard tier, short prompts) from the supplier's own
// pricing page, read on `priceRead`. The table is kept by hand: a supplier's model list has no prices.
export interface DirectModel extends ModelInfo {
	priceRead: string; // the day the price was read
	retires?: string; // the supplier's shutdown date; left out of the picker from 30 days before it
	superseded?: boolean; // a newer model of its line is in the table: kept so a bot already on it still works
	priceChange?: { from: string; inputPrice: number; outputPrice: number }; // a price the supplier has announced
	longPrompt?: { over: number; inputPrice: number; outputPrice: number }; // the dearer price for a prompt over this many tokens
}
// Read on 28 November 2026 from platform.claude.com/docs/en/about-claude/pricing,
// developers.openai.com/api/docs/pricing, and ai.google.dev/gemini-api/docs/pricing and /deprecations.
// Effort: every model here accepts low, medium and high (Anthropic "Effort", OpenAI's model pages,
// Google "Thinking"). Left out on purpose: coding, open-weight, voice and image models.
const READ = '2026-11-28';
const row = (provider: Provider, id: string, name: string, inputPrice: number, outputPrice: number, extra: Partial<DirectModel> = {}): DirectModel =>
	({ id, provider, name, inputPrice, outputPrice, efforts: EFFORTS, priceRead: READ, ...extra });
// Long-prompt prices, from the same pages: Anthropic prices Haiku 5.5 higher over 100,000 tokens,
// OpenAI every model here over 272,000 ("long context"), Google the Pro models over 200,000.
const long = (over: number, inputPrice: number, outputPrice: number) => ({ longPrompt: { over, inputPrice, outputPrice } });
const OPENAI_LONG = 272000;
export const MODEL_CATALOG: DirectModel[] = [
	row('anthropic', 'claude-fable-5-2', 'Claude Fable 5.2', 8.0, 40.0),
	row('anthropic', 'claude-opus-5-5', 'Claude Opus 5.5', 4.0, 20.0),
	row('anthropic', 'claude-sonnet-5-5', 'Claude Sonnet 5.5', 2.0, 10.0),
	row('anthropic', 'claude-haiku-5-5', 'Claude Haiku 5.5', 0.1, 0.5, long(100000, 0.5, 2.5)),
	row('openai', 'gpt-6.2-astra', 'GPT-6.2 Astra', 8.0, 40.0, long(OPENAI_LONG, 16.0, 60.0)),
	row('openai', 'gpt-6.2-sol', 'GPT-6.2 Sol', 2.0, 10.0, long(OPENAI_LONG, 4.0, 15.0)),
	row('openai', 'gpt-6.1-terra', 'GPT-6.1 Terra', 1.0, 5.0, long(OPENAI_LONG, 2.0, 7.5)),
	row('openai', 'gpt-6-luna', 'GPT-6 Luna', 0.1, 0.5, long(OPENAI_LONG, 0.2, 0.75)),
	row('openai', 'gpt-6-astra', 'GPT-6 Astra', 10.0, 50.0, { superseded: true, ...long(OPENAI_LONG, 20.0, 75.0) }),
	row('openai', 'gpt-6.1-sol', 'GPT-6.1 Sol', 2.0, 10.0, { superseded: true, ...long(OPENAI_LONG, 4.0, 15.0) }),
	row('google', 'gemini-4-neon', 'Gemini 4 Neon', 3.0, 15.0),
	row('google', 'gemini-4-hydrogen', 'Gemini 4 Hydrogen', 1.5, 7.5),
	row('google', 'gemini-4-carbon', 'Gemini 4 Carbon', 2.0, 10.0, { priceChange: { from: '2026-12-01', inputPrice: 4.0, outputPrice: 20.0 } }),
	row('google', 'gemini-4-argon', 'Gemini 4 Argon', 2.0, 10.0, { priceChange: { from: '2026-12-01', inputPrice: 4.0, outputPrice: 20.0 } }),
	row('google', 'gemini-3.8-flash', 'Gemini 3.8 Flash', 0.75, 3.75, { priceChange: { from: '2027-01-01', inputPrice: 1.5, outputPrice: 7.5 } }),
	row('google', 'gemini-3.5-flash-lite', 'Gemini 3.5 Flash-Lite', 0.3, 2.5),
	row('google', 'gemini-3.1-pro-preview', 'Gemini 3.1 Pro (preview)', 2.0, 12.0, long(200000, 4.0, 18.0)),
	row('google', 'gemini-2.5-flash-lite', 'Gemini 2.5 Flash-Lite', 0.1, 0.4),
	// Google routes calls for these two to newer models from 1 December 2026
	row('google', 'gemini-2.5-pro', 'Gemini 2.5 Pro', 1.25, 10.0, { retires: '2026-12-01', ...long(200000, 2.5, 15.0) }),
	row('google', 'gemini-2.5-flash', 'Gemini 2.5 Flash', 0.3, 2.5, { retires: '2026-12-01' }),
];
// A model with the price in force on the day: an announced change applies from its date
const priced = (m: DirectModel, now: number): DirectModel =>
	m.priceChange && now >= Date.parse(m.priceChange.from) ? { ...m, inputPrice: m.priceChange.inputPrice, outputPrice: m.priceChange.outputPrice } : m;
const RETIRE_NOTICE_MS = 30 * 24 * 60 * 60 * 1000;
// Offered in the picker: not replaced by a newer model of its line, and not within 30 days of retiring
const offered = (m: DirectModel, now: number) => !m.superseded && !(m.retires && Date.parse(m.retires) - now < RETIRE_NOTICE_MS);

// Default chat model, for a bot with no model chosen: Claude Haiku 5.5. It runs on Anthropic's own
// API when that key is set, otherwise through OpenRouter. With neither key there is no default and
// replies go straight to the backup models.
const DEFAULT_DIRECT = 'claude-haiku-5-5';
const DEFAULT_ROUTED_SLUG = 'anthropic/claude-haiku-5.5';
export function defaultModel(env: LlmEnv): string {
	if (env.ANTHROPIC_API_KEY) return DEFAULT_DIRECT;
	if (env.OPENROUTER_API_KEY) return OPENROUTER_PREFIX + DEFAULT_ROUTED_SLUG;
	return '';
}
// Backup models, tried in this order when the chosen model fails. Both are called on Google's own API
// with no thinking setting. Google retires gemini-2.5-flash on 1 December 2026 and has shut down
// gemini-3.1-flash-lite-preview, the two that were here before. The last one has no shutdown date
// and is the model the lead reader already calls.
export const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-2.5-flash-lite'];
// Premium models (output above $15 per 1M tokens) are reserved for the AI Plus bot mode
export const PREMIUM_OUTPUT_PRICE = 15;
export const isPremium = (m: { outputPrice: number } | undefined) => !!m && m.outputPrice > PREMIUM_OUTPUT_PRICE;
export async function modelIsPremium(id: unknown, env?: LlmEnv): Promise<boolean> {
	if (typeof id !== 'string' || !id) return false;
	if (id.startsWith(OPENROUTER_PREFIX)) {
		// A model with no known price counts as premium: one OpenRouter does not list, or any model
		// while the list cannot be loaded. Letting it through would open premium models to every bot.
		const known = (await openRouterModels(env)).find((m) => m.id === id);
		return known ? isPremium(known) : true;
	}
	return isPremium(findModel(id)); // a direct model outside the catalog cannot be called at all
}

export interface LlmEnv {
	GEMINI_API_KEY?: string;
	ANTHROPIC_API_KEY?: string;
	OPENAI_API_KEY?: string;
	OPENROUTER_API_KEY?: string;
	// Holds the last good copy of OpenRouter's model list (key "cache:openrouter-models")
	CLIENT_SETTINGS?: { get(key: string): Promise<string | null>; put(key: string, value: string): Promise<unknown> };
}

export function providerAvailable(env: LlmEnv, provider: Provider): boolean {
	if (provider === 'anthropic') return !!env.ANTHROPIC_API_KEY;
	if (provider === 'openai') return !!env.OPENAI_API_KEY;
	if (provider === 'openrouter') return !!env.OPENROUTER_API_KEY;
	return !!env.GEMINI_API_KEY;
}

// Any model in the table, offered or not, at today's price
export function findModel(id: unknown, now = Date.now()): DirectModel | undefined {
	const m = MODEL_CATALOG.find((x) => x.id === id);
	return m && priced(m, now);
}

// Conversation turns in the widget's (Gemini) shape
export type Turn = { role: string; parts: { text: string }[] };

const turnText = (t: Turn) => (t.parts || []).map((p) => p.text).join('\n');

// Anthropic and OpenAI want user/assistant turns that alternate and open with the user
function toChatTurns(contents: Turn[]): { role: 'user' | 'assistant'; content: string }[] {
	const out: { role: 'user' | 'assistant'; content: string }[] = [];
	for (const t of contents) {
		const role = t.role === 'model' ? 'assistant' : 'user';
		const text = turnText(t);
		if (!text) continue;
		const last = out[out.length - 1];
		if (last && last.role === role) last.content += '\n\n' + text;
		else out.push({ role, content: text });
	}
	if (out[0]?.role === 'assistant') out.unshift({ role: 'user', content: '(Visitor opened the chat.)' });
	return out;
}

const MAX_OUTPUT_TOKENS = 4096;

async function callAnthropic(env: LlmEnv, model: string, effort: Effort | null, system: string, contents: Turn[]): Promise<string> {
	const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
	// Opus/Sonnet 5.5 can decline on safety grounds; the server-side default fallback re-runs the turn
	// on another model instead of returning an empty refusal (not offered for Haiku 5.5).
	const withFallback = model !== 'claude-haiku-5-5';
	const response = await client.beta.messages.create({
		model,
		max_tokens: MAX_OUTPUT_TOKENS,
		system,
		messages: toChatTurns(contents),
		...(effort ? { output_config: { effort } } : {}),
		...(withFallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
	});
	if (response.stop_reason === 'refusal') throw new Error(`Anthropic refusal (${response.stop_details?.category ?? 'unknown'})`);
	const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('').trim();
	if (!text) throw new Error(`Anthropic returned no text (stop_reason: ${response.stop_reason})`);
	return text;
}

async function callOpenAI(env: LlmEnv, model: string, effort: Effort | null, system: string, contents: Turn[]): Promise<string> {
	const res = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model,
			messages: [{ role: 'system', content: system }, ...toChatTurns(contents)],
			...(effort ? { reasoning_effort: effort } : {}),
			max_completion_tokens: MAX_OUTPUT_TOKENS,
		}),
	});
	const data = (await res.json().catch(() => ({}))) as any;
	if (!res.ok) throw new Error(`OpenAI ${res.status}: ${data?.error?.message || 'request failed'}`);
	const text = data?.choices?.[0]?.message?.content?.trim();
	if (!text) throw new Error('OpenAI returned no text');
	return text;
}

// Gemini 3.x and 4 take a thinking level (low/medium/high); 2.5 takes a token budget (Pro can't go below 128)
function geminiThinking(model: string, effort: Effort) {
	if (!model.startsWith('gemini-2.5')) return { thinkingLevel: effort };
	const isPro = model.includes('pro');
	const budget = { low: isPro ? 128 : 0, medium: 1024, high: 8192 }[effort];
	return { thinkingBudget: budget };
}

export async function callGemini(env: LlmEnv, model: string, effort: Effort | null, system: string, contents: Turn[]): Promise<string> {
	const generationConfig: Record<string, unknown> = { temperature: 0.7, maxOutputTokens: effort ? MAX_OUTPUT_TOKENS + 8192 : 2048 };
	if (effort) generationConfig.thinkingConfig = geminiThinking(model, effort);
	const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents, generationConfig }),
	});
	const data = (await res.json().catch(() => ({}))) as any;
	if (!res.ok) throw new Error(`Gemini ${res.status}: ${data?.error?.message || JSON.stringify(data)}`);
	const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('').trim();
	if (!text) throw new Error('Gemini returned no text');
	return text;
}

// ─── OpenRouter ──────────────────────────────────────────────────────────────
// Model ids and prices change too often to hardcode, so they come live from OpenRouter's public
// /models endpoint (no key needed), cached per isolate for an hour; ids are stored as
// "openrouter:<vendor>/<model>". The server keeps every priced model, for effort and the premium
// check of a model a bot already uses. The picker gets the `listed` ones: from the vendors below,
// the newest model of each line (claude-haiku, gpt-luna, gpt-luna-pro ...).
export const OPENROUTER_PREFIX = 'openrouter:';
const OPENROUTER_VENDORS = ['anthropic', 'openai', 'google', 'x-ai', 'deepseek', 'meta-llama', 'mistralai', 'qwen', 'moonshotai', 'z-ai'];
const OPENROUTER_SKIP = /(embed|image|audio|tts|guard|moderation|search|realtime|transcribe)/i;
const OPENROUTER_TTL_MS = 60 * 60 * 1000;
const OPENROUTER_RETRY_MS = 5 * 60 * 1000; // after a failed fetch
const OPENROUTER_STORE_KEY = 'cache:openrouter-models';
const DAY_MS = 24 * 60 * 60 * 1000;
const LINE_MAX_AGE_MS = 365 * DAY_MS; // a line with nothing newer than this is left out of the picker
const WITHDRAWAL_NOTICE_MS = 30 * DAY_MS; // a model with an end date this close is left out too

export interface OpenRouterModel extends ModelInfo {
	reasoning: boolean;
	vendorName: string;
	listed: boolean; // offered in the picker
}

// Splits "vendor/name" into its line and version: the name without its version number, snapshot
// tag and preview markers is the line, so claude-haiku-4.5 and claude-haiku-5.5 share one and
// gpt-6-luna-pro has its own. Sizes (70b, 16k) are part of the line. An alias is a name with no
// version or snapshot tag (qwen-plus) or one ending in "latest".
export function modelLine(id: string): { line: string; version: number[]; alias: boolean } {
	const [vendor, name = ''] = id.toLowerCase().split('/');
	const words: string[] = [];
	let version: number[] | null = null, tagged = false, latest = false;
	for (const t of name.split('-')) {
		let m: RegExpMatchArray | null;
		if (t === 'latest') { latest = true; continue; }
		if (/^(preview|exp|beta)$/.test(t)) continue;
		if (/^\d{4,}$/.test(t)) { tagged = true; continue; } // snapshot tag: 2512, 0905, 20260420
		if (/^\d+$/.test(t) && (version || tagged)) continue; // the rest of a version or date written with hyphens
		if (!version && (m = t.match(/^v?(\d+(?:\.\d+)*)$/))) { version = m[1].split('.').map(Number); continue; } // 5.5, v3
		if (!version && (m = t.match(/^(\d+(?:\.\d+)*)([ac-jln-su-z])$/))) { version = m[1].split('.').map(Number); words.push(m[2]); continue; } // 4o, 4.5v (not the sizes b, k, m, t)
		if (!version && (m = t.match(/^([a-z]+?)(\d+(?:\.\d+)*)$/))) { words.push(m[1]); version = m[2].split('.').map(Number); continue; } // qwen3.7, k3, o3
		words.push(t);
	}
	return { line: `${vendor}/${words.join('-')}`, version: version || [], alias: latest || (!version && !tagged) };
}

const versionOrder = (a: number[], b: number[]) => {
	for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; }
	return 0;
};
const flagged = new Set<string>(); // date/version disagreements already logged by this isolate

// The effort to send: the saved level when the model accepts it, otherwise none, so the model runs
// at its own default. Guessing the nearest level would change cost and speed without anyone choosing
// it. A list stored before levels were recorded falls back to its reasoning flag.
const skipped = new Set<string>();
function effortFor(m: { id: string; efforts?: Effort[]; reasoning?: boolean } | undefined, effort: Effort): Effort | null {
	if (!m) return null;
	const levels = m.efforts || (m.reasoning ? EFFORTS : []);
	if (levels.includes(effort)) return effort;
	if (levels.length && !skipped.has(`${m.id}|${effort}`)) {
		skipped.add(`${m.id}|${effort}`);
		console.warn(`[LLM] ${m.id} does not accept effort "${effort}" (it accepts ${levels.join(', ')}); none is sent`);
	}
	return null;
}

// Turns OpenRouter's feed into the server's list. `listed` marks the picker's models, which come
// first, in vendor order and newest first inside a vendor.
export function buildRouterList(data: any[], now: number): OpenRouterModel[] {
	type Row = { m: any; id: string; vendor: string; createdMs: number; line: string; version: number[]; alias: boolean };
	const rows: Row[] = [];
	for (const m of data) {
		const id: string = typeof m?.id === 'string' ? m.id : '';
		const prompt = Number(m?.pricing?.prompt), completion = Number(m?.pricing?.completion);
		if (!id.includes('/') || !(prompt >= 0) || !(completion >= 0)) continue; // no usable price: variable-price routes
		rows.push({ m, id, vendor: id.split('/')[0], createdMs: (Number(m.created) || 0) * 1000, ...modelLine(id) });
	}
	// The picker's candidates: priced text models from the chosen vendors, not about to be withdrawn
	const lines = new Map<string, Row[]>();
	for (const r of rows) {
		const { m, id } = r;
		const textOut = (m?.architecture?.output_modalities || ['text']).join() === 'text';
		if (!OPENROUTER_VENDORS.includes(r.vendor) || id.includes(':') || OPENROUTER_SKIP.test(id) || !textOut) continue;
		if (!(Number(m.pricing.prompt) > 0) || !(Number(m.pricing.completion) > 0)) continue; // free routes
		const ends = m.expiration_date ? Date.parse(m.expiration_date) : NaN;
		if (ends - now < WITHDRAWAL_NOTICE_MS) continue;
		lines.set(r.line, [...(lines.get(r.line) || []), r]);
	}
	const shown = new Set<Row>();
	for (const [line, all] of lines) {
		// An alias only stands when its line has no numbered model
		const pool = all.some((r) => !r.alias) ? all.filter((r) => !r.alias) : all;
		// Newest by OpenRouter's listing date. Version numbers alone mislead (grok-4.20 is older than
		// grok-4.7), so they only break a tie, and a disagreement is logged for a person to look at.
		const top = pool.reduce((a, b) => ((b.createdMs - a.createdMs || versionOrder(b.version, a.version)) > 0 ? b : a));
		const highest = pool.reduce((a, b) => (versionOrder(b.version, a.version) > 0 ? b : a));
		if (versionOrder(highest.version, top.version) > 0 && !flagged.has(`${top.id}|${highest.id}`)) {
			flagged.add(`${top.id}|${highest.id}`);
			console.warn(`[LLM] OpenRouter line ${line}: newest by listing date is ${top.id}, highest version is ${highest.id}`);
		}
		if (now - top.createdMs <= LINE_MAX_AGE_MS) shown.add(top);
	}
	// The default model stays in the picker whatever replaces it, so its name and price can be shown
	const pinned = rows.find((r) => r.id === DEFAULT_ROUTED_SLUG);
	if (pinned) shown.add(pinned);

	const vendorRank = (r: Row) => { const i = OPENROUTER_VENDORS.indexOf(r.vendor); return i < 0 ? OPENROUTER_VENDORS.length : i; };
	rows.sort((a, b) => Number(shown.has(b)) - Number(shown.has(a)) || vendorRank(a) - vendorRank(b) || b.createdMs - a.createdMs);
	const vendorNames = new Map<string, string>(); // one name per vendor: the one on its newest listed model
	return rows.map((r) => {
		const name = String(r.m.name || r.id);
		const reasoning = (r.m.supported_parameters || []).includes('reasoning');
		if (!vendorNames.has(r.vendor)) vendorNames.set(r.vendor, name.includes(': ') ? name.split(': ')[0] : r.vendor);
		return {
			id: OPENROUTER_PREFIX + r.id,
			provider: 'openrouter' as const,
			name,
			inputPrice: Math.round(Number(r.m.pricing.prompt) * 1e6 * 1000) / 1000,
			outputPrice: Math.round(Number(r.m.pricing.completion) * 1e6 * 1000) / 1000,
			reasoning,
			// A model that reasons only on or off has no supported_efforts and so no levels
			efforts: reasoning ? EFFORTS.filter((l) => (r.m.reasoning?.supported_efforts || []).includes(l)) : [],
			vendorName: vendorNames.get(r.vendor)!,
			listed: shown.has(r),
		};
	});
}

let orCache: { until: number; models: OpenRouterModel[] } | null = null;

// Every priced OpenRouter model, the picker's ones first. A failed or empty fetch keeps the last
// good list: this isolate's, or the copy stored in KV when the isolate is new. An empty answer is
// never read as every model having been withdrawn.
export async function openRouterModels(env?: LlmEnv): Promise<OpenRouterModel[]> {
	const now = Date.now();
	if (orCache && now < orCache.until) return orCache.models;
	try {
		const res = await fetch('https://openrouter.ai/api/v1/models', { headers: { Accept: 'application/json' } });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = ((await res.json()) as any)?.data;
		const models = buildRouterList(Array.isArray(data) ? data : [], now);
		if (!models.some((m) => m.listed)) throw new Error('the list came back empty');
		orCache = { until: now + OPENROUTER_TTL_MS, models };
		try { await env?.CLIENT_SETTINGS?.put(OPENROUTER_STORE_KEY, JSON.stringify({ at: now, models })); } catch (e: any) { console.error('[LLM] OpenRouter model list not stored:', e?.message || e); }
		return models;
	} catch (err: any) {
		console.error('[LLM] OpenRouter model list failed, keeping the last good one:', err?.message || err);
		let models = orCache?.models;
		if (!models?.length) {
			try { const stored = JSON.parse((await env?.CLIENT_SETTINGS?.get(OPENROUTER_STORE_KEY)) || 'null'); if (Array.isArray(stored?.models)) models = stored.models; } catch { /* no stored copy */ }
		}
		orCache = { until: now + OPENROUTER_RETRY_MS, models: models || [] };
		return orCache.models;
	}
}

async function callOpenRouter(env: LlmEnv, slug: string, effort: Effort, system: string, contents: Turn[]): Promise<string> {
	const info = (await openRouterModels(env)).find((m) => m.id === OPENROUTER_PREFIX + slug);
	const sendEffort = effortFor(info, effort);
	const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
			'Content-Type': 'application/json',
			'HTTP-Referer': 'https://web.bytesfx.com', // OpenRouter app attribution
			'X-Title': 'BytesFX Chatbot',
		},
		body: JSON.stringify({
			model: slug,
			messages: [{ role: 'system', content: system }, ...toChatTurns(contents)],
			max_tokens: MAX_OUTPUT_TOKENS,
			// Effort only at a level the model accepts; exclude keeps the reasoning text out of the reply
			...(sendEffort ? { reasoning: { effort: sendEffort, exclude: true } } : {}),
		}),
	});
	const data = (await res.json().catch(() => ({}))) as any;
	if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${data?.error?.message || 'request failed'}`);
	const text = data?.choices?.[0]?.message?.content?.trim();
	if (!text) throw new Error('OpenRouter returned no text');
	return text;
}

// Runs the client's chosen model. Throws when it isn't usable so the caller can fall back.
export async function callChosenModel(env: LlmEnv, modelId: unknown, effortIn: unknown, system: string, contents: Turn[]): Promise<{ text: string; model: string }> {
	const effort: Effort = EFFORTS.includes(effortIn as Effort) ? (effortIn as Effort) : 'medium';
	if (typeof modelId === 'string' && modelId.startsWith(OPENROUTER_PREFIX)) {
		const slug = modelId.slice(OPENROUTER_PREFIX.length);
		if (!/^[\w.-]+\/[\w.:-]+$/.test(slug)) throw new Error(`Invalid OpenRouter model: ${slug}`);
		if (!env.OPENROUTER_API_KEY) throw new Error('No API key configured for OpenRouter');
		return { text: await callOpenRouter(env, slug, effort, system, contents), model: modelId };
	}
	const info = findModel(modelId);
	if (!info) throw new Error(`Unknown model: ${String(modelId)}`);
	if (!providerAvailable(env, info.provider)) throw new Error(`No API key configured for ${PROVIDER_NAMES[info.provider]}`);

	const sendEffort = effortFor(info, effort);
	if (info.provider === 'anthropic') return { text: await callAnthropic(env, info.id, sendEffort, system, contents), model: info.id };
	if (info.provider === 'openai') return { text: await callOpenAI(env, info.id, sendEffort, system, contents), model: info.id };
	return { text: await callGemini(env, info.id, sendEffort, system, contents), model: info.id };
}

// ─── Platform choices ────────────────────────────────────────────────────────
// An admin sets four models for the whole platform in the dashboard; crm-api stores them in KV
// under "platform:models" after checkPlatformModels has passed them. An empty choice, a missing
// entry or one that cannot be used leaves the built-in model in place.
export interface PlatformModels { chatDefault: string; chatFallback: string; emailDefault: string; emailFallback: string }
const PLATFORM_KEY = 'platform:models';
const PLATFORM_FIELDS = ['chatDefault', 'chatFallback', 'emailDefault', 'emailFallback'] as const;
const PLATFORM_TTL_MS = 60 * 1000;
const NO_CHOICES: PlatformModels = { chatDefault: '', chatFallback: '', emailDefault: '', emailFallback: '' };
const LAST_RESORT = FALLBACK_MODELS[FALLBACK_MODELS.length - 1]; // always the final backup, whatever is chosen
const EMAIL_DEFAULT_DIRECT = 'gpt-6-luna';

let platformCache: { until: number; value: PlatformModels } | null = null;
export async function platformModels(env: LlmEnv): Promise<PlatformModels> {
	const now = Date.now();
	if (platformCache && now < platformCache.until) return platformCache.value;
	let value = NO_CHOICES;
	try {
		const stored = JSON.parse((await env.CLIENT_SETTINGS?.get(PLATFORM_KEY)) || 'null');
		if (stored && typeof stored === 'object') value = Object.fromEntries(PLATFORM_FIELDS.map((f) => [f, typeof stored[f] === 'string' ? stored[f] : ''])) as unknown as PlatformModels;
	} catch (e: any) { console.error('[LLM] Platform model choices could not be read, using the built-in models:', e?.message || e); }
	platformCache = { until: now + PLATFORM_TTL_MS, value };
	return value;
}

// Models that may serve as a fallback: the offered direct models that are not premium (a fallback
// answers every bot). Each is called on its supplier's own API, so a fallback does not share
// OpenRouter's failures.
export function fallbackChoices(env: LlmEnv, now = Date.now()) {
	return MODEL_CATALOG.filter((m) => offered(m, now)).map((m) => priced(m, now)).filter((m) => !isPremium(m))
		.map(({ priceChange, superseded, retires, ...m }) => ({ ...m, providerName: PROVIDER_NAMES[m.provider], available: providerAvailable(env, m.provider) }));
}

// ─── The suppliers' own model lists ──────────────────────────────────────────
// Where a supplier's key is set, its model list is read hourly and a table model it no longer lists
// leaves the picker. A failed or empty read keeps the last good list (this isolate's, or the copy in
// KV), and a list naming none of a supplier's table models is not trusted: ids may have changed shape.
type SupplierIds = Partial<Record<Provider, string[]>>;
const SUPPLIER_STORE_KEY = 'cache:supplier-models';
const SUPPLIERS: Provider[] = ['anthropic', 'openai', 'google'];
let supplierCache: { until: number; ids: SupplierIds } | null = null;
const distrusted = new Set<string>();

async function readSupplierList(env: LlmEnv, provider: Provider): Promise<string[]> {
	let res: Response;
	if (provider === 'anthropic') res = await fetch('https://api.anthropic.com/v1/models?limit=1000', { headers: { 'x-api-key': env.ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01' } });
	else if (provider === 'openai') res = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` } });
	else res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${env.GEMINI_API_KEY}`);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const data = (await res.json()) as any;
	const ids: string[] = provider === 'google'
		? (data?.models || []).map((m: any) => String(m?.name || '').replace(/^models\//, ''))
		: (data?.data || []).map((m: any) => String(m?.id || ''));
	const clean = ids.filter(Boolean);
	if (!clean.length) throw new Error('the list came back empty');
	return clean;
}

async function supplierModelIds(env: LlmEnv): Promise<SupplierIds> {
	const now = Date.now();
	if (supplierCache && now < supplierCache.until) return supplierCache.ids;
	let last: SupplierIds = supplierCache?.ids || {};
	if (!supplierCache) {
		try { const stored = JSON.parse((await env.CLIENT_SETTINGS?.get(SUPPLIER_STORE_KEY)) || 'null'); if (stored?.ids && typeof stored.ids === 'object') last = stored.ids; } catch { /* no stored copy */ }
	}
	const ids: SupplierIds = { ...last };
	let failed = false, read = false;
	await Promise.all(SUPPLIERS.filter((sup) => providerAvailable(env, sup)).map(async (sup) => {
		try { ids[sup] = await readSupplierList(env, sup); read = true; }
		catch (err: any) { failed = true; console.error(`[LLM] ${PROVIDER_NAMES[sup]} model list failed, keeping the last good one:`, err?.message || err); }
	}));
	supplierCache = { until: now + (failed ? OPENROUTER_RETRY_MS : OPENROUTER_TTL_MS), ids };
	if (read) { try { await env.CLIENT_SETTINGS?.put(SUPPLIER_STORE_KEY, JSON.stringify({ at: now, ids })); } catch (e: any) { console.error('[LLM] Supplier model lists not stored:', e?.message || e); } }
	return ids;
}

// The direct models for the picker: offered by the table rules and still on the supplier's own list.
// A supplier may list a dated id (claude-haiku-5-5-20261007) for a table id.
export async function listedDirectModels(env: LlmEnv, now = Date.now()): Promise<DirectModel[]> {
	const lists = await supplierModelIds(env);
	const onList = (m: DirectModel) => (lists[m.provider] || []).some((id) => id === m.id || id.startsWith(m.id + '-'));
	const candidates = MODEL_CATALOG.filter((m) => offered(m, now));
	return candidates.filter((m) => {
		const list = providerAvailable(env, m.provider) ? lists[m.provider] : undefined;
		if (!list?.length || onList(m)) return true;
		const anyKnown = candidates.some((x) => x.provider === m.provider && onList(x));
		if (!anyKnown) {
			if (!distrusted.has(m.provider)) { distrusted.add(m.provider); console.warn(`[LLM] ${PROVIDER_NAMES[m.provider]}'s model list names none of the table's models; it is ignored`); }
			return true;
		}
		return false;
	}).map((m) => priced(m, now));
}

// A direct model's price is cross-checked against OpenRouter's for the same model; a difference is
// logged once and returned, so the picker can show OpenRouter's price beside the table's
const priceFlags = new Set<string>();
type Price = { inputPrice: number; outputPrice: number };
function crossCheckPrices(direct: DirectModel[], routed: OpenRouterModel[]): Map<string, Price> {
	const differs = new Map<string, Price>();
	for (const m of direct) {
		const slug = `${m.provider}/${m.provider === 'anthropic' ? m.id.replace(/-(\d+)-(\d+)$/, '-$1.$2') : m.id}`;
		const r = routed.find((x) => x.id === OPENROUTER_PREFIX + slug);
		if (!r || (r.inputPrice === m.inputPrice && r.outputPrice === m.outputPrice)) continue;
		differs.set(m.id, { inputPrice: r.inputPrice, outputPrice: r.outputPrice });
		const key = `${m.id}|${r.inputPrice}|${r.outputPrice}`;
		if (priceFlags.has(key)) continue;
		priceFlags.add(key);
		console.warn(`[LLM] Price check: ${m.id} is $${m.inputPrice} in / $${m.outputPrice} out in the table (read ${m.priceRead}), OpenRouter lists $${r.inputPrice} / $${r.outputPrice}`);
	}
	return differs;
}

// A direct price is read by hand. Past this age the picker marks it as not checked.
const PRICE_STALE_MS = 90 * 24 * 60 * 60 * 1000;
// A direct model as the picker gets it: the price in force, when it was read and whether that is too
// long ago, a change the supplier has announced and not yet made, a long-prompt price, and
// OpenRouter's price where it differs
function withPriceNotes(m: DirectModel, now: number, routedPrice?: Price) {
	const { priceChange, superseded, retires, ...rest } = m;
	const pending = priceChange && now < Date.parse(priceChange.from) ? priceChange : undefined;
	return {
		...rest,
		priceStale: now - Date.parse(m.priceRead) > PRICE_STALE_MS,
		...(pending ? { priceChange: { ...pending, premium: isPremium({ outputPrice: pending.outputPrice }) } } : {}),
		...(routedPrice ? { routedPrice } : {}),
	};
}

const usableFallback = (env: LlmEnv, id: string) => fallbackChoices(env).some((m) => m.id === id && m.available);

// The chat default: the admin's choice unless it is premium (it answers bots that are not on AI Plus)
export async function chatDefaultModel(env: LlmEnv): Promise<string> {
	const chosen = (await platformModels(env)).chatDefault;
	if (chosen && !(await modelIsPremium(chosen, env))) return chosen;
	return defaultModel(env);
}
// The email default: the admin's choice, else GPT-6 Luna directly with an OpenAI key or through OpenRouter
export async function emailDefaultModel(env: LlmEnv): Promise<string> {
	const chosen = (await platformModels(env)).emailDefault;
	if (chosen) return chosen;
	return env.OPENAI_API_KEY ? EMAIL_DEFAULT_DIRECT : env.OPENROUTER_API_KEY ? `${OPENROUTER_PREFIX}openai/${EMAIL_DEFAULT_DIRECT}` : FALLBACK_MODELS[0];
}
// The backups for chat or email, in order: the chosen fallback and then the last resort, or the built-in pair
export async function fallbackChain(env: LlmEnv, kind: 'chat' | 'email'): Promise<string[]> {
	const p = await platformModels(env);
	const chosen = kind === 'chat' ? p.chatFallback : p.emailFallback;
	if (!chosen || !usableFallback(env, chosen)) return FALLBACK_MODELS;
	return chosen === LAST_RESORT ? [LAST_RESORT] : [chosen, LAST_RESORT];
}
// The model that reads a lead's details out of a chat: the chosen chat fallback, else the last resort
export async function leadReaderModel(env: LlmEnv): Promise<string> {
	const chosen = (await platformModels(env)).chatFallback;
	return chosen && usableFallback(env, chosen) ? chosen : LAST_RESORT;
}
export const isGoogleModel = (id: string) => id.startsWith('gemini-');
// Calls a backup: a Google model with no thinking setting, as before; another supplier's at low effort
export async function callFallback(env: LlmEnv, model: string, system: string, contents: Turn[]): Promise<string> {
	if (isGoogleModel(model)) return callGemini(env, model, null, system, contents);
	return (await callChosenModel(env, model, 'low', system, contents)).text;
}

// ─── The test call before a model is saved ───────────────────────────────────
// crm-api asks for this when a save changes a model or its effort. Each model is called once, as
// itself, at the effort being saved, with a one-line prompt and a 20-second limit. No backup is
// tried: the point is to learn whether this exact choice works. A fallback is called the way a
// fallback is called (callFallback).
export interface ModelTestResult { model: string; effort: string; ok: boolean; ms: number; error?: string }
export const MAX_MODEL_TESTS = 8;
const TEST_LIMIT_MS = 20 * 1000;
const TEST_SYSTEM = 'This is a connection test. Reply with the single word: ready';
const TEST_TURNS: Turn[] = [{ role: 'user', parts: [{ text: 'Say ready.' }] }];

// The reason shown in the dashboard: the supplier's own message where there is one
function testFailureReason(err: any): string {
	const msg = String(err?.message || err || 'The call failed.');
	const key = msg.match(/^No API key configured for (.+)$/);
	if (key) return `No API key is set for ${key[1]}.`;
	if (/^(Unknown model|Invalid OpenRouter model): /.test(msg)) return 'It is not a model the chatbot server knows.';
	// The Anthropic SDK's error carries the response body; its message is that body as JSON
	const inner = err?.error?.error?.message || err?.error?.message;
	if (typeof inner === 'string' && inner && typeof err?.status === 'number') return `Anthropic ${err.status}: ${inner}`.slice(0, 300);
	return msg.replace(/\s+/g, ' ').slice(0, 300);
}

export async function testModel(env: LlmEnv, item: unknown): Promise<ModelTestResult> {
	const src = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
	const model = typeof src.model === 'string' ? src.model : '';
	const fallback = src.fallback === true;
	const effort: Effort = EFFORTS.includes(src.effort as Effort) ? (src.effort as Effort) : 'medium';
	const sent = fallback ? (isGoogleModel(model) ? 'none' : 'low') : effort;
	const started = Date.now();
	let timer: ReturnType<typeof setTimeout> | undefined;
	let error = '';
	try {
		if (!model) throw new Error('No model was given.');
		if (fallback) {
			// callFallback calls a Google model without looking it up, so the lookups are made here
			const info = findModel(model);
			if (!info) throw new Error(`Unknown model: ${model}`);
			if (!providerAvailable(env, info.provider)) throw new Error(`No API key configured for ${PROVIDER_NAMES[info.provider]}`);
		}
		const call: Promise<unknown> = fallback ? callFallback(env, model, TEST_SYSTEM, TEST_TURNS) : callChosenModel(env, model, effort, TEST_SYSTEM, TEST_TURNS);
		call.catch(() => {}); // a failure after the limit has already been reported as a timeout
		await Promise.race([call, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('It did not answer within 20 seconds.')), TEST_LIMIT_MS); })]);
	} catch (err: any) {
		error = testFailureReason(err);
	} finally {
		if (timer) clearTimeout(timer);
	}
	const result: ModelTestResult = { model, effort: sent, ok: !error, ms: Date.now() - started, ...(error ? { error } : {}) };
	console.log({ kind: 'model-test', ...result, ...(fallback ? { fallback: true } : {}) });
	return result;
}

// Checks a set of choices before crm-api stores it. '' means "use the built-in model".
export async function checkPlatformModels(env: LlmEnv, input: unknown): Promise<{ ok: true; value: PlatformModels } | { ok: false; error: string }> {
	const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
	const value = { ...NO_CHOICES };
	for (const f of PLATFORM_FIELDS) {
		if (src[f] === undefined || src[f] === null) continue;
		if (typeof src[f] !== 'string' || (src[f] as string).length > 120) return { ok: false, error: 'Each choice must be a model from the list.' };
		value[f] = src[f] as string;
	}
	const routed = await openRouterModels(env);
	const labels = { chatDefault: 'chat default', emailDefault: 'email default', chatFallback: 'chat fallback', emailFallback: 'email fallback' };
	for (const f of ['chatDefault', 'emailDefault'] as const) {
		const id = value[f];
		if (!id) continue;
		const table = findModel(id);
		const m: ModelInfo | undefined = id.startsWith(OPENROUTER_PREFIX) ? routed.find((x) => x.id === id && x.listed) : table && offered(table, Date.now()) ? table : undefined;
		if (!m) return { ok: false, error: `The ${labels[f]} is not in the model list.` };
		if (!providerAvailable(env, m.provider)) return { ok: false, error: `The ${labels[f]} needs a ${PROVIDER_NAMES[m.provider]} API key, and none is set.` };
		if (f === 'chatDefault' && isPremium(m)) return { ok: false, error: 'The chat default cannot be a premium model: it also answers bots that are not on AI Plus.' };
	}
	for (const f of ['chatFallback', 'emailFallback'] as const) {
		const id = value[f];
		if (!id) continue;
		const m = fallbackChoices(env).find((x) => x.id === id);
		if (!m) return { ok: false, error: `The ${labels[f]} must be a direct supplier model from the fallback list.` };
		if (!m.available) return { ok: false, error: `The ${labels[f]} needs a ${m.providerName} API key, and none is set.` };
	}
	return { ok: true, value };
}

// Catalog for the dashboard picker, with whether each provider has a key on this worker
export async function publicCatalog(env: LlmEnv) {
	// The picker gets the listed OpenRouter models only; the rest stay known to the server
	const all = await openRouterModels(env);
	const routed = all.filter((m) => m.listed).map(({ listed, ...m }) => m);
	const now = Date.now();
	const directNow = await listedDirectModels(env, now);
	const differs = crossCheckPrices(directNow, all);
	const direct = directNow.map((m) => withPriceNotes(m, now, differs.get(m.id)));
	const models: ModelInfo[] = [...direct, ...routed];
	return {
		defaultModel: (await chatDefaultModel(env)) || FALLBACK_MODELS[0],
		emailDefaultModel: await emailDefaultModel(env),
		chatFallbackModel: (await fallbackChain(env, 'chat'))[0],
		emailFallbackModel: (await fallbackChain(env, 'email'))[0],
		fallbackModels: fallbackChoices(env),
		efforts: EFFORTS,
		models: models.map((m) => ({ ...m, providerName: PROVIDER_NAMES[m.provider], available: providerAvailable(env, m.provider), premium: isPremium(m) })),
	};
}
