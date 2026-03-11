-- Database Schema for Chatbot Agency
DROP TABLE IF EXISTS leads;
CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    name TEXT,
    email TEXT,
    service TEXT,
    budget TEXT,
    summary TEXT,
    status TEXT DEFAULT 'new',
    timestamp INTEGER,
    has_lightning_badge BOOLEAN DEFAULT FALSE
);

DROP TABLE IF EXISTS chat_logs;
CREATE TABLE IF NOT EXISTS chat_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    user_message TEXT,
    bot_response TEXT,
    timestamp INTEGER
);

DROP TABLE IF EXISTS email_sequences;
CREATE TABLE IF NOT EXISTS email_sequences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    client_id TEXT NOT NULL,
    email_number INTEGER NOT NULL,
    subject TEXT,
    body TEXT,
    status TEXT DEFAULT 'draft',
    scheduled_for INTEGER,
    sent_at INTEGER,
    FOREIGN KEY(lead_id) REFERENCES leads(id)
);
