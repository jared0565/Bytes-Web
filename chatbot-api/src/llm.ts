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

export const DEFAULT_MODEL = 'gemini-2.5-flash';
// Premium models (output above $15 per 1M tokens) are reserved for the AI Plus bot mode
export const PREMIUM_OUTPUT_PRICE = 15;
export const isPremium = (m: { outputPrice: number } | undefined) => !!m && m.outputPrice > PREMIUM_OUTPUT_PRICE;
export async function modelIsPremium(id: unknown): Promise<boolean> {
	if (typeof id !== 'string' || !id) return false;
	if (id.startsWith(OPENROUTER_PREFIX)) return isPremium((await openRouterModels()).find((m) => m.id === id));
	return isPremium(findModel(id));
}
export const EFFORTS: Effort[] = ['low', 'medium', 'high'];

export interface LlmEnv {
	GEMINI_API_KEY?: string;
	ANTHROPIC_API_KEY?: string;
	OPENAI_API_KEY?: string;
	OPENROUTER_API_KEY?: string;
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
// /models endpoint (no key needed), cached per isolate for an hour. The picker shows the newest
// text model from each vendor below; ids are stored as "openrouter:<vendor>/<model>".
export const OPENROUTER_PREFIX = 'openrouter:';
const OPENROUTER_VENDORS = ['anthropic', 'openai', 'google', 'x-ai', 'deepseek', 'meta-llama', 'mistralai', 'qwen', 'moonshotai', 'z-ai'];
const OPENROUTER_SKIP = /(embed|image|audio|tts|guard|moderation|search|realtime|transcribe)/i;
const OPENROUTER_TTL_MS = 60 * 60 * 1000;

export interface OpenRouterModel extends ModelInfo {
	reasoning: boolean;
}

let orCache: { at: number; models: OpenRouterModel[] } | null = null;

export async function openRouterModels(): Promise<OpenRouterModel[]> {
	if (orCache && Date.now() - orCache.at < OPENROUTER_TTL_MS) return orCache.models;
	try {
		const res = await fetch('https://openrouter.ai/api/v1/models', { headers: { Accept: 'application/json' } });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = ((await res.json()) as any)?.data || [];
		const newest = new Map<string, any>();
		for (const m of data) {
			const id: string = m?.id || '';
			const vendor = id.split('/')[0];
			const prompt = Number(m?.pricing?.prompt), completion = Number(m?.pricing?.completion);
			const textOut = (m?.architecture?.output_modalities || ['text']).join() === 'text';
			if (!OPENROUTER_VENDORS.includes(vendor) || id.includes(':') || OPENROUTER_SKIP.test(id) || !textOut) continue;
			if (!(prompt > 0) || !(completion > 0)) continue; // skip free/variable-price routes
			if (!newest.has(vendor) || (m.created || 0) > (newest.get(vendor).created || 0)) newest.set(vendor, m);
		}
		const models = OPENROUTER_VENDORS.filter((v) => newest.has(v)).map((v) => {
			const m = newest.get(v);
			return {
				id: OPENROUTER_PREFIX + m.id,
				provider: 'openrouter' as const,
				name: String(m.name || m.id),
				inputPrice: Math.round(Number(m.pricing.prompt) * 1e6 * 1000) / 1000,
				outputPrice: Math.round(Number(m.pricing.completion) * 1e6 * 1000) / 1000,
				reasoning: (m.supported_parameters || []).includes('reasoning'),
			};
		});
		orCache = { at: Date.now(), models };
		return models;
	} catch (err: any) {
		console.error('[LLM] OpenRouter model list failed:', err?.message || err);
		return orCache?.models || [];
	}
}

async function callOpenRouter(env: LlmEnv, slug: string, effort: Effort, system: string, contents: Turn[]): Promise<string> {
	const info = (await openRouterModels()).find((m) => m.id === OPENROUTER_PREFIX + slug);
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
	const models: ModelInfo[] = [...MODEL_CATALOG, ...(await openRouterModels())];
	return {
		defaultModel: DEFAULT_MODEL,
		efforts: EFFORTS,
		models: models.map((m) => ({ ...m, providerName: PROVIDER_NAMES[m.provider], available: providerAvailable(env, m.provider), premium: isPremium(m) })),
	};
}
