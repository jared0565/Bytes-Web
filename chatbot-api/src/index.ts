import { callChosenModel, publicCatalog, DEFAULT_MODEL } from './llm';

export interface Env {
	GEMINI_API_KEY: string;
	ANTHROPIC_API_KEY?: string;
	OPENAI_API_KEY?: string;
	OPENROUTER_API_KEY?: string;
	ADMIN_API_KEY: string;
	DB: D1Database;
	CLIENT_SETTINGS: KVNamespace;
}

const SYSTEM_PROMPT = `
Persona & Role:
You are an Elite Onboarding Architect. Your sole objective is to convert website visitors into starting a "30-Day Free Trial" of our services within precisely 7 turns. 
You are highly persuasive, extremely concise, and laser-focused on moving the user to the trial.

The 7-Turn Conversion Framework:
1. ACKNOWLEDGE & HOOK (Turn 1): When a user states their need, acknowledge it enthusiastically. Immediately tease that they can test-drive a solution for free.
2. DISCOVERY & NAME (Turn 2): "Before I set up your trial workspace, can I grab your first name?"
3. EMAIL CAPTURE (Turn 3): "Great to meet you, [Name]. What is the best business email to send your secure 30-Day Free Trial access link to?"
4. SERVICE MATCHING (Turn 4): Once you have the email, ask 1 specific question to determine EXACTLY which service (Data scraping, Web Dev, AI Automation, etc.) they want to test in the trial.
5. URGENCY & BUDGET (Turn 5): "Got it. While the first 30 days are 100% free, what is your estimated monthly budget if you decide to keep the [Service] running after the trial?" (You MUST get a number here to qualify them).
6. THE PITCH (Turn 6): Briefly explain the immense value they will get in the next 30 days for free.
7. CLOSING (Turn 7): "I've locked in your trial! I just forwarded your details to our deployment team. Expect an email with your secure login in the next few minutes. Is there anything else you need?"

Strict Rules:
- STRICT EMAIL VALIDATION: Reject gibberish or non-email inputs politely. Do not proceed until you have a real email.
- You MUST get their Name, Email, target Service, and Estimated Budget. Do not skip these steps.
- Be extremely concise. Max 3 short sentences per response.
- If they say "no" or refuse to answer, pivot immediately: "No problem. If you prefer to chat with a human first, send our team a DM on LinkedIn! [LINKEDIN_BUTTON]"
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

// Public widget routes are called from customers' sites, so echo the caller's origin
const getPublicCorsHeaders = (origin: string | null) => ({
	'Access-Control-Allow-Origin': origin || '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
	'Vary': 'Origin'
});

// Our own site and local dev can always use any client's bot (previews, onboarding demo)
const isFirstPartyOrigin = (host: string) =>
	host === 'web.bytesfx.com' || host === 'localhost' || host === '127.0.0.1';

// allowedDomains entries are hostnames, optionally '*.example.com' (matches subdomains and the apex)
function isOriginAllowed(origin: string | null, allowedDomains: unknown): boolean {
	if (!Array.isArray(allowedDomains) || allowedDomains.length === 0) return true; // no list saved → unrestricted
	if (!origin) return false;
	let host: string;
	try { host = new URL(origin).hostname.toLowerCase(); } catch { return false; }
	if (isFirstPartyOrigin(host)) return true;
	return allowedDomains.some((d) => {
		if (typeof d !== 'string') return false;
		const domain = d.toLowerCase();
		if (domain.startsWith('*.')) {
			const base = domain.slice(2);
			return host === base || host.endsWith('.' + base);
		}
		return host === domain || host === 'www.' + domain;
	});
}

// Simple in-memory rate limiter
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 15;
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
		const url = new URL(request.url);
		const isAdminRoute = url.pathname.startsWith('/api/');
		const cors = isAdminRoute ? getCorsHeaders(origin) : getPublicCorsHeaders(origin);

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: cors });
		}

		// --- Public model catalog for the dashboard's model picker (prices + which providers have keys) ---
		if (url.pathname === '/public/models' && request.method === 'GET') {
			return new Response(JSON.stringify(await publicCatalog(env)), {
				headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' }
			});
		}

		// --- Public widget config (no auth) — only fields the widget needs, never prompts or domains ---
		if (url.pathname === '/public/config' && request.method === 'GET') {
			const clientId = url.searchParams.get('clientId') || 'default';
			let cfg: any = {};
			try { cfg = JSON.parse(await env.CLIENT_SETTINGS.get(`client:${clientId}`) || '{}'); } catch { cfg = {}; }
			if (!isOriginAllowed(origin, cfg.allowedDomains)) {
				return new Response(JSON.stringify({ error: 'This website is not allowed to use this chatbot.' }), {
					status: 403, headers: { ...cors, 'Content-Type': 'application/json' }
				});
			}
			const tier = cfg.mode || 'free';
			const pub = {
				showBranding: tier === 'free' ? true : (cfg.showBranding ?? tier === 'standard'), // same defaults as /api/config
				referralId: cfg.referralId || '',
				badgeUrl: (cfg.badgeUrl || '').replace('web.bytesai.com', 'web.bytesfx.com'), // older records saved the wrong domain
				widgetName: cfg.widgetName || '',
				widgetAccentColor: cfg.widgetAccentColor || '',
				widgetAvatar: cfg.widgetAvatar || ''
			};
			return new Response(JSON.stringify(pub), {
				headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
			});
		}

		// --- Administrative Routes (Protected) ---
		if (isAdminRoute) {
			const allowedOrigin = "https://web.bytesfx.com";

			// Strictly enforce Origin for Admin Dashboard, but allow local dev
			if (origin && origin !== allowedOrigin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
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

			// GET /api/leads - Fetch all leads with gating logic
			if (url.pathname === '/api/leads' && request.method === 'GET') {
				try {
					// Fetch recent leads
					const { results: leads } = (await env.DB.prepare(
						"SELECT * FROM leads ORDER BY timestamp DESC LIMIT 100"
					).all()) as { results: any[] };

					// Unique clients in this batch
					const uniqueClients = [...new Set(leads.map(l => l.client_id))];

					// Fetch configs for these clients to check tiers
					const clientConfigs: Record<string, any> = {};
					for (const cid of uniqueClients) {
						const kvData = await env.CLIENT_SETTINGS.get(`client:${cid}`);
						clientConfigs[cid] = kvData ? JSON.parse(kvData) : { mode: 'free' };
					}

					// Current Month Start (simplified for SQLite)
					const monthStart = new Date();
					monthStart.setDate(1);
					monthStart.setHours(0, 0, 0, 0);
					const monthStartTime = monthStart.getTime();

					// Process leads with gating
					const processedLeads = await Promise.all(leads.map(async (lead) => {
						const config = clientConfigs[lead.client_id] || { mode: 'free' };
						const tier = config.mode || 'free';

						if (tier === 'free') {
							// Count leads for this client this month up to THIS lead's timestamp
							// (Note: For performance in a real app, this should be a single pre-calculated count or optimized SQL)
							const { results } = await env.DB.prepare(
								"SELECT COUNT(*) as count FROM leads WHERE client_id = ? AND timestamp >= ? AND timestamp < ?"
							).bind(lead.client_id, monthStartTime, lead.timestamp).all();

							const leadIndex = (results[0] as any).count; // 0-indexed count before this lead

							if (leadIndex >= 10) {
								return {
									...lead,
									locked: true,
									name: "[Locked - Upgrade]",
									email: "[Locked]",
									budget: "[Locked]",
									// Keep service and summary as "teasers"
								};
							}
						}
						return { ...lead, locked: false };
					}));

					return new Response(JSON.stringify(processedLeads), {
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

			// GET /api/config - Fetch current client settings
			if (url.pathname === '/api/config' && request.method === 'GET') {
				const qClientId = url.searchParams.get('clientId');
				if (!qClientId) {
					return new Response(JSON.stringify({ error: 'Missing clientId' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
				}
				const kvData = await env.CLIENT_SETTINGS.get(`client:${qClientId}`);
				const config = kvData ? JSON.parse(kvData) : {};

				// Add default branding logic based on tier:
				// FREE: Always forced to true
				// OTHERS: Defaults to true/false based on tier or saved setting
				const tier = config.mode || 'free';
				if (tier === 'free') {
					config.showBranding = true;
				} else if (config.showBranding === undefined) {
					config.showBranding = (tier === 'standard'); // Default to on for Standard
				}

				return new Response(JSON.stringify(config), {
					headers: { ...cors, 'Content-Type': 'application/json' }
				});
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

			// POST /api/test-lead - Simulate a lead for testing
			if (url.pathname === '/api/test-lead' && request.method === 'POST') {
				try {
					const leadBody = await request.json() as { clientId: string, name: string, email: string };
					const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

					if (!leadBody.email || !emailRegex.test(leadBody.email)) {
						return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
					}

					await env.DB.prepare(
						"INSERT INTO leads (client_id, name, email, service, budget, summary, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
					).bind(
						leadBody.clientId || 'test_client',
						leadBody.name || 'Test User',
						leadBody.email,
						'Lead Simulator',
						'Test Budget',
						'Manually simulated lead for system verification.',
						Date.now()
					).run();

					return new Response(JSON.stringify({ success: true }), {
						headers: { ...cors, 'Content-Type': 'application/json' }
					});
				} catch (e: any) {
					return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
				}
			}

			// POST /api/generate-sequence - AI Autoresponder Campaign Generator
			if (url.pathname === '/api/generate-sequence' && request.method === 'POST') {
				try {
					const { leadId } = await request.json() as { leadId: string };
					if (!leadId) return new Response(JSON.stringify({ error: 'Missing leadId' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });

					// Fetch lead data
					const lead: any = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(leadId).first();
					if (!lead) return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });

					// Check if sequences already exist
					const existing = await env.DB.prepare("SELECT count(*) as count FROM email_sequences WHERE lead_id = ?").bind(leadId).first();
					if ((existing as any).count > 0) {
						return new Response(JSON.stringify({ error: 'Sequence already exists for this lead' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
					}

					// Fetch chat history for context
					const { results: chatLogs } = await env.DB.prepare("SELECT user_message, bot_response FROM chat_logs WHERE client_id = ? ORDER BY timestamp ASC").bind(lead.client_id).all();

					const chatContext = chatLogs.map((log: any) => `User: ${log.user_message}\nBot: ${log.bot_response}`).join('\n\n');

					const prompt = `
