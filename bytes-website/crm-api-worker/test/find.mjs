// Helping a lead find our emails. The page shown after confirming names the questions email by its title
// and says where else to look, and the questions email carries no unsubscribe link: it answers the enquiry
// the lead has just confirmed, and the link and its header are what a mailbox reads as bulk mail.
import { DatabaseSync } from 'node:sqlite';
const mod = await import('./src/index.js');
const db = new DatabaseSync(':memory:'); const now = Date.now();
// acme and tags ask their questions by email; plain goes straight to follow-ups
db.exec(`CREATE TABLE crm_settings (client_id TEXT PRIMARY KEY, default_campaign_mode TEXT, auto_approve_campaigns INTEGER, plan TEXT, trial_started_at INTEGER, trial_ends_at INTEGER);
INSERT INTO crm_settings VALUES ('acme','rule',1,'pro',0,0), ('plain','rule',1,'pro',0,0), ('tags','rule',1,'pro',0,0);
CREATE TABLE leads (id INTEGER PRIMARY KEY, client_id TEXT, name TEXT, email TEXT, service TEXT, budget TEXT, summary TEXT, is_verified INTEGER, verification_token TEXT, pipeline_stage TEXT, next_best_action TEXT, timestamp INTEGER, updated_at INTEGER, session_id TEXT);
CREATE TABLE email_sequences (id INTEGER PRIMARY KEY, lead_id INTEGER, client_id TEXT, email_number INTEGER, subject TEXT, body TEXT, status TEXT, scheduled_for INTEGER);
CREATE TABLE chat_logs (id INTEGER PRIMARY KEY, client_id TEXT, user_message TEXT, bot_response TEXT, timestamp INTEGER, session_id TEXT);`);
const addLead = db.prepare("INSERT INTO leads (id, client_id, name, email, service, budget, summary, is_verified, verification_token, pipeline_stage, timestamp) VALUES (?, ?, 'Priya Shah', ?, 'Website', 'Pending', 'Wants a clinic site', 0, ?, 'lead', ?)");
for (const [id, client] of [[1, 'acme'], [2, 'plain'], [3, 'acme'], [4, 'acme'], [5, 'tags']]) addLead.run(id, client, `lead${id}@clinic.com`, `tok-${id}`, now - 60e3);
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const kv = new Map();
for (const [id, company, extra] of [['acme', 'Acme Dental', {}], ['plain', 'Plain Co', { askQuestions: false }], ['tags', 'Tom & <b>Co</b>', {}]]) {
  kv.set(`client:${id}`, JSON.stringify({ companyName: company, alertEmail: `owner@${id}.com`, draftModel: '', readModel: '', ...extra }));
  kv.set(`mail:${id}`, JSON.stringify({ provider: 'resend', fromEmail: `hi@${id}.com`, fromName: 'Sender', apiKey: 're_x' }));
}
// The AI writes nothing here: every email is the built-in text
const LLM = { complete: async () => ({ text: '' }) };
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
console.error = () => {}; console.warn = () => {};

const addr = id => `lead${id}@clinic.com`;
const to = (address) => sent.filter(e => e.to[0] === address);
const verify = async (id) => { const r = await mod.__app.fetch(new Request('http://x/api/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `token=tok-${id}` }), env, ctx); const page = await r.text(); await settle(); return page; };
// What the page says about the next email: its last paragraph of text before any booking button
const says = page => (page.match(/<p[^>]*>(?:(?!<\/p>).)*questions(?:(?!<\/p>).)*<\/p>/s) || page.match(/<p[^>]*>[^<]*in touch[^<]*<\/p>/) || ['(nothing)'])[0];
const unsubIn = e => [e.headers?.['List-Unsubscribe'] ? 'header' : '', /unsubscribe/i.test(e.html) ? 'html' : '', /unsubscribe/i.test(e.text || '') ? 'text' : ''].filter(Boolean).join('+') || 'none';

// 1. The page after confirming, and the questions email it points at
let page = await verify(1);
const q = to(addr(1))[0];
ok('the questions email is sent, as the first email of its thread', !!q && q.subject === 'Your enquiry with Acme Dental', q?.subject);
ok('the page names the questions email by its title', !!q && page.includes(q.subject), says(page));
ok('the page says to look in Promotions or Spam', /Promotions or Spam/.test(says(page)), says(page));
ok('the page still says to reply to it', /few questions/.test(page) && /[Rr]eply to it/.test(says(page)), says(page));
ok('the questions email has no unsubscribe link, in its header, its HTML or its text', !!q && unsubIn(q) === 'none', q ? unsubIn(q) : '(not sent)');
ok('its other thread headers are unchanged', !!q && /^<[^>]+@reply\.bytesfx\.com>$/.test(q.headers['Message-ID']) && /^reply\+[a-z2-7]+@reply\.bytesfx\.com$/.test(q.reply_to), q && JSON.stringify(q.headers));

// 2. The emails after it keep the unsubscribe link
db.exec("UPDATE lead_messages SET scheduled_for = 0 WHERE kind = 'reminder'"); sent.length = 0;
await mod.default.scheduled({ scheduledTime: Date.now() + 60000 * 3 }, env, ctx); await settle();
const rem = to(addr(1))[0];
ok('the reminder joins the same thread and keeps its unsubscribe link', !!rem && rem.subject === `Re: ${q.subject}` && unsubIn(rem) === 'header+html+text', rem ? `${rem.subject} | ${unsubIn(rem)}` : '(not sent)');

// 3. No questions email, nothing to look for
sent.length = 0;
page = await verify(2);
ok('a business that does not ask questions: the page sends nobody looking for an email', /in touch shortly/.test(page) && !/Promotions|Spam/.test(page) && to(addr(2)).length === 0, says(page));

// 4. A lead whose thread started earlier, under another title: the page names the thread they will see
db.prepare("INSERT INTO lead_messages (lead_id, client_id, direction, kind, subject, body, message_id, status, ts) VALUES (3, 'acme', 'out', 'manual', 'Your enquiry with Acme Smiles', 'Hello', '<old@reply.bytesfx.com>', 'sent', ?)").run(now - 86400e3);
sent.length = 0;
page = await verify(3);
const q3 = to(addr(3))[0];
ok('an older thread: the questions email goes out as a reply in it', !!q3 && q3.subject === 'Re: Your enquiry with Acme Smiles', q3?.subject);
ok('an older thread: the page names that thread, not a new title', page.includes('Your enquiry with Acme Smiles') && !page.includes('Your enquiry with Acme Dental'), says(page));

// 5. An unsubscribed lead still gets nothing automatic
db.exec('UPDATE leads SET unsubscribed = 1 WHERE id = 4'); sent.length = 0;
await verify(4);
ok('an unsubscribed lead is not sent the questions email', to(addr(4)).length === 0, to(addr(4)).map(e => e.subject).join(' | '));

// 6. The title on the page is text, never markup
sent.length = 0;
page = await verify(5);
ok('a business name with markup in it is shown as text', page.includes('Your enquiry with Tom &amp; &lt;b&gt;Co&lt;/b&gt;') && !page.includes('<b>Co</b>'), says(page));
