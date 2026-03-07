export interface Env {
	GEMINI_API_KEY: string;
	ADMIN_API_KEY: string;
	DB: D1Database;
	CLIENT_SETTINGS: KVNamespace;
}

const SYSTEM_PROMPT = `
Persona & Role:
You are the Lead Strategist at BytesFX (acting as a Growth Orchestrator). Your objective is to maximize client ROI by matching their business pain points to our premium services. You do not just give answers; you qualify leads in real-time.

Lead Capture Protocol:
1. Greet the visitor and ask for their first name using this exact phrase: "Before we proceed, can I have your first name?". If they start with a specific service request, acknowledge it briefly first before asking for the name.
2. Once you have their name, ask for an email address to send them a personalized growth plan.
3. Once you have their email, ask which service they are interested in (ENTRY, BUILD, AUTOMATE, AMPLIFY, or SCALE).
4. Once they select a service, ask for their estimated budget for the project.
5. If they refuse to provide an email after 2 attempts, or once budget is provided, pivot to the LinkedIn closing.
6. If you suggest LinkedIn, you MUST include the [LINKEDIN_BUTTON] token.

Conversational Strategy:
- Be helpful and consultative. If a user asks a technical or business question, answer it intelligently to demonstrate our expertise before pushing for lead capture.
- Sequential Discovery: Ask ONE qualifying question at a time.
- Contextual Upselling: Match services to their specific stage (Entry, Build, Automate, Amplify, Scale).

Service Hierarchy (BytesFX Scale Method):
1. ENTRY - Short VSL (£150)
2. BUILD - Modern Website (£1,500+)
3. AUTOMATE - AI Chatbot Development (£500+)
4. AMPLIFY - LinkedIn Services (£1,200/mo)
5. SCALE - Custom Software (£5,000+)

Consultative Rules:
1. Value-first: Frame features as financial returns.
2. Conciseness: Be extremely concise.
3. Sentence Limit: NEVER write more than 4 short sentences per response. 
4. No flowery language or metaphorical jargon.
5. Address the user by name once they've shared it.

LinkedIn Closing:
If the visitor is qualified (named a service, described a problem, asked about pricing), close with:
"Based on what you've shared, this sounds like a strong fit. The fastest way to get a personalised plan is to send us a direct message on LinkedIn. [LINKEDIN_BUTTON]"
`;

const getCorsHeaders = (origin: string | null) => {
	const allowedOrigins = ['https://web.bytesfx.com', 'http://localhost:5173', 'http://127.0.0.1:5173'];
	const currentOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
	return {
		'Access-Control-Allow-Origin': currentOrigin,
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
		'Vary': 'Origin'
	};
};

// Simple in-memory rate limiter
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;
const ipRequests = new Map<string, { count: number, resetTime: number }>();

