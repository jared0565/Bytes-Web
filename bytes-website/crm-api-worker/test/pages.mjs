// The screens a lead sees after pressing a link in one of our emails: confirm, confirmed, a link that
// cannot be used, an error, and the two unsubscribe screens. They share one dark frame. Opening a link
// only ever shows a button (email scanners open every link); pressing the button is what acts.
import { DatabaseSync } from 'node:sqlite';
const mod = await import('./src/index.js');
const db = new DatabaseSync(':memory:'); const now = Date.now();
db.exec(`CREATE TABLE crm_settings (client_id TEXT PRIMARY KEY, default_campaign_mode TEXT, auto_approve_campaigns INTEGER, plan TEXT, trial_started_at INTEGER, trial_ends_at INTEGER);
INSERT INTO crm_settings VALUES ('acme','rule',1,'pro',0,0), ('bare','rule',1,'pro',0,0), ('tags','rule',1,'pro',0,0), ('book','rule',1,'pro',0,0), ('plain','rule',1,'pro',0,0);
CREATE TABLE leads (id INTEGER PRIMARY KEY, client_id TEXT, name TEXT, email TEXT, service TEXT, budget TEXT, summary TEXT, is_verified INTEGER, verification_token TEXT, pipeline_stage TEXT, next_best_action TEXT, timestamp INTEGER, updated_at INTEGER, session_id TEXT);
CREATE TABLE email_sequences (id INTEGER PRIMARY KEY, lead_id INTEGER, client_id TEXT, email_number INTEGER, subject TEXT, body TEXT, status TEXT, scheduled_for INTEGER);
CREATE TABLE chat_logs (id INTEGER PRIMARY KEY, client_id TEXT, user_message TEXT, bot_response TEXT, timestamp INTEGER, session_id TEXT);`);
const addLead = db.prepare("INSERT INTO leads (id, client_id, name, email, service, budget, summary, is_verified, verification_token, pipeline_stage, timestamp) VALUES (?, ?, 'Priya Shah', ?, 'Website', 'Pending', 'Wants a clinic site', 0, ?, 'lead', ?)");
for (const [id, client] of [[1, 'acme'], [2, 'bare'], [3, 'tags'], [4, 'book'], [5, 'plain'], [6, 'acme'], [7, 'acme']]) addLead.run(id, client, `lead${id}@clinic.com`, `tok-${id}`, now - 60e3);
let breakDb = false;
const prep = (sql) => { if (breakDb) throw new Error('database is down'); let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const kv = new Map();
// bare has no business name saved; tags has markup in its business name and in its sender name
for (const [id, company, sender, extra] of [['acme', 'Acme Dental', 'Acme Team', {}], ['bare', '', 'Bare Sender', {}], ['tags', 'Tom & <b>Co</b>', 'Tom <i>mail</i>', {}], ['book', 'Book Co', 'Book Co', { bookingUrl: 'https://cal.com/book-co' }], ['plain', 'Plain Co', 'Plain Co', { askQuestions: false }]]) {
  kv.set(`client:${id}`, JSON.stringify({ ...(company ? { companyName: company } : {}), alertEmail: `owner@${id}.com`, draftModel: '', readModel: '', ...extra }));
  kv.set(`mail:${id}`, JSON.stringify({ provider: 'resend', fromEmail: `hi@${id}.com`, fromName: sender, apiKey: 're_x' }));
}
const LLM = { complete: async () => ({ text: '' }) };
const sent = [];
globalThis.fetch = async (u, o = {}) => { u = String(u);
  if (u.includes('dns-query')) return new Response(JSON.stringify({ Answer: [{ data: '10 route1.mx.cloudflare.net.' }] }));
  if (u.includes('api.resend.com')) { sent.push(JSON.parse(o.body)); return new Response('{"id":"x"}'); }
  return new Response('{}'); };
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v) };
const env = { DB: { prepare: prep, batch: async s => { for (const x of s) await x.run(); } }, JWT_SECRET: 'x', REPLY_DOMAIN: 'reply.bytesfx.com', LLM, ADMIN_EMAILS: 'boss@bytesfx.com', OAUTH_TOKENS: KV, CLIENT_SETTINGS: KV };
const waits = []; const ctx = { waitUntil: p => waits.push(p) };
const settle = async () => { while (waits.length) await waits.shift().catch(() => {}); };
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
console.error = () => {}; console.warn = () => {};

