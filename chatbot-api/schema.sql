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
    timestamp INTEGER
);

DROP TABLE IF EXISTS chat_logs;
CREATE TABLE IF NOT EXISTS chat_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    user_message TEXT,
    bot_response TEXT,
    timestamp INTEGER
);
