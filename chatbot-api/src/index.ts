import { GoogleGenAI } from '@google/genai';

export interface Env {
	GEMINI_API_KEY: string;
}

const SYSTEM_PROMPT = `
Persona & Role:
You are the Lead Strategist at BytesFX (acting as a Growth Orchestrator). Your objective is to maximize client ROI by matching their business pain points to our premium services. You do not just give answers; you qualify leads in real-time.

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
8. Do NOT repeat a greeting if the user does not greet you or if you have already greeted them in previous messages. Act as a continuous conversational partner.
`;

const corsHeaders = {
	'Access-Control-Allow-Origin': '*', // In production, change this to 'https://bytesfx.com'
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

// Extremely simple in-memory rate limiter (Note: resets on worker restart)
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 messages per 10 minutes per IP
const ipRequests = new Map<string, { count: number, resetTime: number }>();

function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const record = ipRequests.get(ip);

	if (!record) {
		ipRequests.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
		return false;
	}

	if (now > record.resetTime) {
		// Window expired, reset
		ipRequests.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
		return false;
	}

	record.count++;
	if (record.count > MAX_REQUESTS_PER_WINDOW) {
		return true;
	}

	return false;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: corsHeaders,
			});
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

		// Basic IP-based rate limiting (Soft Cutoff)
		const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
		if (isRateLimited(clientIP)) {
			// Instead of a 429 error, we return a 200 OK with a hardcoded bot response.
			// This completely bypasses the Gemini API (burning 0 tokens) while feeling like a natural end to the chat.
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

			// Initialize the new Google GenAI SDK
			const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

			// Start a chat session and pass the system prompt as systemInstruction
			const chatOptions: any = {
				model: 'gemini-2.0-flash',
				config: {
					systemInstruction: SYSTEM_PROMPT,
					temperature: 0.7
				}
			};
			if (body.history && Array.isArray(body.history) && body.history.length > 0) {
				chatOptions.history = body.history;
			}
			const chat = ai.chats.create(chatOptions);

			// If there is history from the frontend, we could theoretically load it here, 
			// but for simplicity of this endpoint, we'll just send the current message.
			// The new SDK handles history differently if you want to preload it, but sending the combined context works too.

			// Send the user's message
			const response = await chat.sendMessage({ message: body.message });

			return new Response(JSON.stringify({ response: response.text }), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});

		} catch (error: any) {
			console.error('Gemini API Error:', error);
			const details = error.response ? JSON.stringify(error.response) : error.message;

			// Detect if Google API rejected the request due to hitting the budget/quota (429 Too Many Requests limit)
			const isQuotaError = details.includes('429') || details.includes('quota') || (error.status === 429);

			if (isQuotaError) {
				// Fallback to rule-based answering
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
	},
};
