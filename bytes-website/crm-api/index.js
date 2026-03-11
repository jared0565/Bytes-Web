import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import { AuthProvider } from './auth.js';

import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Initialize SQLite Database (Shared with Chatbot API via Miniflare D1 Emulator)
const dbPath = path.resolve('f:/Claude/Bytes Web/chatbot-api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6dbff13ddceac69ea6e8f49514787a2a10bc279326fd24c7f7b02e95a92e5844b06f46de6669e64134c3724c23e51e2c.sqlite');
const db = new Database(dbPath);

// Initialize Schema: We add to the existing chatbot-api 'leads' table safely
try {
  // Add CRM-specific columns to leads if they don't exist
  // SQLite doesn't have IF NOT EXISTS for ADD COLUMN natively, so we check first
  const tableInfo = db.pragma('table_info(leads)');
  const columns = tableInfo.map(c => c.name);

  if (!columns.includes('pipeline_stage')) {
    db.exec(`ALTER TABLE leads ADD COLUMN pipeline_stage TEXT DEFAULT 'lead'`);
  }
  if (!columns.includes('updated_at')) {
    db.exec(`ALTER TABLE leads ADD COLUMN updated_at INTEGER`);
  }
  if (!columns.includes('owner_id')) {
    db.exec(`ALTER TABLE leads ADD COLUMN owner_id TEXT`);
  }
  if (!columns.includes('next_best_action')) {
    db.exec(`ALTER TABLE leads ADD COLUMN next_best_action TEXT`);
  }
} catch (err) {
  console.log('Error modifying leads schema:', err.message);
}

// Create standalone CRM tables
db.exec(`
  CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'sales_rep' -- admin, sales_rep, support
  );

  CREATE TABLE IF NOT EXISTS automations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      rule_name TEXT,
      trigger_condition TEXT,
      action TEXT,
      is_active BOOLEAN DEFAULT TRUE
  );

  -- New users table for authenticated social users
  CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      social_id TEXT UNIQUE,
      provider TEXT,
      email TEXT UNIQUE,
      name TEXT,
      picture TEXT,
      created_at INTEGER
  );
`);

console.log('CRM Database initialized at:', dbPath);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'crm-api' });
});

// Mock Auth endpoint for Role-Based Access Control (RBAC) demo
app.post('/api/auth/login', (req, res) => {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: 'Key required' });

    // Mock logic: 'admin-123' -> admin role
    // 'sales-123' -> sales_rep role
    // Any other key -> default sales_rep
    let role = 'sales_rep';
    if (key === 'test' || key.includes('admin') || key === 'DEV_BYPASS') {
        role = 'admin';
    }
    
    res.json({ success: true, role, clientId: 'agency_demo' });
});

// --- Social Auth Routes ---

app.get('/api/auth/:provider', (req, res) => {
    const { provider } = req.params;
    const redirectUri = process.env.AUTH_REDIRECT_URL || `http://localhost:4000/api/auth/${provider}/callback`;

    let authUrl = '';
    if (provider === 'google') {
        authUrl = AuthProvider.google.getAuthUrl(process.env.GOOGLE_CLIENT_ID, redirectUri);
    } else if (provider === 'facebook') {
        authUrl = AuthProvider.facebook.getAuthUrl(process.env.FACEBOOK_CLIENT_ID, redirectUri);
    } else if (provider === 'linkedin') {
        authUrl = AuthProvider.linkedin.getAuthUrl(process.env.LINKEDIN_CLIENT_ID, redirectUri);
    } else {
        return res.status(400).json({ error: 'Unsupported provider' });
    }

    res.redirect(authUrl);
});