You are an expert copywriter and sales closer.
Write a highly engaging 5-email drip sequence to close a lead who recently chatted with our AI.
Lead Name: ${lead.name}
Lead Email: ${lead.email}
Interest/Service: ${lead.service}
Budget Indicated: ${lead.budget}
Lead Summary: ${lead.summary}

Chat Transcript Context:
${chatContext}

Strategy:
Email 1: Value delivery & immediate follow-up to the chat.
Email 2: Agitate the core problem and explain why fixing it is urgent. INCLUDE AN INTERACTIVE MICRO-CHALLENGE: Ask the user to reply to this email with their biggest single bottleneck, promising to instantly send back a completely free, custom AI audit report or strategy tailored to their answer. This creates a two-way engagement loop.
Email 3: Case study/Proof of concept for our ${lead.service}.
Email 4: Cross-sell/Upsell (Suggest a complementary service based on their chat context).
Email 5: The final hard close & call to action.

Output EXACTLY in this JSON format:
{
  "emails": [
    { "email_number": 1, "subject": "...", "body": "..." },
    { "email_number": 2, "subject": "...", "body": "..." }
  ]
}
`;
					// Call Gemini
					const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
					const geminiResponse = await fetch(geminiUrl, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							system_instruction: { parts: [{ text: "You are an elite B2B sales copywriter." }] },
							contents: [{ role: 'user', parts: [{ text: prompt }] }],
							generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
						})
					});

					const geminiData = await geminiResponse.json() as any;
					if (!geminiResponse.ok) throw new Error("Gemini API Error: " + JSON.stringify(geminiData));

					const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
					if (!responseText) throw new Error("Empty response from AI");

					const parsed = JSON.parse(responseText);
					const emails = parsed.emails || [];

					// Insert into DB
					const stmt = env.DB.prepare("INSERT INTO email_sequences (lead_id, client_id, email_number, subject, body, status, scheduled_for) VALUES (?, ?, ?, ?, ?, 'draft', ?)");
					const batch = [];
					let delayDays = 1;
					for (const email of emails) {
						const scheduledFor = Date.now() + (delayDays * 24 * 60 * 60 * 1000); // 1 day apart
						batch.push(stmt.bind(leadId, lead.client_id, email.email_number, email.subject, email.body, scheduledFor));
						delayDays++;
					}

					await env.DB.batch(batch);
					await env.DB.prepare("UPDATE leads SET status = 'sequence_generated' WHERE id = ?").bind(leadId).run();

					return new Response(JSON.stringify({ success: true, count: emails.length }), {
						headers: { ...cors, 'Content-Type': 'application/json' }
					});

				} catch (e: any) {
					return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
				}
			}

			// GET /api/sequences - Fetch sequences for a lead
			if (url.pathname === '/api/sequences' && request.method === 'GET') {
				try {
					const leadId = url.searchParams.get('leadId');
					if (!leadId) return new Response(JSON.stringify({ error: 'Missing leadId' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });

					const { results } = await env.DB.prepare("SELECT * FROM email_sequences WHERE lead_id = ? ORDER BY email_number ASC").bind(leadId).all();
					return new Response(JSON.stringify(results), { headers: { ...cors, 'Content-Type': 'application/json' } });
				} catch (e: any) {
					return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
				}
			}

			// PUT /api/sequences - Update an email
			if (url.pathname === '/api/sequences' && request.method === 'PUT') {
				try {
					const { id, subject, body } = await request.json() as { id: number, subject: string, body: string };
					await env.DB.prepare("UPDATE email_sequences SET subject = ?, body = ? WHERE id = ?").bind(subject, body, id).run();
					return new Response(JSON.stringify({ success: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
				} catch (e: any) {
					return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
				}
			}

			// POST /api/sequences/approve - Approve a lead's sequence
			if (url.pathname === '/api/sequences/approve' && request.method === 'POST') {
				try {
					const { leadId } = await request.json() as { leadId: string };

					// Calculate Speed-to-Lead Gamification Badge
					const lead: any = await env.DB.prepare("SELECT timestamp FROM leads WHERE id = ?").bind(leadId).first();
					if (!lead) {
						return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });
					}

					const now = Date.now();
					const oneHour = 60 * 60 * 1000;
					const hasLightningBadge = (now - lead.timestamp) <= oneHour;

					await env.DB.prepare("UPDATE email_sequences SET status = 'approved' WHERE lead_id = ? AND status = 'draft'").bind(leadId).run();
					await env.DB.prepare("UPDATE leads SET status = 'active_campaign', has_lightning_badge = ? WHERE id = ?").bind(hasLightningBadge ? 1 : 0, leadId).run();

					return new Response(JSON.stringify({ success: true, hasLightningBadge }), { headers: { ...cors, 'Content-Type': 'application/json' } });
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
		let clientConfig: { systemPrompt?: string, mode?: 'free' | 'standard' | 'pro' | 'elite', showBranding?: boolean, referralId?: string, companyName?: string } | null = null;
		try {
			const kvData = await env.CLIENT_SETTINGS.get(`client:${clientId}`);
			if (kvData) {
				clientConfig = JSON.parse(kvData);
			}
		} catch (e) {
			console.error("KV Error:", e);
		}

		// Only sites on the client's Allowed Domains list may use their bot
		if (!isOriginAllowed(origin, (clientConfig as any)?.allowedDomains)) {
			return new Response(JSON.stringify({ error: 'This website is not allowed to use this chatbot.' }), {
				status: 403, headers: { ...cors, 'Content-Type': 'application/json' }
			});
		}

		const tier = clientConfig?.mode || 'free'; // 'free', 'standard', 'pro', 'elite'
		let activeSystemPrompt = clientConfig?.systemPrompt || SYSTEM_PROMPT;

		// 1.1 Inject Company Name into AI Prompt if present (Pro/Elite Upgrade)
		const companyName = clientConfig?.companyName || "";
		if (companyName && tier !== 'free' && tier !== 'standard') {
			activeSystemPrompt += `\n\nYou represent ${companyName}. Refer to the business as ${companyName}.`;
		}

		// 1.2 Inject Gamification Status-Tier Context (Track B)
		// Instructs the AI to subtly acknowledge the user's tier status for anticipation motivation
		const tierDisclosureRule = `
