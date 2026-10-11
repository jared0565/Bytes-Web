-- CRM + chatbot database schema for Cloudflare D1
-- NOTE: In production (chatbot-db), leads and chat_logs already exist.
-- This migration is for fresh local dev environments only.

CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT,
    name TEXT,
    email TEXT,
    service TEXT,
    budget TEXT,
    summary TEXT,
    timestamp INTEGER,
    pipeline_stage TEXT DEFAULT 'lead',
    updated_at INTEGER,
    owner_id TEXT,
    next_best_action TEXT,
    is_verified BOOLEAN DEFAULT 0,
    verification_token TEXT,
    v_email_2_sent BOOLEAN DEFAULT 0,
    v_email_3_sent BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chat_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    user_message TEXT,
    bot_response TEXT,
    timestamp INTEGER
);

CREATE TABLE IF NOT EXISTS email_sequences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    client_id TEXT,
    email_number INTEGER,
    subject TEXT,
    body TEXT,
    status TEXT DEFAULT 'draft',
    scheduled_for INTEGER
);

CREATE TABLE IF NOT EXISTS chat_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT,
    user_message TEXT,
    bot_response TEXT,
    timestamp INTEGER
);

CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'sales_rep'
);

CREATE TABLE IF NOT EXISTS automations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    rule_name TEXT,
    trigger_condition TEXT,
    action TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    social_id TEXT UNIQUE,
    provider TEXT,
    email TEXT UNIQUE,
    name TEXT,
    picture TEXT,
    created_at INTEGER
);

CREATE TABLE IF NOT EXISTS email_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    name TEXT NOT NULL,
    steps_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_settings (
    client_id TEXT PRIMARY KEY,
    default_campaign_mode TEXT DEFAULT 'ai',
    auto_approve_campaigns BOOLEAN DEFAULT 0
);

-- Seed default email template
INSERT OR IGNORE INTO email_templates (client_id, name, steps_json) VALUES (
    'agency_demo',
    'Standard Web Design Sequence',
    '[{"email_number":1,"subject":"Following up on your web design inquiry","body":"Hi {name},\n\nThanks for reaching out about your new website. Let''s schedule a call to discuss your goals.\n\nBest,\nThe BytesFX Team"},{"email_number":2,"subject":"Case studies: How we help brands like yours","body":"Hi {name},\n\nI thought you might like to see some examples of our recent web design projects that helped double conversion rates.\n\nWhen do you have time for a quick chat?"},{"email_number":3,"subject":"Checking in","body":"Hi {name},\n\nJust floating this to the top of your inbox. Are you still looking for a web design partner?"}]'
);
