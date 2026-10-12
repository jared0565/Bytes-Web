// How emails greet a lead: by first name, or "Hi there," when there is no name to use.
// The chat saves a lead who gave no name as "Visitor": a label for the dashboard, not a name.
import { DatabaseSync } from 'node:sqlite';
const mod = await import('./src/index.js');
const db = new DatabaseSync(':memory:'); const now = Date.now();
// acme asks its questions by email; plain and aico go straight to follow-ups (plain: built-in text, aico: AI-written)
db.exec(`CREATE TABLE crm_settings (client_id TEXT PRIMARY KEY, default_campaign_mode TEXT, auto_approve_campaigns INTEGER, plan TEXT, trial_started_at INTEGER, trial_ends_at INTEGER);
INSERT INTO crm_settings VALUES ('acme','ai',1,'pro',0,0), ('plain','rule',1,'pro',0,0), ('aico','ai',1,'pro',0,0);
CREATE TABLE leads (id INTEGER PRIMARY KEY, client_id TEXT, name TEXT, email TEXT, service TEXT, budget TEXT, summary TEXT, is_verified INTEGER, verification_token TEXT, pipeline_stage TEXT, next_best_action TEXT, timestamp INTEGER, updated_at INTEGER, session_id TEXT);
CREATE TABLE email_sequences (id INTEGER PRIMARY KEY, lead_id INTEGER, client_id TEXT, email_number INTEGER, subject TEXT, body TEXT, status TEXT, scheduled_for INTEGER);
CREATE TABLE chat_logs (id INTEGER PRIMARY KEY, client_id TEXT, user_message TEXT, bot_response TEXT, timestamp INTEGER, session_id TEXT);`);
const addLead = db.prepare("INSERT INTO leads (id, client_id, name, email, service, budget, summary, is_verified, verification_token, pipeline_stage, timestamp) VALUES (?, ?, ?, ?, 'Website', 'Pending', 'Wants a clinic site', 0, ?, 'lead', ?)");
// Leads 1-3 arrive from the chat (no token yet: the new-lead webhook makes it). The others are waiting to confirm.
for (const [id, client, name, token] of [[1, 'acme', 'Visitor', null], [2, 'acme', '', null], [3, 'acme', 'Priya Shah', null],
  [11, 'plain', 'Visitor', 'tok-11'], [12, 'plain', '', 'tok-12'], [13, 'plain', 'Priya Shah', 'tok-13'], [21, 'aico', ' visitor ', 'tok-21']]) addLead.run(id, client, name, `lead${id}@clinic.com`, token, now - 60e3);
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const kv = new Map();
for (const [id, company, extra] of [['acme', 'Acme Dental', {}], ['plain', 'Plain Co', { askQuestions: false }], ['aico', 'Ai Co', { askQuestions: false }]]) {
  kv.set(`client:${id}`, JSON.stringify({ companyName: company, alertEmail: `owner@${id}.com`, draftModel: '', readModel: '', ...extra }));
  kv.set(`mail:${id}`, JSON.stringify({ provider: 'resend', fromEmail: `hi@${id}.com`, fromName: company, apiKey: 're_x' }));
}
// The AI reads a reply into answers, and writes nothing: every email here is the built-in text
const llmCalls = [];
const LLM = { complete: async (a) => { llmCalls.push(a); return { text: /extract facts/.test(a.system) ? '{"need":"New clinic website with booking","goals":"More bookings","budget":"£4,000","timeline":"By March","wants_call":false}' : '' }; } };
const sent = [];
globalThis.fetch = async (u, o = {}) => { u = String(u);
  if (u.includes('dns-query')) return new Response(JSON.stringify({ Answer: [{ data: '10 route1.mx.cloudflare.net.' }] }));
  if (u.includes('api.resend.com')) { sent.push(JSON.parse(o.body)); return new Response('{"id":"x"}'); }
  return new Response('{}'); };
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v) };
const env = { DB: { prepare: prep, batch: async s => { for (const x of s) await x.run(); } }, JWT_SECRET: 'x', REPLY_DOMAIN: 'reply.bytesfx.com', LLM, ADMIN_EMAILS: 'boss@bytesfx.com', OAUTH_TOKENS: KV, CLIENT_SETTINGS: KV };
const waits = []; const ctx = { waitUntil: p => waits.push(p) };
const settle = async () => { while (waits.length) await waits.shift(); };
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
console.error = () => {}; console.warn = () => {}; // the worker logs the AI writes that fail here on purpose