app.get('/api/auth/:provider/callback', async (req, res) => {
    const { provider } = req.params;
    const { code } = req.query;
    const redirectUri = process.env.AUTH_REDIRECT_URL || `http://localhost:4000/api/auth/${provider}/callback`;
    const frontendOnboardingUrl = process.env.FRONTEND_ONBOARDING_URL || 'http://localhost:5173/onboarding/';

    if (!code) return res.status(400).json({ error: 'No code provided' });

    try {
        let userData = null;
        if (provider === 'google') {
            userData = await AuthProvider.google.getUserData(code, process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri);
        } else if (provider === 'facebook') {
            userData = await AuthProvider.facebook.getUserData(code, process.env.FACEBOOK_CLIENT_ID, process.env.FACEBOOK_CLIENT_SECRET, redirectUri);
        } else if (provider === 'linkedin') {
            userData = await AuthProvider.linkedin.getUserData(code, process.env.LINKEDIN_CLIENT_ID, process.env.LINKEDIN_CLIENT_SECRET, redirectUri);
        }

        if (userData) {
            // Check if user exists, otherwise create
            const existingUser = db.prepare('SELECT * FROM users WHERE social_id = ? AND provider = ?').get(userData.id, provider);
            
            if (!existingUser) {
                db.prepare('INSERT INTO users (social_id, provider, email, name, picture, created_at) VALUES (?, ?, ?, ?, ?, ?)')
                  .run(userData.id, provider, userData.email, userData.name, userData.picture, Date.now());
            }

            // Redirect back to frontend with user data in query (simple for demo, use JWT in production)
            const query = new URLSearchParams({
                social_success: 'true',
                name: userData.name,
                email: userData.email,
                provider: provider
            }).toString();
            
            res.redirect(`${frontendOnboardingUrl}?${query}`);
        } else {
            res.redirect(`${frontendOnboardingUrl}?social_error=failed`);
        }
    } catch (error) {
        console.error(`Auth callback error (${provider}):`, error);
        res.redirect(`${frontendOnboardingUrl}?social_error=${encodeURIComponent(error.message)}`);
    }
});

