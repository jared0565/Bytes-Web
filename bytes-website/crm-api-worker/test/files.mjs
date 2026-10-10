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
// R2 mock
const r2 = new Map(); env.FILES = { put: async (k, v) => { r2.set(k, new Uint8Array(v)); }, get: async (k) => r2.has(k) ? { body: new Response(r2.get(k)).body } : null, delete: async (ks) => { for (const k of [].concat(ks)) r2.delete(k); } };
let briefJson = '{"need":"Clinic website","goals":"","budget":"","timeline":"","references":"likes example.com","wants_call":false,"contact":""}';
const llm0 = LLM.complete; LLM.complete = async (a) => /extract facts/.test(a.system) ? (llmCalls.push(a), { text: briefJson }) : llm0(a);
await mod.__app.fetch(new Request('http://x/api/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'token=tok-1' }), env, ctx); await settle();
const q = sent.find(e => e.to[0] === 'priya@clinic.com');
ok('questions email has optional 5th question', /5\. \(Optional\)/.test(q.text));
const b64 = (n, ch = 'A') => Buffer.alloc(n, ch).toString('base64').replace(/(.{76})/g, '$1\r\n');
const mime = (text, files) => { const B = 'XXB'; return `From: priya@clinic.com\r\nTo: ${q.reply_to}\r\nSubject: Re: x\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="${B}"\r\n\r\n--${B}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${text}\r\n` + files.map(f => `--${B}\r\nContent-Type: ${f.type}\r\nContent-Disposition: ${f.disp || 'attachment'}; filename="${f.name}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(f.size)}\r\n`).join('') + `--${B}--\r\n`; };
sent.length = 0;
await mod.default.email({ to: q.reply_to, from: 'priya@clinic.com', raw: new Response(mime('We need a clinic website. I like https://example.com/clinic', [
  { name: 'sketch.png', type: 'image/png', size: 3000 }, { name: 'huge.pdf', type: 'application/pdf', size: 11 * 1048576 }, { name: 'virus.exe', type: 'application/octet-stream', size: 500 }, { name: 'logo.png', type: 'image/png', size: 2000, disp: 'inline' },
])).body, setReject: () => {} }, env, ctx);
let lead = db.prepare('select * from leads where id=1').get();
let brief = JSON.parse(lead.brief);
const det = sent.find(e => e.to[0] === 'priya@clinic.com');
ok('incomplete reply → asks only for missing items, once', det && /great result/.test(det.text) && /budget/.test(det.text) && /done by/.test(det.text) && !/What you need help with/.test(det.text) && /Google Drive or Dropbox link/.test(det.text), det?.text.slice(0, 400));
ok('no proposal yet; timeout scheduled', !lead.proposal && db.prepare("select count(*) n from lead_messages where kind='details_timeout' and status='scheduled'").get().n === 1);
ok('links + references kept in brief', brief.links?.[0] === 'https://example.com/clinic' && brief.references);
const files = db.prepare('select name, status, note, r2_key, size from lead_files order by id').all();
ok('png saved to R2, big pdf + exe skipped, inline logo ignored', files.length === 3 && files[0].status === 'stored' && r2.has(files[0].r2_key) && files[1].status === 'skipped' && /Over 10 MB/.test(files[1].note) && files[2].note === 'File type not accepted', JSON.stringify(files.map(f => [f.name, f.status, f.note])));
ok('owner alert lists files + what was asked', sent.some(e => e.to[0] === 'owner@acme.com' && /sketch\.png/.test(e.html) && /asked them for what/.test(e.html)));
// second reply with the rest → proposal
briefJson = '{"need":"","goals":"More bookings","budget":"£4,000","timeline":"March","wants_call":true,"contact":"call"}';
sent.length = 0;
await mod.default.email({ to: q.reply_to, from: 'priya@clinic.com', raw: new Response(mime('More bookings, £4,000, March. A call would be nice.', [])).body, setReject: () => {} }, env, ctx);
lead = db.prepare('select * from leads where id=1').get(); brief = JSON.parse(lead.brief);
ok('second reply fills the gaps (merge keeps need)', brief.need === 'Clinic website' && brief.budget === '£4,000' && brief.wantsCall && brief.links.length === 1, lead.brief);
ok('then proposal drafted (with booking link), not asked again', JSON.parse(lead.proposal || '{}').status === 'draft' && JSON.parse(lead.proposal).body.includes('cal.com/acme') && !sent.some(e => e.to[0] === 'priya@clinic.com'));
ok('timeout cancelled by the reply', db.prepare("select status from lead_messages where kind='details_timeout'").get().status === 'cancelled');
// per-lead 25MB cap
db.exec("update lead_files set size = 24*1048576 where name='sketch.png'");
sent.length = 0;
await mod.default.email({ to: q.reply_to, from: 'priya@clinic.com', raw: new Response(mime('another', [{ name: 'more.jpg', type: 'image/jpeg', size: 2 * 1048576 }])).body, setReject: () => {} }, env, ctx);
ok('per-lead 25 MB cap → skipped + link requested', db.prepare("select note from lead_files where name='more.jpg'").get().note.includes('25 MB') && sent.some(e => e.to[0] === 'priya@clinic.com' && /Dropbox/.test(e.text)));
// API: messages include files; download; status
const tok = await mod.signJWT({ role: 'client', clientId: 'acme' }, 'x');
const req = (m, path) => mod.__app.fetch(new Request('http://x' + path, { method: m, headers: { Authorization: 'Bearer ' + tok } }), env, ctx);
const j = await (await req('GET', '/api/leads/1/messages')).json();
ok('thread API returns files', j.files.length === 4 && j.files[0].name === 'sketch.png' && !('r2_key' in j.files[0]));
let r = await req('GET', `/api/leads/1/files/${j.files[0].id}`);
ok('download streams with attachment headers', r.status === 200 && /attachment; filename="sketch.png"/.test(r.headers.get('Content-Disposition')) && r.headers.get('Content-Type') === 'image/png' && (await r.arrayBuffer()).byteLength === 3000);
r = await req('GET', `/api/leads/1/files/${j.files[1].id}`); ok('skipped file not downloadable', r.status === 404);
const other = await mod.signJWT({ role: 'client', clientId: 'someoneelse' }, 'x');
r = await mod.__app.fetch(new Request(`http://x/api/leads/1/files/${j.files[0].id}`, { headers: { Authorization: 'Bearer ' + other } }), env, ctx); ok('other clients cannot download', r.status === 404);
const st = await (await req('GET', '/api/sales/status')).json();
ok('status reports storage for the client', st.files.bytes === 24 * 1048576 && st.files.scope === 'yours' && st.files.warn === false, JSON.stringify(st.files));
db.exec("update lead_files set size = 9*1024*1024*1024 where name='sketch.png'");
const atok = await mod.signJWT({ role: 'admin' }, 'x');
const sa = await (await mod.__app.fetch(new Request('http://x/api/sales/status', { headers: { Authorization: 'Bearer ' + atok } }), env, ctx)).json();
ok('admin warned at 8 GB', sa.files.warn === true && sa.files.scope === 'all');
// cleanup: lost > 90 days removes files; won keeps
db.exec(`INSERT INTO leads (id, client_id, name, email, pipeline_stage, timestamp, outcome, closed_at, updated_at) VALUES (5,'acme','W','w@x.com','won',0,'won',0,0), (6,'acme','L','l@x.com','lost',0,'lost',0,0)`);
await env.FILES.put('leads/5/a.png', new ArrayBuffer(5)); await env.FILES.put('leads/6/b.png', new ArrayBuffer(5));
db.exec(`INSERT INTO lead_files (lead_id, client_id, name, size, r2_key, status, ts) VALUES (5,'acme','a.png',5,'leads/5/a.png','stored',0),(6,'acme','b.png',5,'leads/6/b.png','stored',0)`);
await mod.default.scheduled({ scheduledTime: Date.UTC(2026, 9, 10, 3, 7) }, env, ctx); await settle();
ok('cleanup: lost 90d+ removed, won kept, active lead kept', !r2.has('leads/6/b.png') && r2.has('leads/5/a.png') && r2.has(files[0].r2_key));
// delete lead removes its files
const key1 = files[0].r2_key;
r = await req('DELETE', '/api/leads/1'); ok('delete lead removes R2 files + rows', r.status === 200 && !r2.has(key1) && db.prepare('select count(*) n from lead_files where lead_id=1').get().n === 0);
// timeout path: no answer to details → draft with blanks
db.exec(`INSERT INTO leads (id, client_id, name, email, is_verified, pipeline_stage, timestamp, thread_token, replied_at, brief, updated_at) VALUES (7,'acme','Tim','tim@x.com',1,'priority',${Date.now()},'tttttttttttttt',${Date.now()},'{"need":"Logo","detailsAskedAt":1}',${Date.now()})`);
db.exec(`INSERT INTO lead_messages (lead_id, client_id, direction, kind, status, scheduled_for, ts) VALUES (7,'acme','task','details_timeout','scheduled',0,0)`);
sent.length = 0; await mod.default.scheduled({ scheduledTime: Date.now() + 120000 }, env, ctx); await settle();
const p7 = JSON.parse(db.prepare('select proposal from leads where id=7').get().proposal || 'null');
ok('details timeout → proposal drafted with blanks + owner alerted', p7?.status === 'draft' && sent.some(e => e.to[0] === 'owner@acme.com' && /Still unknown: goals, budget, timeline/.test(e.html)) && !sent.some(e => e.to[0] === 'tim@x.com'));
