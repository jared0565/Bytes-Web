import { DatabaseSync } from 'node:sqlite';
const mod = await import('./src/index.js');
const db = new DatabaseSync(':memory:'); const now = Date.now();
db.exec(`CREATE TABLE crm_settings (client_id TEXT PRIMARY KEY, default_campaign_mode TEXT, auto_approve_campaigns INTEGER, plan TEXT, trial_started_at INTEGER, trial_ends_at INTEGER);
INSERT INTO crm_settings VALUES ('acme','ai',1,'pro',0,0);
CREATE TABLE leads (id INTEGER PRIMARY KEY, client_id TEXT, name TEXT, email TEXT, service TEXT, budget TEXT, summary TEXT, is_verified INTEGER, verification_token TEXT, pipeline_stage TEXT, next_best_action TEXT, timestamp INTEGER, updated_at INTEGER, session_id TEXT);
INSERT INTO leads (id, client_id, name, email, service, budget, summary, is_verified, verification_token, pipeline_stage, timestamp) VALUES (1,'acme','Priya Shah','priya@clinic.com','Website','Pending','Wants a clinic site',0,'tok-1','lead',${now - 3600e3});
CREATE TABLE email_sequences (id INTEGER PRIMARY KEY, lead_id INTEGER, client_id TEXT, email_number INTEGER, subject TEXT, body TEXT, status TEXT, scheduled_for INTEGER);
CREATE TABLE chat_logs (id INTEGER PRIMARY KEY, client_id TEXT, user_message TEXT, bot_response TEXT, timestamp INTEGER, session_id TEXT);`);
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const kv = new Map([['client:acme', JSON.stringify({ companyName: 'Acme Dental', bookingUrl: 'https://cal.com/acme', alertEmail: 'owner@acme.com', draftModel: '', readModel: '' })], ['mail:acme', JSON.stringify({ provider: 'resend', fromEmail: 'hi@acme.com', fromName: 'Acme', apiKey: 're_x' })]]);
const llmCalls = [];
const LLM = { complete: async (a) => { llmCalls.push(a); if (/extract facts/.test(a.system)) return { text: '{"need":"New clinic website with booking","goals":"More bookings","budget":"£4,000","timeline":"By March","wants_call":true}' }; if (/Rewrite this email/.test(a.prompt)) return { text: 'Hi Priya,\n\nThanks!\n\n1. What do you need?\n2. Goals?\n3. Budget?\n4. Timeline?\n\nBest,\nThe Acme Dental team' }; return { text: '{"next_best_action":"Call Priya today","emails":[{"subject":"Your clinic site","body":"Hi Priya, here is the plan... https://cal.com/acme"},{"subject":"b","body":"nudge"},{"subject":"c","body":"final"}]}' }; } };
const sent = []; let mxOk = true;
globalThis.fetch = async (u, o = {}) => { u = String(u);
  if (u.includes('dns-query')) return new Response(JSON.stringify({ Answer: mxOk ? [{ data: '10 route1.mx.cloudflare.net.' }] : [] }));
  if (u.includes('api.resend.com')) { sent.push(JSON.parse(o.body)); return new Response('{"id":"x"}'); }
  return new Response('{}'); };