const addr = id => `lead${id}@clinic.com`;
const to = (address) => sent.filter(e => e.to[0] === address);
// The opening words of an email, from its plain text or, for the confirmation email, its HTML
const opens = e => e ? ((e.text || e.html.replace(/<[^>]+>/g, ' ')).trim().match(/^Hi[^,]*,/) || ['(no greeting)'])[0] : '(not sent)';
const verify = async (token) => { const r = await mod.__app.fetch(new Request('http://x/api/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `token=${token}` }), env, ctx); const page = await r.text(); await settle(); return page; };
const tokenOf = id => db.prepare('SELECT verification_token AS t FROM leads WHERE id = ?').get(id).t;

// 1. The confirmation email, sent when the chat hands a new lead over
for (const id of [1, 2, 3]) { await mod.__app.fetch(new Request('http://x/api/webhooks/new-lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId: id }) }), env, ctx); await settle(); }
let got = [1, 2, 3].map(id => opens(to(addr(id))[0]));
ok('confirmation email: a lead the chat saved as "Visitor" is greeted "Hi there,"', got[0] === 'Hi there,', got[0]);
ok('confirmation email: a lead with no name is greeted "Hi there,"', got[1] === 'Hi there,', got[1]);
ok('confirmation email: a named lead is greeted by first name', got[2] === 'Hi Priya,', got[2]);

// 2. Confirming the address: the page, the questions email, the owner's alert, and what the AI is told
sent.length = 0; llmCalls.length = 0;
const pages = [];
for (const id of [1, 2, 3]) pages.push(await verify(tokenOf(id)));
ok('the "email verified" page does not welcome "Visitor"', pages[0].includes('Welcome!') && !pages[0].includes('Visitor') && pages[1].includes('Welcome!'), (pages[0].match(/Welcome[^<]*/) || [''])[0]);
ok('the page still welcomes a named lead by name', pages[2].includes('Welcome, Priya Shah!'), (pages[2].match(/Welcome[^<]*/) || [''])[0]);
got = [1, 2, 3].map(id => opens(to(addr(id))[0]));
ok('questions email: "Hi there," with no name, first name otherwise', got[0] === 'Hi there,' && got[1] === 'Hi there,' && got[2] === 'Hi Priya,', got.join(' | '));
let alerts = to('owner@acme.com').map(e => e.subject);
ok('the owner\'s alert names a lead without a name by email address', alerts[0] === `Verified lead: ${addr(1)}` && alerts[1] === `Verified lead: ${addr(2)}` && alerts[2] === 'Verified lead: Priya Shah' && !to('owner@acme.com')[0].html.includes('Visitor'), alerts.join(' | '));
let asked = llmCalls.filter(c => /Rewrite this email/.test(c.prompt)).map(c => c.prompt);
ok('the AI rewriting the questions is told the name is not known, never "Visitor"', asked.length === 3 && !/Visitor/.test(asked[0]) && /name not given/.test(asked[0]) && /name not given/.test(asked[1]) && /Lead: Priya Shah;/.test(asked[2]), (asked[0] || '').slice(asked[0]?.indexOf('Lead:') ?? 0, (asked[0]?.indexOf('Lead:') ?? 0) + 70));

// 3. The reminder two days later
const questions = to(addr(1))[0];
db.exec("UPDATE lead_messages SET scheduled_for = 0 WHERE kind = 'reminder'"); sent.length = 0;
await mod.default.scheduled({ scheduledTime: Date.now() + 60000 * 3 }, env, ctx); await settle();
got = [1, 2, 3].map(id => opens(to(addr(id))[0]));
ok('reminder: "Hi there," with no name, first name otherwise', got[0] === 'Hi there,' && got[1] === 'Hi there,' && got[2] === 'Hi Priya,', got.join(' | '));

// 4. The lead answers: the proposal drafted for them, the alert, and what the AI is told
sent.length = 0; llmCalls.length = 0;
const raw = `From: <${addr(1)}>\r\nTo: ${questions.reply_to}\r\nSubject: Re: ${questions.subject}\r\nMessage-ID: <abc@mail.gmail.com>\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n1. A new clinic website with online booking\r\n2. More bookings\r\n3. About £4,000\r\n4. By March\r\n`;
await mod.default.email({ to: questions.reply_to, from: addr(1), raw: new Response(raw).body, setReject: () => {} }, env, ctx); await settle();
const proposal = JSON.parse(db.prepare('SELECT proposal FROM leads WHERE id = 1').get().proposal || '{}');
ok('proposal: a lead with no name is greeted "Hi there,"', String(proposal.body || '').startsWith('Hi there,'), String(proposal.body || '(no proposal)').slice(0, 24));
asked = llmCalls.filter(c => /Draft a proposal email/.test(c.prompt)).map(c => c.prompt);
ok('the AI drafting the proposal is told the name is not known, never "Visitor"', asked.length === 1 && !/Visitor/.test(asked[0]) && /name not given/.test(asked[0]), (asked[0] || '(not asked)').slice(0, 90));
alerts = to('owner@acme.com').map(e => e.subject);
ok('the owner\'s alert about a reply names the lead by email address', alerts.some(s => s.startsWith(addr(1))) && !alerts.some(s => /Visitor/.test(s)), alerts.join(' | '));

// 5. Follow-ups that are not AI-written
sent.length = 0;
for (const id of [11, 12, 13]) await verify(`tok-${id}`);
const bodies = id => db.prepare('SELECT body FROM email_sequences WHERE lead_id = ? ORDER BY id').all(id).map(r => r.body);
const starts = (id, hi) => bodies(id).length === 3 && bodies(id).every(b => b.startsWith(hi));
ok('follow-ups: a lead the chat saved as "Visitor" is greeted "Hi there,"', starts(11, 'Hi there,\n'), (bodies(11)[0] || '(none)').slice(0, 20));
ok('follow-ups: a lead with no name is greeted "Hi there,"', starts(12, 'Hi there,\n'), (bodies(12)[0] || '(none)').slice(0, 20));
ok('follow-ups: a named lead is greeted by first name', starts(13, 'Hi Priya,\n'), (bodies(13)[0] || '(none)').slice(0, 20));
alerts = to('owner@plain.com').map(e => e.subject);
ok('the owner\'s alert without the questions email also uses the email address', alerts[0] === `Verified lead: ${addr(11)}` && alerts[2] === 'Verified lead: Priya Shah', alerts.join(' | '));

// 6. AI-written follow-ups: what the AI is told (it writes nothing here, so the built-in text is used)
llmCalls.length = 0;
await verify('tok-21');
asked = llmCalls.filter(c => /closing sequence/.test(c.prompt)).map(c => c.prompt);
ok('the AI writing follow-ups is told the name is not known, never "Visitor"', asked.length === 1 && !/Lead: *visitor/i.test(asked[0]) && /name not given/.test(asked[0]), (asked[0] || '(not asked)').slice(asked[0]?.indexOf('Lead:') ?? 0, (asked[0]?.indexOf('Lead:') ?? 0) + 70));
ok('"visitor" in any letter case, with spaces around it, is still no name', starts(21, 'Hi there,\n'), (bodies(21)[0] || '(none)').slice(0, 20));
