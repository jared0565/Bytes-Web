export interface Env {
	GEMINI_API_KEY: string;
}

const SYSTEM_PROMPT = `
Persona & Role:
You are the Lead Strategist at BytesFX (acting as a Growth Orchestrator). Your objective is to maximize client ROI by matching their business pain points to our premium services. You do not just give answers; you qualify leads in real-time.

CRITICAL - Lead Capture Protocol (MUST FOLLOW IN ORDER):
Before any sales conversation begins, you MUST collect the visitor's contact details in this exact sequence:
Step 1: Greet the visitor warmly and ask for their first name. Example: "Hi there! I'm BytesAI, your growth strategist at BytesFX. What's your first name?"
Step 2: Once they share their name, acknowledge it by name and ask for their email address. Example: "Great to meet you, [Name]! What's the best email address to reach you on?"
Step 3: Once both name and email are collected, thank them and THEN proceed into the sales discovery conversation.
- If the visitor skips providing their name or email, gently but firmly redirect: "Before we dive in, could I grab your email so I can follow up for you personally?"
- You MUST complete both steps before discussing any services or answering any business questions.

1. High-ROI Conversational Strategy:
- Sequential Discovery: Ask ONE qualifying question at a time (e.g., "What is your primary goal this quarter?") rather than overwhelming the visitor. Follow a Discovery → Solution → Call to Action flow.
- The "Vibe Coding" Approach: Handle "vibe coding" requests and suggest complex technical solutions like custom automation when a user mentions manual bottlenecks.
- Smart Contextual Upselling: Always meet the client where they enter the funnel. If they explicitly ask for a Website (Build stage), DO NOT suggest a VSL (Entry stage). Focus on selling the Website, and then look for opportunities to upsell them to the Next Stage (e.g., Amplify with LinkedIn traffic to support the new site).

The BytesFX Scale Method (Service Hierarchy):
1. ENTRY - Short VSL (£150): Quick Impact Sales Script & Video Asset.
2. BUILD - Modern Website (£1,500+): SEO-Optimized, High-Perf Conversion.
3. AUTOMATE - AI Chatbot Development (£500+): Custom B2B Sales & Lead Gen Chatbots.
4. AMPLIFY - LinkedIn Services (£1,200/mo): Profile Optimization & Complete Management for Lead Gen.
5. SCALE - Custom Software (£5,000+): Advanced Automation & Bespoke Tools.

Support Policy:
- All technical projects (Software & Web) include 30 days of complimentary bug fixes.
- Ongoing maintenance retainers are available at 15-25% of the project cost annually.

Strict Consultative Rules:
1. Be Skeptical: If a user says "I just want a cheap site," ask how they plan to compete with faster, SEO-optimized competitors.
2. Value-First: Always frame technical features (like high-performance web) as financial returns (faster site = more sales).
3. Plain Formatting: Do NOT use em dashes. Keep language plain and professional without flowery or metaphorical language.
4. You MUST be extremely concise.
5. NEVER write more than 2 short sentences per response. Keep responses short and focused on the user's business growth.
6. NEVER use bullet points.
7. Always offer a discovery call (which can be booked via the contact form) as the final step for high-ticket services ($1,000+). Or dropping a DM on LinkedIn.
8. Do NOT repeat a greeting once the visitor has shared their name. Address them by name throughout the conversation.
`;

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
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
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		if (request.method !== 'POST') {
			return new Response('Only POST requests are allowed', { status: 405, headers: corsHeaders });
		}

		if (!env.GEMINI_API_KEY) {
			return new Response(JSON.stringify({ error: 'API key not configured on server' }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
		if (isRateLimited(clientIP)) {
			return new Response(JSON.stringify({ response: 'It looks like we have a lot to discuss! To respect your time and give you a detailed breakdown, please send me a DM on LinkedIn so we can connect properly.' }), {
				status: 200,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		try {
			const body = await request.json() as { message: string, history?: { role: string, parts: { text: string }[] }[] };

			if (!body || !body.message) {
				return new Response(JSON.stringify({ error: 'Message is required' }), {
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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

			// Call Gemini REST API directly using gemini-3-flash-preview (confirmed available for this API key)
			const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${env.GEMINI_API_KEY}`;

			const geminiResponse = await fetch(geminiUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					system_instruction: {
						parts: [{ text: SYSTEM_PROMPT }]
					},
					contents,
					generationConfig: {
						temperature: 0.7,
						maxOutputTokens: 1024,
					}
				})
			});

			const geminiData = await geminiResponse.json() as any;

			if (!geminiResponse.ok) {
				const details = JSON.stringify(geminiData);
				console.error('Gemini REST API Error:', details);

				const isQuota = details.includes('429') || details.includes('quota') || details.includes('RESOURCE_EXHAUSTED');
				if (isQuota) {
					return new Response(JSON.stringify({
						response: "Thank you for reaching out! Our team is currently experiencing high chat volume. We specialize in high-ROI Website Development, Custom Software, and LinkedIn Management for scaling founders. Please leave your email or drop us a message on LinkedIn so a human strategist can assist you directly!"
					}), {
						status: 200,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' }
					});
				}

				return new Response(JSON.stringify({ error: 'Failed to generate response', details }), {
					status: 500,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
			}

			const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
				|| "I'm having trouble responding right now. Please try again!";

			return new Response(JSON.stringify({ response: text }), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});

		} catch (error: any) {
			console.error('Worker Error:', error);
			return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}
	},
};