const screens = [];   // every screen fetched, for the checks they all share
const open = async (name, path, form) => {
  const r = await mod.__app.fetch(new Request(`http://x${path}`, form == null ? {} : { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form }), env, ctx);
  const page = await r.text(); await settle();
  const s = { name, status: r.status, page, title: (page.match(/<title>([^<]*)<\/title>/) || [])[1] || '', h1: (page.match(/<h1[^>]*>([^<]*)<\/h1>/) || [])[1] || '', type: r.headers.get('content-type') || '' };
  screens.push(s); return s;
};
const verified = id => db.prepare('SELECT is_verified AS v FROM leads WHERE id = ?').get(id).v;
const text = page => page.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// 1. Opening the link in the confirmation email
let s = await open('confirm', '/api/verify-email?token=tok-1');
ok('confirm: the screen is shown and nothing is confirmed yet', s.status === 200 && verified(1) === 0, `${s.status} verified=${verified(1)}`);
ok('confirm: it is titled and headed "Confirm your email"', s.title === 'Confirm your email' && s.h1 === 'Confirm your email', `${s.title} | ${s.h1}`);
ok('confirm: it names the business the lead is confirming for', /Acme Dental/.test(text(s.page)) && /so Acme Dental /.test(text(s.page)), text(s.page).slice(0, 160));
ok('confirm: one button, which posts the token back', /<form method="post" action="\/api\/verify-email">/.test(s.page) && s.page.includes('<input type="hidden" name="token" value="tok-1">') && (s.page.match(/<button/g) || []).length === 1 && /<button type="submit"[^>]*>Confirm my email<\/button>/.test(s.page), (s.page.match(/<form[\s\S]*?<\/form>/) || ['(no form)'])[0].slice(0, 240));
s = await open('confirm, no business name saved', '/api/verify-email?token=tok-2');
ok('confirm: a business with no name saved still reads well', s.status === 200 && /so we can reply to your enquiry/.test(text(s.page)) && !/undefined|null|so  /.test(text(s.page)), text(s.page).slice(0, 160));
s = await open('confirm, markup in the business name', '/api/verify-email?token=tok-3');
ok('confirm: a business name with markup in it is shown as text', s.page.includes('Tom &amp; &lt;b&gt;Co&lt;/b&gt;') && !s.page.includes('<b>Co</b>'), text(s.page).slice(0, 120));

// 2. Pressing the button
s = await open('confirmed', '/api/verify-email', 'token=tok-1');
ok('confirmed: the address is confirmed and the screen says so in the words of the button', s.status === 200 && verified(1) === 1 && s.title === 'Email confirmed' && s.h1 === 'Email confirmed', `${s.status} | ${s.title} | ${s.h1}`);
ok('confirmed: it welcomes the lead and names the business', /Welcome, Priya Shah!/.test(text(s.page)) && /Acme Dental/.test(text(s.page)), text(s.page).slice(0, 120));
const q = sent.find(e => e.to[0] === 'lead1@clinic.com');
ok('confirmed: it shows the email to look for as it will appear, sender and title', !!q && q.from.startsWith('Acme Team <') && /class="mail"/.test(s.page) && s.page.includes('>Acme Team<') && s.page.includes(`>${q.subject}<`), q ? `${q.from} | ${q.subject}` : '(no email sent)');
ok('confirmed: it still says where else to look, and to reply', /few questions/.test(text(s.page)) && /look in Promotions or Spam/.test(text(s.page)) && /Reply to it/.test(text(s.page)), text(s.page).slice(-220));
s = await open('confirmed, markup in the sender name', '/api/verify-email', 'token=tok-3');
ok('confirmed: a sender name with markup in it is shown as text', s.page.includes('Tom &lt;i&gt;mail&lt;/i&gt;') && !s.page.includes('<i>mail</i>'), (s.page.match(/class="mail"[\s\S]{0,300}/) || ['(no email shown)'])[0]);
s = await open('confirmed, with a booking link', '/api/verify-email', 'token=tok-4');
ok('confirmed: the booking link is the second button', /<a class="btn btn-ghost" href="https:\/\/cal\.com\/book-co" rel="noopener">Book a call<\/a>/.test(s.page), (s.page.match(/<a [^>]*>[^<]*<\/a>/) || ['(no link)'])[0]);
s = await open('confirmed, no questions asked', '/api/verify-email', 'token=tok-5');
ok('confirmed: a business that asks no questions shows no email to look for', /Our team will be in touch shortly\./.test(text(s.page)) && !/class="mail"/.test(s.page), text(s.page).slice(0, 160));
db.exec("UPDATE leads SET outcome = 'lost' WHERE id = 6");
s = await open('confirmed, closed lead', '/api/verify-email', 'token=tok-6');
ok('confirmed: a closed lead sees only that the email is confirmed', s.h1 === 'Email confirmed' && !/class="mail"|in touch|Promotions/.test(s.page), text(s.page).slice(0, 160));