// Basic Pipeline Route (Placeholder)
app.get('/api/leads', (req, res) => {
    // The UI makes a call to /api/leads with an x-admin-key header
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey) return res.status(401).json({ error: 'Unauthorized' });

    // For now, map everything to the 'agency_demo' seed data for testing
    const clientId = 'agency_demo'; 
    try {
        const stmt = db.prepare('SELECT * FROM leads WHERE client_id = ? ORDER BY timestamp DESC');
        const leads = stmt.all(clientId);
        res.json(leads);
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Webhook Listener (Triggered by chatbot-api)
app.post('/api/webhooks/new-lead', (req, res) => {
    // Expected Payload: { leadId: 5, clientId: 'agency_demo', budget: '$15,000' }
    const { leadId, clientId, budget } = req.body;
    
    if (!leadId) {
        return res.status(400).json({ error: 'leadId is required' });
    }

    console.log(`[Webhook Received] Processing new lead #${leadId} for ${clientId}`);

    try {
        let pipelineStage = 'lead';
        
        // Simple SLA/Routing Logic: If budget contains '10' or '15' or '50' (e.g. 10k+), route to Priority
        // This is a naive budget parser for demo purposes, representing real CRM routing logic
        if (budget && (budget.includes('10') || budget.includes('15') || budget.includes('20') || budget.includes('50'))) {
            pipelineStage = 'priority';
            console.log(`[Routing Logic] Lead #${leadId} routed to PRIORITY queue based on budget: ${budget}`);
        } else {
            console.log(`[Routing Logic] Lead #${leadId} routed to standard LEAD queue based on budget: ${budget}`);
        }

        const stmt = db.prepare('UPDATE leads SET pipeline_stage = ?, updated_at = ? WHERE id = ?');
        stmt.run(pipelineStage, Date.now(), leadId);
        
        res.json({ success: true, message: `Lead ${leadId} processed into pipeline stage: ${pipelineStage}` });
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook execution failed' });
    }
});

// Update Pipeline Stage manually from the UI
app.put('/api/leads/:id/stage', (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey) return res.status(401).json({ error: 'Unauthorized' });

    const leadId = req.params.id;
    const { stage } = req.body; // 'lead', 'priority', 'opportunity', 'campaign' etc.

    if (!stage) return res.status(400).json({ error: 'stage is required' });

    try {
        const stmt = db.prepare('UPDATE leads SET pipeline_stage = ?, updated_at = ? WHERE id = ?');
        stmt.run(stage, Date.now(), leadId);
        res.json({ success: true, message: 'Stage updated' });
    } catch (error) {
        console.error('Error updating stage:', error);
        res.status(500).json({ error: 'Database update failed' });
    }
});

// Artifical Debug Webhook Trigger for UI End-to-End Testing against ephemeral D1 state
app.get('/api/force-test-webhook', (req, res) => {
    try {
        const insertStmt = db.prepare('INSERT INTO leads (client_id, name, email, service, budget, summary, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)');
        const result = insertStmt.run('agency_demo', 'Webhook Flow Tester', 'test@example.com', 'System Test', '$50,000', 'Force injected test lead', Date.now());
        
        // Artificially route
        const routeStmt = db.prepare('UPDATE leads SET pipeline_stage = ?, updated_at = ? WHERE id = ?');
        routeStmt.run('priority', Date.now(), result.lastInsertRowid);
        
        res.json({ success: true, message: 'Inserted and Routed to PRIORITY successfully.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 4000;

// --- AI Copilot Routes ---

// POST /api/generate-sequence
app.post('/api/generate-sequence', async (req, res) => {
    try {
        const { leadId } = req.body;
        if (!leadId) return res.status(400).json({ error: 'leadId is required' });

        const adminKey = req.headers['x-admin-key'];
        if (!adminKey) return res.status(401).json({ error: 'Unauthorized' });

        const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(leadId);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        const existing = db.prepare("SELECT count(*) as count FROM email_sequences WHERE lead_id = ?").get(leadId);
        if (existing.count > 0) return res.status(400).json({ error: 'Sequence already exists' });

        // Fetch chat context (simulated or real from shared DB)
        let chatContext = "";
        try {
            const chatLogs = db.prepare("SELECT user_message, bot_response FROM chat_logs WHERE client_id = ? ORDER BY timestamp ASC").all(lead.client_id);
            chatContext = chatLogs.map(log => `User: ${log.user_message}\nBot: ${log.bot_response}`).join('\n\n');
        } catch(e) { /* ignore if chat_logs not configured perfectly yet */ }

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

Provide a "next_best_action" string: a short, actionable directive (1 sentence maximal) for the human sales rep on what they should do manually right now (e.g., "Schedule a call immediately, high intent $50k budget").

Output EXACTLY in this JSON format:
{
  "next_best_action": "...",
  "emails": [
    { "email_number": 1, "subject": "...", "body": "..." },
    { "email_number": 2, "subject": "...", "body": "..." }
  ]
}
`;
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: "You are an elite B2B sales copywriter." }] },
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
            })
        });

        const geminiData = await geminiResponse.json();
        if (!geminiResponse.ok) throw new Error("Gemini API Error: " + JSON.stringify(geminiData));

        const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(responseText);
        const emails = parsed.emails || [];
        const nextAction = parsed.next_best_action || "Reach out to verify requirement details.";

        const insertSeq = db.prepare("INSERT INTO email_sequences (lead_id, client_id, email_number, subject, body, status, scheduled_for) VALUES (?, ?, ?, ?, ?, 'draft', ?)");
        
        db.transaction(() => {
            let delayDays = 1;
            for (const email of emails) {
                const scheduledFor = Date.now() + (delayDays * 24 * 60 * 60 * 1000);
                insertSeq.run(leadId, lead.client_id, email.email_number, email.subject, email.body, scheduledFor);
                delayDays++;
            }
            db.prepare("UPDATE leads SET pipeline_stage = 'campaign', next_best_action = ? WHERE id = ?").run(nextAction, leadId);
        })();

        res.json({ success: true, count: emails.length, next_best_action: nextAction });

    } catch (e) {
        console.error("Generate sequence error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/sequences', (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const leadId = req.query.leadId;
        if (!leadId) return res.status(400).json({ error: 'Missing leadId' });

        const results = db.prepare("SELECT * FROM email_sequences WHERE lead_id = ? ORDER BY email_number ASC").all(leadId);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/sequences/approve', (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { leadId } = req.body;
        db.transaction(() => {
            db.prepare("UPDATE email_sequences SET status = 'approved' WHERE lead_id = ? AND status = 'draft'").run(leadId);
            db.prepare("UPDATE leads SET pipeline_stage = 'active' WHERE id = ?").run(leadId);
        })();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`CRM API Server running on port ${PORT}`);
});