const env = { DB: { prepare: prep, batch: async s => { for (const x of s) await x.run(); } }, JWT_SECRET: 'x', REPLY_DOMAIN: 'reply.bytesfx.com', LLM, ADMIN_EMAILS: 'boss@bytesfx.com', OAUTH_TOKENS: { get: async k => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v) }, CLIENT_SETTINGS: { get: async k => kv.get(k) ?? null } };
const waits = []; const ctx = { waitUntil: p => waits.push(p) };
const settle = async () => { while (waits.length) await waits.shift(); };
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
// 1. verify
let r = await mod.__app.fetch(new Request('http://x/api/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'token=tok-1' }), env, ctx);
const page = await r.text(); await settle();
ok('verify page mentions questions + booking', page.includes('few questions') && page.includes('cal.com/acme'));
const q = sent.find(e => e.to[0] === 'priya@clinic.com'); const alert1 = sent.find(e => e.to[0] === 'owner@acme.com');
ok('questions email in thread', q && /^Your enquiry with Acme Dental$/.test(q.subject) && /^reply\+[a-z2-7]+@reply\.bytesfx\.com$/.test(q.reply_to) && !q.headers['List-Unsubscribe'] && q.text.includes('4.'), q && q.reply_to);
ok('owner alerted (verified)', alert1 && /Verified lead/.test(alert1.subject));
let lead = db.prepare('select * from leads where id=1').get();
ok('stage priority + token', lead.pipeline_stage === 'priority' && lead.thread_token);
ok('reminder scheduled +2d', db.prepare("select count(*) n from lead_messages where kind='reminder' and status='scheduled'").get().n === 1);
// 2. reminder due
db.exec(`update lead_messages set scheduled_for=0 where kind='reminder'`); sent.length = 0;
await mod.default.scheduled({ scheduledTime: Date.now() + 60000 * 3 }, env, ctx); await settle();
const rem = sent.find(e => e.to[0] === 'priya@clinic.com');
ok('reminder sent as Re: same thread', rem && rem.subject === 'Re: Your enquiry with Acme Dental' && rem.headers['In-Reply-To'] && rem.headers.References.includes(q.headers['Message-ID']) && rem.headers['List-Unsubscribe'], rem?.subject);
ok('checkpoint scheduled', db.prepare("select count(*) n from lead_messages where kind='checkpoint' and status='scheduled'").get().n === 1);
// 3. inbound reply
const raw = `From: Priya <priya@clinic.com>\r\nTo: ${q.reply_to}\r\nSubject: Re: Your enquiry with Acme Dental\r\nMessage-ID: <abc@mail.gmail.com>\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n1. A new clinic website with online booking\r\n3. About £4,000\r\n4. By March\r\n\r\nOn Mon, 9 Oct 2026, Acme <hi@acme.com> wrote:\r\n> Hi Priya, 1. What do you need?\r\n`;
let rejected = null; sent.length = 0;
await mod.default.email({ to: q.reply_to, from: 'priya@clinic.com', raw: new Response(raw).body, setReject: (m) => { rejected = m; } }, env, ctx);
lead = db.prepare('select * from leads where id=1').get();
const brief = JSON.parse(lead.brief || '{}');
ok('reply recorded + brief', !rejected && lead.replied_at && brief.need.includes('booking') && lead.budget === '£4,000', JSON.stringify(brief));
const inMsg = db.prepare("select body from lead_messages where direction='in'").get();
ok('full reply kept as evidence', inMsg.body.includes('wrote:'));
ok('checkpoint cancelled', db.prepare("select status from lead_messages where kind='checkpoint'").get().status === 'cancelled');
ok('owner alerted with reply', sent.some(e => e.to[0] === 'owner@acme.com' && /replied/.test(e.subject) && e.html.includes('online booking') && !e.html.includes('wrote:')));
const seqs = db.prepare("select * from email_sequences where lead_id=1 order by email_number").all();
ok('complete reply → proposal draft for review (call lead too), no closing emails', seqs.length === 0 && JSON.parse(db.prepare('select proposal from leads where id=1').get().proposal).status === 'draft' && JSON.parse(db.prepare('select proposal from leads where id=1').get().proposal).body.includes('cal.com/acme'));
ok('drafting/reading models from settings ("" = default luna)', llmCalls.every(c => c.model === ''));
// 4. drip sends email 1 in thread
sent.length = 0; await mod.default.scheduled({ scheduledTime: Date.now() + 60000 * 3 }, env, ctx); await settle();
const f1 = sent.find(e => e.to[0] === 'priya@clinic.com');
ok('nothing auto-sent after reply', !f1);
// unknown recipient
rejected = null; await mod.default.email({ to: 'reply+zzzzzzzzzzzzzz@reply.bytesfx.com', raw: new Response('x').body, setReject: (m) => { rejected = m; } }, env, ctx); ok('unknown token rejected', !!rejected);
// 5. thread API + manual reply + outcome
const tok = await mod.signJWT({ role: 'client', clientId: 'acme' }, 'x');
const call = async (m, path, body) => { const r = await mod.__app.fetch(new Request('http://x' + path, { method: m, headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) }), env, ctx); return [r.status, await r.json()]; };
let [st, j] = await call('GET', '/api/leads/1/messages'); ok('thread API', st === 200 && j.messages.length === 3 && j.brief.need && j.replyTracking === true, j.messages.map(m => m.direction + ':' + m.kind).join(','));
sent.length = 0; [st] = await call('POST', '/api/leads/1/messages', { body: 'Hi Priya, Tuesday 2pm works?' });
ok('manual reply sent, no unsubscribe footer', st === 200 && sent[0].subject.startsWith('Re:') && !sent[0].text.includes('Unsubscribe'));
[st] = await call('POST', '/api/leads/1/outcome', { outcome: 'won', dealValue: '£4,500' });
lead = db.prepare('select * from leads where id=1').get();
ok('won recorded, automation cancelled', st === 200 && lead.outcome === 'won' && lead.pipeline_stage === 'won' && db.prepare("select count(*) n from email_sequences where lead_id=1 and status='approved'").get().n === 0);
// analytics
const atok = await mod.signJWT({ role: 'admin' }, 'x');
const ar = await mod.__app.fetch(new Request('http://x/api/analytics?days=30', { headers: { Authorization: 'Bearer ' + atok } }), env, ctx); const aj = await ar.json();
ok('analytics sales stats', aj.current.won === 1 && aj.current.revenueWon === 4500 && aj.current.replyRate === 1 && aj.current.avgDaysToClose >= 0, JSON.stringify({ w: aj.current.won, rev: aj.current.revenueWon, rr: aj.current.replyRate, wr: aj.current.winRate }));
// unsubscribe
const r2 = await mod.__app.fetch(new Request('http://x/api/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 't=' + lead.thread_token }), env, ctx);
ok('unsubscribe', r2.status === 200 && db.prepare('select unsubscribed u from leads where id=1').get().u === 1);
// settings validation
const [cs, cj] = await call('POST', '/api/config', { settings: { bookingUrl: 'javascript:x' } }); ok('bad booking url rejected', cs === 400, cj.error);
// tracking off → reply-to is the owner
mxOk = false;
// delete removes the lead, its sequence and its conversation
const before = db.prepare('select count(*) n from lead_messages where lead_id=1').get().n;
const [ds] = await call('DELETE', '/api/leads/1');
ok('delete clears conversation', ds === 200 && before > 0 && db.prepare('select count(*) n from lead_messages where lead_id=1').get().n === 0 && db.prepare('select count(*) n from email_sequences where lead_id=1').get().n === 0 && !db.prepare('select id from leads where id=1').get(), `had ${before} msgs`);