// 3. A link that cannot be used
s = await open('used link, pressed again', '/api/verify-email', 'token=tok-1');
ok('a second press: the screen says the link was used, and that a lead who confirmed is all set', s.status === 400 && /already been used or has expired/.test(text(s.page)) && /If you.ve already confirmed, you.re all set/.test(text(s.page)), `${s.status} ${text(s.page).slice(0, 160)}`);
s = await open('used link, opened again', '/api/verify-email?token=tok-1');
ok('opening a used link: the same screen, with no button', s.status === 400 && /already been used or has expired/.test(text(s.page)) && !/<button|<form/.test(s.page), `${s.status} ${text(s.page).slice(0, 120)}`);
s = await open('link with no token', '/api/verify-email');
ok('a link with its token missing: says to open it from the email again', s.status === 400 && /Open the link in your email again/.test(text(s.page)) && !/No token provided/.test(s.page), `${s.status} ${text(s.page).slice(0, 160)}`);

// 4. Something went wrong on our side
breakDb = true;
s = await open('error', '/api/verify-email', 'token=tok-7');
const opening = await open('error, opening the link', '/api/verify-email?token=tok-7');
const leaving = await open('error, unsubscribing', '/api/unsubscribe', 't=abcdefghijklmnop');
breakDb = false;
ok('an error on our side: says so, and to try the link again', s.status === 500 && /went wrong on our side/.test(text(s.page)) && /try the link in your email again/.test(text(s.page)) && verified(7) === 0, `${s.status} ${text(s.page).slice(0, 160)}`);
ok('the same screen when opening a link or unsubscribing fails, never raw data', [opening, leaving].every(x => x.status === 500 && /text\/html/.test(x.type) && /went wrong on our side/.test(text(x.page))), [opening, leaving].map(x => `${x.status} ${x.type} ${x.page.slice(0, 60)}`).join(' | '));

// 5. Unsubscribe
const thread = db.prepare('SELECT thread_token AS t FROM leads WHERE id = 1').get().t;
s = await open('unsubscribe', `/api/unsubscribe?t=${thread}`);
ok('unsubscribe: opening the link shows one button and changes nothing', s.status === 200 && s.title === 'Unsubscribe' && /<form method="post" action="\/api\/unsubscribe">/.test(s.page) && s.page.includes(`<input type="hidden" name="t" value="${thread}">`) && /<button type="submit"[^>]*>Unsubscribe me<\/button>/.test(s.page) && db.prepare('SELECT unsubscribed AS u FROM leads WHERE id = 1').get().u === 0, `${s.status} | ${s.title}`);
s = await open('unsubscribed', '/api/unsubscribe', `t=${thread}`);
ok('unsubscribe: pressing it unsubscribes and says so', s.status === 200 && s.title === 'You\'re unsubscribed' && db.prepare('SELECT unsubscribed AS u FROM leads WHERE id = 1').get().u === 1, `${s.status} | ${s.title}`);
s = await open('unsubscribe, broken link', '/api/unsubscribe?t=nope');
ok('unsubscribe: a broken link says to open it from the email again', s.status === 400 && /Open the link in your email again/.test(text(s.page)), `${s.status} ${text(s.page).slice(0, 120)}`);

// 6. What every screen shares
const bad = (test) => screens.filter(x => !test(x)).map(x => x.name).join(', ') || 'none';
ok('every screen is a web page with one heading and its own title', screens.every(x => /text\/html/.test(x.type) && x.title && x.h1 && (x.page.match(/<h1/g) || []).length === 1), bad(x => /text\/html/.test(x.type) && x.title && x.h1 && (x.page.match(/<h1/g) || []).length === 1));
ok('every screen has the dark background, and none keeps the old white page or blue button', screens.every(x => /background:\s*var\(--ink-0\)/.test(x.page) && x.page.includes('--ink-0:#071216') && !/#3987e5|color:#111|#16a34a/.test(x.page)), bad(x => /background:\s*var\(--ink-0\)/.test(x.page) && x.page.includes('--ink-0:#071216') && !/#3987e5|color:#111|#16a34a/.test(x.page)));
ok('no screen runs a script, so opening a link can never press its button', screens.every(x => !/<script|onload=|onsubmit=|http-equiv="refresh"/i.test(x.page)), bad(x => !/<script|onload=|onsubmit=|http-equiv="refresh"/i.test(x.page)));
ok('the titles tell the screens apart', new Set(screens.map(x => x.title)).size >= 6, [...new Set(screens.map(x => x.title))].join(' | '));
ok('buttons and links are styled by class, with hover, focus and pressed states', screens.every(x => !/<(button|a) [^>]*style=/.test(x.page)) && ['.btn:hover', '.btn:focus-visible', '.btn:active'].every(sel => screens[0].page.includes(sel)), bad(x => !/<(button|a) [^>]*style=/.test(x.page)));
ok('motion is switched off for people who ask for less of it', screens.every(x => /prefers-reduced-motion:\s*reduce/.test(x.page)), bad(x => /prefers-reduced-motion:\s*reduce/.test(x.page)));