CRITICAL INSTRUCTION - STATUS TIER VISIBILITY: 
The agency operating this chatbot is currently on the '${tier.toUpperCase()}' tier. 
If the user asks complex questions, casually mention this tier to build authority and status.
Example: "Since we're operating on the Elite tier infrastructure, I can run that analysis for you." or "Our Pro tier access allows us to prioritize this."
Do not force it into every message, but use it naturally when discussing capabilities or advanced strategies.`;

		activeSystemPrompt = activeSystemPrompt + "\n" + tierDisclosureRule;

		// --- Static/Rule-Based Modes (Free & Standard) ---
		if (tier === 'free' || tier === 'standard') {
			const history = body.history || [];
			const userMsg = body.message.toLowerCase();
			const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

			// 3. State-Based Rule Engine (PAS Framework)
			const botMsgs = history.filter((h: any) => h.role === 'model').map((h: any) => h.parts[0].text);
			const userMsgs = history.filter((h: any) => h.role === 'user').map((h: any) => h.parts[0].text);

			const askedName = botMsgs.some(t => t.includes('name?'));
			const providedEmail = userMsgs.some(t => emailRegex.test(t));
			const deliveredPAS = botMsgs.some(t => t.includes('Did you know'));
			const askedBudget = botMsgs.some(t => t.includes('budget'));
			const isClosing = userMsg.includes('no') || userMsg.includes('nothing') || userMsg.includes('thank');

			let responseText = "";
			let shouldSubmitLead = false;

			// Extract First User Intent for Acknowledgment
			const firstReq = (userMsgs[0] || body.message).toLowerCase();
			let serviceFocus = "growth strategy";
			if (firstReq.includes("web") || firstReq.includes("site")) serviceFocus = "web infrastructure";
			if (firstReq.includes("bot") || firstReq.includes("ai")) serviceFocus = "AI automation";
			if (firstReq.includes("linkedin") || firstReq.includes("leads")) serviceFocus = "lead generation";

			if (!askedName) {
				// STEP 1: Acknowledge & Name
				responseText = `I hear you—improving your ${serviceFocus} sounds like a critical priority. But first, can I have your name?`;
			} else if (!providedEmail) {
				// STEP 2: Email
				const brandText = companyName ? `At ${companyName}` : "Our specialized team";
				if (emailRegex.test(body.message)) {
					responseText = `Thanks! And did you know that delay in resolving ${serviceFocus} issues often costs businesses 20-30% in potential revenue? \n\n${brandText} specializes in high-impact solutions that stop that leak. Does that sound like what you need?`;
				} else {
					responseText = `Thanks! What is the best email address to send your personalized ${serviceFocus} plan to?`;
				}
			} else if (!deliveredPAS) {
				// STEP 3: Agitation & Solution (if email was just provided)
				responseText = `Perfect. Did you know that inefficient ${serviceFocus} often costs businesses significant growth opportunities? We specialize in resolving exactly these gaps. \n\nTo tailor our solution for you, what is your estimated monthly budget for this project?`;
			} else if (!askedBudget) {
				// STEP 4: Budget
				responseText = `Understood. To ensure we allocate the right resources, what is your estimated monthly budget for this ${serviceFocus} solution?`;
			} else if (isClosing) {
				// STEP 5: Closing
				responseText = `Thank you for your time! We look forward to connecting soon. For even faster response, feel free to send us a DM on LinkedIn. [LINKEDIN_BUTTON]`;
			} else {
				responseText = `Thank you for providing those details! Internal team has been notified and they will expect to reach out via email or call at the soonest possible time for a deep-dive analysis. \n\nIs there anything else I can assist you with?`;
				shouldSubmitLead = true;
			}

			// --- Lead Extraction Update ---
			let leadData = null;
			if (shouldSubmitLead || (providedEmail && askedBudget)) {
				let name = "Visitor";
				let email = "";
				let budget = "Pending";

				// Heuristic search in history
				for (const msg of [...history, { role: 'user', parts: [{ text: body.message }] }]) {
					if (msg.role !== 'user') continue;
					const txt = msg.parts[0].text;
					const emMatch = txt.match(emailRegex);
					if (emMatch) email = emMatch[0];
					else if (!txt.includes(' ') && txt.length < 15 && name === "Visitor") name = txt;
					else if (txt.match(/\d/)) budget = txt;
				}

				if (email) {
					leadData = {
						name,
						email,
						service: serviceFocus.toUpperCase(),
						budget,
						summary: `PAS Flow Lead. Intent: ${serviceFocus}.`
					};
				}
			}

			const responseObj = {
				response: responseText,
				...(leadData ? { leadData } : {}),
				_mode: 'static'
			};

			// Persistence (D1)
			ctx.waitUntil((async () => {
				try {
					await env.DB.prepare(
						"INSERT INTO chat_logs (client_id, user_message, bot_response, timestamp) VALUES (?, ?, ?, ?)"
					).bind(clientId, body.message, responseText, Date.now()).run();

					if (shouldSubmitLead && leadData) {
						// 1. Insert into Shared D1
						const { meta } = await env.DB.prepare(
							"INSERT INTO leads (client_id, name, email, service, budget, summary, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
						).bind(clientId, leadData.name, leadData.email, leadData.service, leadData.budget, leadData.summary, Date.now()).run();
						
						// 2. Fire Async Webhook to CRM-API for Pipeline Routing
						if (meta && meta.last_row_id) {
							fetch('https://crm-api.bmorris0565.workers.dev/api/webhooks/new-lead', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({ leadId: meta.last_row_id, clientId, budget: leadData.budget })
							}).catch(err => console.error("Webhook Dispatch Error (Static Flow):", err));
						}
					}
				} catch (e) { console.error("D1 Error:", e); }
			})());

			return new Response(JSON.stringify(responseObj), {
				headers: { ...cors, 'Content-Type': 'application/json' },
			});
		}

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

			// --- Token Optimization & Context Pruning ---
			// If history is long (e.g., > 10 messages), summarize the older context
			let optimizedContents = [...contents];
			if (contents.length > 10) {
				const historyToSummarize = contents.slice(0, contents.length - 4);
				const recentHistory = contents.slice(contents.length - 4);

				const summarizerUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${env.GEMINI_API_KEY}`;
				try {
					const summaryResponse = await fetch(summarizerUrl, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							system_instruction: { parts: [{ text: "In 2 concise sentences, summarize the visitor's core needs, their name (if known), and where the conversation left off. This summary will be used as context for the next AI turn." }] },
							contents: historyToSummarize,
							generationConfig: { temperature: 0.3, maxOutputTokens: 200 }
						})
					});
					const summaryData = await summaryResponse.json() as any;
					const conversationSummary = summaryData?.candidates?.[0]?.content?.parts?.[0]?.text || "Continuing conversation.";

					// Replace old history with the summary
					optimizedContents = [
						{ role: 'user', parts: [{ text: `[System Context: Current Conversation Summary: ${conversationSummary}]` }] },
						...recentHistory
					];
				} catch (e) {
					console.error("Context Pruning Error:", e);
				}
			}

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

			// Client's chosen model (dashboard → Chatbot Behavior; empty = the Default option shown there).
			// Any failure falls through to the Gemini chain.
			let chosenText: string | null = null;
			const chosenModel = (clientConfig as any)?.llmModel || DEFAULT_MODEL;
			try {
				chosenText = (await callChosenModel(env, chosenModel, (clientConfig as any)?.llmEffort, activeSystemPrompt, optimizedContents)).text;
			} catch (err: any) {
				console.error(`[LLM] Chosen model ${chosenModel} failed, using default chain:`, err?.message || err);
			}

			// Model Fallback Chain
			const MODELS = chosenText ? [] : [
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
							contents: optimizedContents,
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

			if (!successfulModel && !chosenText) {
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

			const text = chosenText || geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
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

				if (capturedName && capturedEmail) {
					return {
						name: capturedName,
						email: capturedEmail,
						service: capturedService || 'Not yet specified',
						budget: capturedBudget || 'Not yet specified'
					};
				}
				return null;
			}

			const leadData = extractLeadData(body.history || [], body.message);

			if (leadData) {
				// Generate a concise summary of the business need
				const summaryPrompt = "Summary: In 1-2 concise but descriptive sentences, summarize the visitor's name, their specific pain point, their estimated budget, and the specific BytesFX service recommended. This is our 'Source of Truth' for the CRM.";
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
						const { meta } = await env.DB.prepare(
							"INSERT INTO leads (client_id, name, email, service, budget, summary, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
						).bind(clientId, leadData.name, leadData.email, leadData.service, leadData.budget, (leadData as any).summary, Date.now()).run();
						
						// 3. Fire Async Webhook to CRM-API for Pipeline Routing
						if (meta && meta.last_row_id) {
							fetch('https://crm-api.bmorris0565.workers.dev/api/webhooks/new-lead', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({ leadId: meta.last_row_id, clientId, budget: leadData.budget })
							}).catch(err => console.error("Webhook Dispatch Error (AI Flow):", err));
						}
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

	// Drip emails are sent by crm-api's cron (it holds the mail settings). Kept as a no-op so this
	// worker's cron trigger doesn't error, and so the two workers never both process a sequence.
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {}
};
// Verification Push: CI/CD stabilized via GitHub Actions.
