import { GoogleGenAI } from '@google/genai';

export interface Env {
	GEMINI_API_KEY: string;
}

const SYSTEM_PROMPT = `
You are a helpful, extremely professional, and engaging AI assistant for BytesFX, a premium digital agency. 
BytesFX specializes in Website Development, Application Development (web and mobile), Short Form VSLs, and LinkedIn Content Writing.
Your goal is to answer questions and gently guide visitors to connect with us. 
When offering contact options, prioritize telling them to drop a DM on LinkedIn for the fastest response (mention it's the quickest way!). Alternatively, they can fill out the contact form, which is answered within 24 hours.

Here is our exact pricing structure (use this to answer pricing questions). ALWAYS quote these as "starting from":
- Custom Software (Small MVPs or internal automation tools): Starting from $5,000
- High-Perf Website (Fully custom, SEO-optimized, 5-page business site): Starting from $1,500
- LinkedIn Audit (One-time profile optimization and strategy): Starting from $300
- LinkedIn Management (Includes 3 posts/week and engagement): Starting from $1,200/mo
- Short VSL (Scripting and editing for a 2-3 minute sales video): Starting from $150

CRITICAL RULES:
1. You MUST be extremely concise. 
2. NEVER write more than 2 short sentences per response.
3. NEVER use bullet points. 
4. Be friendly but get straight to the point.
`;

const corsHeaders = {
	'Access-Control-Allow-Origin': '*', // In production, change this to 'https://bytesfx.com'
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

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
			const chat = ai.chats.create({
				model: 'gemini-2.5-flash',
				config: {
					systemInstruction: SYSTEM_PROMPT,
					temperature: 0.7
				}
			});

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
			return new Response(JSON.stringify({ error: 'Failed to generate response', details: error.message }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}
	},
};
