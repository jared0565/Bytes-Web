import Anthropic from '@anthropic-ai/sdk';

// Models offered in the dashboard's model picker. Prices are USD per 1M tokens (standard tier,
// short prompts) as published by each provider in October 2026 — update here when they change;
// the dashboard reads this list from GET /public/models.
export type Provider = 'anthropic' | 'openai' | 'google' | 'openrouter';
export type Effort = 'low' | 'medium' | 'high';

export interface ModelInfo {
	id: string;
	provider: Provider;
	name: string;
	inputPrice: number;
	outputPrice: number;
}

export const PROVIDER_NAMES: Record<Provider, string> = {
	anthropic: 'Anthropic',
	openai: 'OpenAI',
	google: 'Google',
	openrouter: 'OpenRouter',
};

export const MODEL_CATALOG: ModelInfo[] = [
	{ id: 'claude-opus-5-5', provider: 'anthropic', name: 'Claude Opus 5.5', inputPrice: 4.0, outputPrice: 20.0 },
	{ id: 'claude-sonnet-5-5', provider: 'anthropic', name: 'Claude Sonnet 5.5', inputPrice: 2.0, outputPrice: 10.0 },
	{ id: 'claude-haiku-5-5', provider: 'anthropic', name: 'Claude Haiku 5.5', inputPrice: 0.1, outputPrice: 0.5 },
	{ id: 'gpt-6-astra', provider: 'openai', name: 'GPT-6 Astra', inputPrice: 10.0, outputPrice: 50.0 },
	{ id: 'gpt-6.1-sol', provider: 'openai', name: 'GPT-6.1 Sol', inputPrice: 2.0, outputPrice: 10.0 },
	{ id: 'gpt-6-luna', provider: 'openai', name: 'GPT-6 Luna', inputPrice: 0.1, outputPrice: 0.5 },
	{ id: 'gemini-3.1-pro-preview', provider: 'google', name: 'Gemini 3.1 Pro (preview)', inputPrice: 2.0, outputPrice: 12.0 },
	{ id: 'gemini-2.5-pro', provider: 'google', name: 'Gemini 2.5 Pro', inputPrice: 1.25, outputPrice: 10.0 },
	{ id: 'gemini-2.5-flash', provider: 'google', name: 'Gemini 2.5 Flash', inputPrice: 0.3, outputPrice: 2.5 },
	{ id: 'gemini-2.5-flash-lite', provider: 'google', name: 'Gemini 2.5 Flash-Lite', inputPrice: 0.1, outputPrice: 0.4 },
];

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
	if (id.startsWith(OPENROUTER_PREFIX)) return isPremium((await openRouterModels(env)).find((m) => m.id === id));
	return isPremium(findModel(id));
}
export const EFFORTS: Effort[] = ['low', 'medium', 'high'];

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

export function findModel(id: unknown): ModelInfo | undefined {
	return MODEL_CATALOG.find((m) => m.id === id);
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

async function callAnthropic(env: LlmEnv, model: string, effort: Effort, system: string, contents: Turn[]): Promise<string> {
	const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
	// Opus/Sonnet 5.5 can decline on safety grounds; the server-side default fallback re-runs the turn
	// on another model instead of returning an empty refusal (not offered for Haiku 5.5).
	const withFallback = model !== 'claude-haiku-5-5';
	const response = await client.beta.messages.create({
		model,
		max_tokens: MAX_OUTPUT_TOKENS,
		system,
		messages: toChatTurns(contents),
		output_config: { effort },
		...(withFallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
	});
	if (response.stop_reason === 'refusal') throw new Error(`Anthropic refusal (${response.stop_details?.category ?? 'unknown'})`);
	const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('').trim();
	if (!text) throw new Error(`Anthropic returned no text (stop_reason: ${response.stop_reason})`);
	return text;
}

async function callOpenAI(env: LlmEnv, model: string, effort: Effort, system: string, contents: Turn[]): Promise<string> {
	const res = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model,
			messages: [{ role: 'system', content: system }, ...toChatTurns(contents)],
			reasoning_effort: effort,
			max_completion_tokens: MAX_OUTPUT_TOKENS,
		}),
	});
	const data = (await res.json().catch(() => ({}))) as any;
	if (!res.ok) throw new Error(`OpenAI ${res.status}: ${data?.error?.message || 'request failed'}`);
	const text = data?.choices?.[0]?.message?.content?.trim();
	if (!text) throw new Error('OpenAI returned no text');
	return text;
}

// Gemini 3.x takes a thinking level (low/medium/high); 2.5 takes a token budget (Pro can't go below 128)
function geminiThinking(model: string, effort: Effort) {
	if (model.startsWith('gemini-3')) return { thinkingLevel: effort };
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
	if (!res.ok) throw new Error(`Gemini ${res.status}: ${JSON.stringify(data)}`);
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
		if (!vendorNames.has(r.vendor)) vendorNames.set(r.vendor, name.includes(': ') ? name.split(': ')[0] : r.vendor);
		return {
			id: OPENROUTER_PREFIX + r.id,
			provider: 'openrouter' as const,
			name,
			inputPrice: Math.round(Number(r.m.pricing.prompt) * 1e6 * 1000) / 1000,
			outputPrice: Math.round(Number(r.m.pricing.completion) * 1e6 * 1000) / 1000,
			reasoning: (r.m.supported_parameters || []).includes('reasoning'),
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
			// Effort only for models that reason; exclude keeps the reasoning text out of the reply
			...(info?.reasoning ? { reasoning: { effort, exclude: true } } : {}),
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

	if (info.provider === 'anthropic') return { text: await callAnthropic(env, info.id, effort, system, contents), model: info.id };
	if (info.provider === 'openai') return { text: await callOpenAI(env, info.id, effort, system, contents), model: info.id };
	return { text: await callGemini(env, info.id, effort, system, contents), model: info.id };
}

// Catalog for the dashboard picker, with whether each provider has a key on this worker
export async function publicCatalog(env: LlmEnv) {
	// The picker gets the listed OpenRouter models only; the rest stay known to the server
	const routed = (await openRouterModels(env)).filter((m) => m.listed).map(({ listed, ...m }) => m);
	const models: ModelInfo[] = [...MODEL_CATALOG, ...routed];
	return {
		defaultModel: defaultModel(env) || FALLBACK_MODELS[0],
		efforts: EFFORTS,
		models: models.map((m) => ({ ...m, providerName: PROVIDER_NAMES[m.provider], available: providerAvailable(env, m.provider), premium: isPremium(m) })),
	};
}