function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const record = ipRequests.get(ip);
	if (!record) {
		ipRequests.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
		return false;
	}
	if (now > record.resetTime) {
		ipRequests.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
		return false;
	}
	record.count++;
	return record.count > MAX_REQUESTS_PER_WINDOW;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const origin = request.headers.get('Origin');
		const cors = getCorsHeaders(origin);

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: cors });
		}

		const url = new URL(request.url);

		// --- Administrative Routes (Protected) ---
		if (url.pathname.startsWith('/api/')) {
			const allowedOrigin = "https://web.bytesfx.com";

			// Strictly enforce Origin for Admin Dashboard
			if (origin && origin !== allowedOrigin && !url.hostname.includes('localhost')) {
				return new Response(JSON.stringify({ error: `Forbidden: Invalid Origin (${origin})` }), {
					status: 403,
					headers: { ...cors, 'Content-Type': 'application/json' }
				});
			}

			const adminKey = request.headers.get('x-admin-key');
			const storedKey = env.ADMIN_API_KEY ? env.ADMIN_API_KEY.trim() : null;

			if (!storedKey || adminKey !== storedKey) {
				return new Response(JSON.stringify({ error: 'Unauthorised: Invalid Key' }), {
					status: 401,
					headers: { ...cors, 'Content-Type': 'application/json' }
				});
			}

			// GET /api/leads - Fetch all leads
			if (url.pathname === '/api/leads' && request.method === 'GET') {
				try {
					const { results } = await env.DB.prepare(
						"SELECT * FROM leads ORDER BY timestamp DESC LIMIT 100"
					).all();
					return new Response(JSON.stringify(results), {
						headers: { ...cors, 'Content-Type': 'application/json' }
					});
				} catch (e: any) {
					return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
				}
			}

			// GET /api/logs - Fetch chat logs
			if (url.pathname === '/api/logs' && request.method === 'GET') {
				try {
					const { results } = await env.DB.prepare(
						"SELECT * FROM chat_logs ORDER BY timestamp DESC LIMIT 200"
					).all();
					return new Response(JSON.stringify(results), {
						headers: { ...cors, 'Content-Type': 'application/json' }
					});
				} catch (e: any) {
					return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
				}
			}

			// POST /api/config - Update client settings
			if (url.pathname === '/api/config' && request.method === 'POST') {
				try {
					const configBody = await request.json() as { clientId: string, settings: any };
					if (!configBody.clientId || !configBody.settings) {
						return new Response(JSON.stringify({ error: 'Missing clientId or settings' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
					}
					await env.CLIENT_SETTINGS.put(`client:${configBody.clientId}`, JSON.stringify(configBody.settings));
					return new Response(JSON.stringify({ success: true }), {
						headers: { ...cors, 'Content-Type': 'application/json' }
					});
				} catch (e: any) {
					return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
				}
			}

			return new Response('Not Found', { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });
		}

		// --- Bot Interaction Routes ---
		if (request.method !== 'POST') {
			return new Response('Only POST requests are allowed', { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });
		}

		const body = await request.json() as {
			message: string,
			history?: { role: string, parts: { text: string }[] }[],
			clientId?: string
		};

		const clientId = body.clientId || 'default';

		// 1. Fetch Client Configuration from KV
		let clientConfig: { systemPrompt?: string } | null = null;
		try {
			const kvData = await env.CLIENT_SETTINGS.get(`client:${clientId}`);
			if (kvData) {
				clientConfig = JSON.parse(kvData);
			}
		} catch (e) {
			console.error("KV Error:", e);
		}

		const activeSystemPrompt = clientConfig?.systemPrompt || SYSTEM_PROMPT;

		if (!env.GEMINI_API_KEY) {
			return new Response(JSON.stringify({ error: 'API key not configured on server' }), {
				status: 500,
				headers: { ...cors, 'Content-Type': 'application/json' }
			});
		}

		const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
		if (isRateLimited(clientIP)) {
			return new Response(JSON.stringify({ response: "I've been processing a lot of requests lately! To ensure you get the best strategy, let's move this to a more direct channel. Feel free to send me a DM on LinkedIn so we can chat further. [LINKEDIN_BUTTON]" }), {
				status: 200,
				headers: { ...cors, 'Content-Type': 'application/json' }
			});
		}

		try {
			// body already parsed above for clientId

			if (!body || !body.message) {
				return new Response(JSON.stringify({ error: 'Message is required' }), {
					status: 400,
					headers: { ...cors, 'Content-Type': 'application/json' }
				});
			}

			// Build conversation contents for the Gemini API
			const contents: { role: string, parts: { text: string }[] }[] = [];

			// Add existing chat history if provided
			if (body.history && Array.isArray(body.history) && body.history.length > 0) {
				for (const entry of body.history) {
					contents.push({
						role: entry.role === 'model' ? 'model' : 'user',
						parts: entry.parts
					});
				}
			}

			// Add the new user message
			contents.push({ role: 'user', parts: [{ text: body.message }] });

			// --- AI Cutoff Check ---
			// If LinkedIn was suggested in the PREVIOUS history, do not call AI. 
			// Any message after LinkedIn suggestion should just repeat the suggestion.
			const historyText = body.history ? body.history.map(h => h.parts.map(p => p.text).join(' ')).join(' ') : '';
			if (historyText.includes('[LINKEDIN_BUTTON]')) {
				return new Response(JSON.stringify({
					response: "It looks like we have a lot to discuss! To respect your time and give you a detailed breakdown, please send me a DM on LinkedIn so we can connect properly. [LINKEDIN_BUTTON]"
				}), {
					headers: { ...cors, 'Content-Type': 'application/json' }
				});
			}

			// Model Fallback Chain
			const MODELS = [
				'gemini-3.1-flash-lite-preview',
				'gemini-2.5-flash',
				'gemini-2.0-flash'
			];

			let lastError = null;
			let geminiData = null;
			let successfulModel = null;

			for (const model of MODELS) {
				try {
					const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
					const geminiResponse = await fetch(geminiUrl, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							system_instruction: {
								parts: [{ text: activeSystemPrompt }]
							},
							contents,
							generationConfig: {
								temperature: 0.7,
								maxOutputTokens: 2048,
							}
						})
					});

					geminiData = await geminiResponse.json() as any;

					if (geminiResponse.ok) {
						successfulModel = model;
						break;
					} else {
						const details = JSON.stringify(geminiData);
						console.error(`Gemini API Error for ${model}:`, details);
						lastError = { status: geminiResponse.status, details };

						// If it's a quota issue, we might want to try another model, 
						// but if all are exhausted, we'll handle it after the loop.
					}
				} catch (err: any) {
					console.error(`Fetch Error for ${model}:`, err.message);
					lastError = { status: 500, details: err.message };
				}
			}

			if (!successfulModel) {
				const details = lastError?.details || '';
				const isQuota = details.includes('429') || details.includes('quota') || details.includes('RESOURCE_EXHAUSTED');

				if (isQuota) {
					return new Response(JSON.stringify({
						response: "Our AI brain is currently handling a high volume of requests. We prioritize high-ROI projects like Website Development and AI Automation. To get a faster response, please drop us a message on LinkedIn or leave your email here! [LINKEDIN_BUTTON]"
					}), {
						status: 200,
						headers: { ...cors, 'Content-Type': 'application/json' }
					});
				}

				return new Response(JSON.stringify({ error: 'Failed to generate response across all models', details }), {
					status: lastError?.status || 500,
					headers: { ...cors, 'Content-Type': 'application/json' }
				});
			}

			const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
				|| "I'm having trouble responding right now. Please try again!";

			// --- Lead Extraction ---
			// Scan the full conversation (history + new message) for name and email.
			// Returns {name, email} when both are found, null otherwise.
			function extractLeadData(history: { role: string, parts: { text: string }[] }[], newMsg: string) {
				const allMessages = [...(history || []), { role: 'user', parts: [{ text: newMsg }] }];
				const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
				let capturedEmail: string | null = null;
				let capturedName: string | null = null;
				let capturedService: string | null = null;
				let capturedBudget: string | null = null;

				for (let i = 0; i < allMessages.length; i++) {
					const msg = allMessages[i];
					const msgText = msg.parts?.[0]?.text?.trim() || '';

					// Find a valid email in any user message
					if (msg.role === 'user' && !capturedEmail) {
						const match = msgText.match(emailRegex);
						if (match) capturedEmail = match[0];
					}

					// Find the name
					if (msg.role === 'model' && !capturedName) {
						const lower = msgText.toLowerCase();
						if (lower.includes('first name') || lower.includes('your name')) {
							const next = allMessages[i + 1];
							if (next && next.role === 'user') {
								const nameText = next.parts?.[0]?.text?.trim() || '';
								if (nameText && nameText.split(' ').length <= 4 && !emailRegex.test(nameText) && !nameText.includes('http')) {
									capturedName = nameText;
								}
							}
						}
					}

					// Find the service
					if (msg.role === 'model' && !capturedService) {
						const lower = msgText.toLowerCase();
						if (lower.includes('service') || lower.includes('interested in')) {
							const next = allMessages[i + 1];
							if (next && next.role === 'user') {
								capturedService = next.parts?.[0]?.text?.trim() || '';
							}
						}
					}

					// Find the budget
					if (msg.role === 'model' && !capturedBudget) {
						const lower = msgText.toLowerCase();
						if (lower.includes('budget')) {
							const next = allMessages[i + 1];
							if (next && next.role === 'user') {
								capturedBudget = next.parts?.[0]?.text?.trim() || '';
							}
						}
					}

					if (capturedName && capturedEmail && capturedService && capturedBudget) break;
				}

				if (capturedName && capturedEmail && capturedService && capturedBudget) {
					return { name: capturedName, email: capturedEmail, service: capturedService, budget: capturedBudget };
				}
				return null;
			}

			const leadData = extractLeadData(body.history || [], body.message);

			if (leadData) {
				// Generate a concise summary of the business need
				const summaryPrompt = "Summary: In exactly one concise sentence, summarize the visitor's name, their specific need, their estimated budget, and our recommendation.";
				const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${env.GEMINI_API_KEY}`;

				try {
					const summaryResponse = await fetch(geminiUrl, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							system_instruction: { parts: [{ text: summaryPrompt }] },
							contents: [...contents, { role: 'model', parts: [{ text }] }],
							generationConfig: { temperature: 0.1, maxOutputTokens: 150 }
						})
					});
					const summaryData = await summaryResponse.json() as any;
					(leadData as any).summary = summaryData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Conversation summary unavailable";
				} catch (e) {
					console.error("Summary Error:", e);
					(leadData as any).summary = "Conversation summary (error generating)";
				}
			}

			const responseObj = { response: text, ...(leadData ? { leadData } : {}) };

			// --- Persistence ---
			// Save to D1 in the background
			ctx.waitUntil((async () => {
				try {
					// 1. Save Chat Message
					await env.DB.prepare(
						"INSERT INTO chat_logs (client_id, user_message, bot_response, timestamp) VALUES (?, ?, ?, ?)"
					).bind(clientId, body.message, text, Date.now()).run();

					// 2. Save Lead if completed
					if (leadData) {
						await env.DB.prepare(
							"INSERT INTO leads (client_id, name, email, service, budget, summary, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
						).bind(clientId, leadData.name, leadData.email, leadData.service, leadData.budget, (leadData as any).summary, Date.now()).run();
					}
				} catch (e) {
					console.error("D1 Persistence Error:", e);
				}
			})());

			return new Response(JSON.stringify(responseObj), {
				headers: { ...cors, 'Content-Type': 'application/json' },
			});

		} catch (error: any) {
			console.error('Worker Error:', error);
			return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
				status: 500,
				headers: { ...cors, 'Content-Type': 'application/json' }
			});
		}
	},
};
// Verification Push: CI/CD stabilized via GitHub Actions.
