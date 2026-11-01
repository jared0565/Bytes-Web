// Framework campaigns: the "Proof and offers" settings, the campaign emails, the proposal
// blocks and the follow-ups after a proposal. Saved facts go in word for word; empty = skipped.
import { DatabaseSync } from 'node:sqlite';
const mod = await import('./src/index.js');
const fw = await import('./src/frameworks.js').catch(() => ({}));
const db = new DatabaseSync(':memory:'); const now = Date.now();
db.exec(`CREATE TABLE crm_settings (client_id TEXT PRIMARY KEY, default_campaign_mode TEXT, auto_approve_campaigns INTEGER, plan TEXT, trial_started_at INTEGER, trial_ends_at INTEGER);
INSERT INTO crm_settings VALUES ('acme','ai',1,'pro',0,0);
CREATE TABLE leads (id INTEGER PRIMARY KEY, client_id TEXT, name TEXT, email TEXT, service TEXT, budget TEXT, summary TEXT, is_verified INTEGER, verification_token TEXT, pipeline_stage TEXT, next_best_action TEXT, timestamp INTEGER, updated_at INTEGER, session_id TEXT);
CREATE TABLE email_sequences (id INTEGER PRIMARY KEY, lead_id INTEGER, client_id TEXT, email_number INTEGER, subject TEXT, body TEXT, status TEXT, scheduled_for INTEGER);
CREATE TABLE chat_logs (id INTEGER PRIMARY KEY, client_id TEXT, user_message TEXT, bot_response TEXT, timestamp INTEGER, session_id TEXT);`);
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const kv = new Map([['client:acme', JSON.stringify({ companyName: 'Acme Dental', bookingUrl: 'https://cal.com/acme', alertEmail: 'owner@acme.com', draftModel: '', readModel: '' })], ['mail:acme', JSON.stringify({ provider: 'resend', fromEmail: 'hi@acme.com', fromName: 'Acme', apiKey: 're_x' })]]);
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v), delete: async k => kv.delete(k), list: async () => ({ keys: [], list_complete: true }) };
const llmCalls = [];
const LLM = { complete: async (a) => { llmCalls.push(a); return { text: '{}' }; } };
const sent = [];
globalThis.fetch = async (u, o = {}) => { u = String(u);
  if (u.includes('dns-query')) return new Response(JSON.stringify({ Answer: [{ data: '10 route1.mx.cloudflare.net.' }] }));
  if (u.includes('api.resend.com')) { sent.push(JSON.parse(o.body)); return new Response('{"id":"x"}'); }
  return new Response('{}'); };
const env = { DB: { prepare: prep, batch: async s => { for (const x of s) await x.run(); } }, JWT_SECRET: 'x', REPLY_DOMAIN: 'reply.bytesfx.com', LLM, ADMIN_EMAILS: 'boss@bytesfx.com', RESEND_API_KEY: 're_x', OAUTH_TOKENS: KV, CLIENT_SETTINGS: KV };
const waits = []; const ctx = { waitUntil: p => waits.push(p) };
const settle = async () => { while (waits.length) await waits.shift(); };
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
const has = (name) => typeof fw[name] === 'function' || fw[name] !== undefined;
const clientTok = await mod.signJWT({ role: 'client', clientId: 'acme' }, 'x');
const adminTok = await mod.signJWT({ role: 'admin', email: 'boss@bytesfx.com' }, 'x');
const call = async (tok, m, path, body) => { const r = await mod.__app.fetch(new Request('http://x' + path, { method: m, headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) }), env, ctx); return [r.status, await r.json().catch(() => ({}))]; };

// ── 1. The "Proof and offers" settings ──────────────────────────────────────
const FIVE = {
  proof: [{ text: 'Clinic site we built', url: 'https://clinic.example' }, { text: '"Booked solid in a month" (Dr Shah)', url: '' }],
  howWeWork: 'A call, a written proposal, then weekly updates. Replies within a day.',
  commitments: 'Fixed quote. Two rounds of changes included.',
  freeStep: 'A free 15-minute review of your website.',
  actNow: { text: 'Founding clients get 20% off', until: '2027-01-31' },
};
{
  const out = {}; const six = Array.from({ length: 6 }, (_, i) => ({ text: `Work ${i}`, url: i === 0 ? 'https://one.example' : '' }));
  const err = has('cleanOffers') ? fw.cleanOffers({ proof: six }, out) : 'missing';
  ok('offers: proof keeps text and https links, at most 5', err === null && out.proof?.length === 5 && out.proof[0].url === 'https://one.example' && out.proof[0].text === 'Work 0', JSON.stringify(out));
}
{
  const out = {}; const err = has('cleanOffers') ? fw.cleanOffers({ proof: [{ text: 'Our site', url: 'http://plain.example' }] }, out) : 'missing';
  ok('offers: a proof link that is not https is refused', err === 'A proof link must be a full https:// address.', err);
}
{
  const out = {}; const err = has('cleanOffers') ? fw.cleanOffers({ actNow: { text: '20% off this month', until: '' } }, out) : 'missing';
  ok('offers: a reason to act now needs an end date', err === 'A reason to act now needs an end date.', err);
  const out2 = {}; const err2 = has('cleanOffers') ? fw.cleanOffers({ actNow: { text: '', until: '2027-01-31' } }, out2) : 'missing';
  ok('offers: an empty reason to act now is stored as nothing', err2 === null && out2.actNow === null, JSON.stringify(out2));
}
{
  const out = {}; const err = has('cleanOffers') ? fw.cleanOffers({ howWeWork: '  ' + 'x'.repeat(700) + '  ', commitments: 'c'.repeat(500), freeStep: 'f'.repeat(300) }, out) : 'missing';
  ok('offers: text is cut to its limit', err === null && out.howWeWork?.length === 600 && out.commitments?.length === 400 && out.freeStep?.length === 200, JSON.stringify({ h: out.howWeWork?.length, c: out.commitments?.length, f: out.freeStep?.length }));
}
{
  const o = has('offersOf') ? fw.offersOf({ actNow: { text: 'Founding offer', until: '2027-01-31' } }) : null;
  const live = (t) => has('actNowLive') && fw.actNowLive(o, Date.parse(t));
  ok('offers: actNowLive is true up to the end of the end date', live('2027-01-31T23:59:00Z') && live('2026-12-01T00:00:00Z'));
  ok('offers: actNowLive is false the day after the end date', has('actNowLive') && !live('2027-02-01T00:00:01Z'));
  const empty = has('offersOf') ? fw.offersOf({}) : null;
  ok('offers: offersOf gives empty values when nothing is saved', empty && Array.isArray(empty.proof) && !empty.proof.length && empty.howWeWork === '' && empty.commitments === '' && empty.freeStep === '' && empty.actNow === null && !fw.actNowLive(empty, now), JSON.stringify(empty));
  ok('offers: proofLine gives the text, then the link when there is one', has('proofLine') && fw.proofLine({ text: 'Clinic site', url: 'https://c.example' }) === 'Clinic site https://c.example' && fw.proofLine({ text: 'Kind words', url: '' }) === 'Kind words');
}
{
  const [st, j] = await call(clientTok, 'POST', '/api/config', { settings: { companyName: 'Acme Dental', ...FIVE } });
  const rec = JSON.parse(kv.get('client:acme'));
  ok('offers: a client save through /api/config keeps them', st === 200 && rec.proof?.length === 2 && rec.proof[0].url === 'https://clinic.example' && rec.howWeWork === FIVE.howWeWork && rec.commitments === FIVE.commitments && rec.freeStep === FIVE.freeStep && rec.actNow?.until === '2027-01-31', `${st} ${JSON.stringify(j)} ${kv.get('client:acme')}`);
  const [st2, j2] = await call(clientTok, 'POST', '/api/config', { settings: { actNow: { text: 'Hurry', until: '' } } });
  ok('offers: /api/config refuses a reason to act now without an end date', st2 === 400 && j2.error === 'A reason to act now needs an end date.', `${st2} ${JSON.stringify(j2)}`);
}
{
  const [st, j] = await call(adminTok, 'POST', '/api/site-settings', { companyName: 'BytesFX', ...FIVE });
  const rec = JSON.parse(kv.get('client:default') || '{}');
  const [, got] = await call(adminTok, 'GET', '/api/site-settings');
  ok('offers: the Bytes settings save keeps them', st === 200 && rec.proof?.length === 2 && rec.howWeWork === FIVE.howWeWork && rec.commitments === FIVE.commitments && rec.freeStep === FIVE.freeStep && rec.actNow?.text === FIVE.actNow.text && got.freeStep === FIVE.freeStep && got.actNow?.until === '2027-01-31', `${st} ${JSON.stringify(j)} ${JSON.stringify(got)}`);
}

// ── 2. Campaign emails: problem, before and after, how we'd do it ───────────
const DAY = 86400000;
const PROOF = { text: 'Clinic site we built', url: 'https://clinic.example' };
const FREE = 'A free 15-minute review of your website.';
db.exec(`INSERT INTO crm_settings VALUES ('rule1','rule',1,'pro',0,0), ('rule2','rule',1,'pro',0,0), ('ai1','ai',1,'pro',0,0)`);
for (const [id, extra] of [['rule1', {}], ['rule2', { proof: [PROOF], freeStep: FREE }], ['ai1', { proof: [PROOF], freeStep: FREE }]]) {
  kv.set(`client:${id}`, JSON.stringify({ companyName: `${id} Co`, askQuestions: false, ...extra }));
  kv.set(`mail:${id}`, JSON.stringify({ provider: 'resend', fromEmail: `hi@${id}.com`, apiKey: 're_x' }));
}
const addLead = db.prepare("INSERT INTO leads (id, client_id, name, email, service, budget, summary, is_verified, verification_token, pipeline_stage, timestamp) VALUES (?, ?, ?, ?, 'Websites', 'Pending', 'Wants a clinic site', 0, ?, 'lead', ?)");
const confirm = async (id, client, name = 'Priya Shah') => {
  addLead.run(id, client, name, `lead${id}@clinic.com`, `tok-${id}`, now - 3600e3);
  const t0 = Date.now();
  await mod.__app.fetch(new Request('http://x/api/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `token=tok-${id}` }), env, ctx); await settle();
  return { t0, rows: db.prepare('SELECT email_number, subject, body, status, scheduled_for FROM email_sequences WHERE lead_id = ? ORDER BY email_number').all(id) };
};
{
  const { t0, rows } = await confirm(10, 'rule1');
  ok('built-in campaign: problem, before and after, how we would do it', rows.length === 3 && rows[0].subject === 'Your enquiry about Websites' && rows[1].subject === "What it looks like once it's done" && rows[2].subject === "How we'd handle it" && rows[0].body.includes('Thanks for getting in touch about Websites.') && rows[2].body.includes('you decide with everything in front of you'), rows.map(r => r.subject).join(' | '));
  ok('built-in campaign: sent on days 1, 3 and 6', rows.map(r => Math.round((r.scheduled_for - t0) / DAY)).join() === '1,3,6', rows.map(r => ((r.scheduled_for - t0) / DAY).toFixed(2)).join());
  ok('built-in campaign: no P.S. when nothing is saved', rows.length === 3 && rows.every(r => !r.body.includes('P.S.') && r.body.endsWith('The rule1 Co team')), rows.map(r => r.body.slice(-60)).join(' | '));
  ok('built-in campaign: email 2 offers a call by reply when there is no booking link', rows[1]?.body.includes('Reply with a couple of times that suit you for a quick call.'), rows[1]?.body);
  ok('campaign emails have no em-dash', rows.every(r => !/\u2014/.test(r.subject + r.body)));
}
{
  const { rows } = await confirm(11, 'rule2');
  ok('built-in campaign: P.S. lines carry the saved proof and free first step word for word', rows.length === 3 && !rows[0].body.includes('P.S.') && rows[1].body.endsWith('\n\nP.S. Some of our work: Clinic site we built https://clinic.example') && rows[2].body.endsWith(`\n\nP.S. ${FREE}`), rows.map(r => r.body.slice(-70)).join(' | '));
}
{
  await confirm(12, 'rule1', "D'Arcy Moss");
  db.exec('UPDATE email_sequences SET scheduled_for = 0 WHERE lead_id = 12 AND email_number = 1'); sent.length = 0;
  await mod.default.scheduled({ scheduledTime: Date.now() }, env, ctx); await settle();
  const m = sent.find(e => e.to[0] === 'lead12@clinic.com');
  ok('a first name with an apostrophe is not escaped twice', m && m.text.includes("Hi D'Arcy,") && !m.text.includes('&#x27;') && !m.html.includes('&amp;#x27;'), m ? m.text.slice(0, 60) : 'not sent');
}
{
  const before = llmCalls.length;
  const llmPrev = LLM.complete;
  LLM.complete = async (a) => { llmCalls.push(a); if (/closing sequence/.test(a.prompt)) return { text: JSON.stringify({ next_best_action: 'Call Sam', emails: [1, 2, 3].map(n => ({ email_number: n, subject: `AI ${n}`, body: `Hi Sam,\n\nAI email ${n}.\n\nThe ai1 Co team` })) }) }; return { text: '{}' }; };
  const { t0, rows } = await confirm(13, 'ai1', 'Sam Lee');
  LLM.complete = llmPrev;
  const seqCall = llmCalls.slice(before).find(a => /closing sequence/.test(a.prompt));
  ok('AI campaign: the prompt sets the three frameworks and holds no saved offers', seqCall && seqCall.prompt.includes('Email 1 (the problem)') && seqCall.prompt.includes('Email 2 (before and after)') && seqCall.prompt.includes("Email 3 (how we'd do it)") && !(seqCall.prompt + seqCall.system).includes('Clinic site we built') && !(seqCall.prompt + seqCall.system).includes(FREE), seqCall ? seqCall.prompt.slice(0, 400) : 'no call');
  ok('AI campaign: P.S. added to emails 2 and 3 from the saved settings', rows.length === 3 && rows[0].subject === 'AI 1' && !rows[0].body.includes('P.S.') && rows[1].body.endsWith('\n\nP.S. Some of our work: Clinic site we built https://clinic.example') && rows[2].body.endsWith(`\n\nP.S. ${FREE}`), rows.map(r => r.body.slice(-70)).join(' | '));
  ok('AI campaign: still sent on days 1, 3 and 6', rows.map(r => Math.round((r.scheduled_for - t0) / DAY)).join() === '1,3,6');
}
{
  const pure = has('ruleCampaignSteps') && has('campaignPS') ? fw.ruleCampaignSteps({ service: '', company: '', bookingUrl: 'https://cal.com/x' }, fw.offersOf({})) : [];
  ok('built-in campaign: no service and no company still read well', pure.length === 3 && pure[0].subject === 'Your enquiry' && pure[0].body.includes('Thanks for getting in touch.') && pure.every(s => s.body.endsWith('Best,\nThe team')) && pure[1].body.includes('Pick a time that suits you: https://cal.com/x') && JSON.stringify(fw.CAMPAIGN_DAYS) === '[1,3,6]', JSON.stringify(pure.map(s => s.subject)));
}

// ── 3. Proposals: why this works for you, and the saved blocks ──────────────
const HOW = 'A call, a written proposal, then weekly updates. Replies within a day.';
const COMMIT = '£500 deposit, the rest on launch';
const PROPOSAL_TEXT = 'Hi Priya,\n\nWhat you need\nA clinic website with booking.\n\nWhy this works for you\nOnline booking fills your diary without phone calls.\n\nWhat we\'ll do\nDesign and build the site with online booking.\n\nTimeline\nStart [START DATE], live by March.\n\nInvestment\n[PRICE]\n\nNext step\nReply YES to go ahead, or tell us what to change.\n\nThe prop1 Co team';
db.exec(`INSERT INTO crm_settings VALUES ('prop1','ai',0,'pro',0,0), ('prop0','ai',0,'pro',0,0)`);
kv.set('client:prop1', JSON.stringify({ companyName: 'prop1 Co', howWeWork: HOW, commitments: COMMIT, proof: [PROOF, { text: 'Bakery shop', url: 'https://bakery.example' }, { text: 'Third piece', url: '' }] }));
kv.set('client:prop0', JSON.stringify({ companyName: 'prop0 Co' }));
for (const id of ['prop1', 'prop0']) kv.set(`mail:${id}`, JSON.stringify({ provider: 'resend', fromEmail: `hi@${id}.com`, apiKey: 're_x' }));
addLead.run(20, 'prop1', 'Priya Shah', 'lead20@clinic.com', 'tok-20', now);
addLead.run(21, 'prop0', 'Priya Shah', 'lead21@clinic.com', 'tok-21', now);
const draft = async (id, client, reply) => {
  const before = llmCalls.length, llmPrev = LLM.complete;
  LLM.complete = async (a) => { llmCalls.push(a); return { text: /proposal/i.test(a.system) ? reply : '{}' }; };
  const tok = await mod.signJWT({ role: 'client', clientId: client }, 'x');
  const [st, j] = await call(tok, 'POST', `/api/leads/${id}/proposal`, { action: 'draft' });
  LLM.complete = llmPrev;
  return { st, p: j.proposal || {}, prompt: llmCalls.slice(before).find(a => /proposal/i.test(a.system))?.prompt || '' };
};
const BLOCKS = `How we work\n${HOW}\n\nWork you can see\n- Clinic site we built https://clinic.example\n- Bakery shop https://bakery.example\n\nWhat you can count on\n${COMMIT}`;
{
  const { st, p, prompt } = await draft(20, 'prop1', PROPOSAL_TEXT);
  ok('proposal prompt asks for Why this works for you', prompt.includes("What you need, Why this works for you, What we'll do, Timeline, Investment, Next step") && prompt.includes('- Why this works for you: one to three sentences linking what we\'ll do to the goals they gave; if they gave none, to what they need.'), prompt.slice(0, 300));
  ok('proposal prompt never holds the saved settings', prompt && !prompt.includes(HOW) && !prompt.includes('£500') && !prompt.includes('clinic.example'));
  const at = (p.body || '').indexOf(BLOCKS), next = (p.body || '').indexOf('\nNext step');
  ok('saved how we work, proof and commitments appear word for word before Next step', st === 200 && at > 0 && next > at && p.body.includes(`${BLOCKS}\n\nNext step`) && !p.body.includes('Third piece'), p.body);
  ok('a proposal stays AI-written when the settings hold a link and a price', p.ai === true && p.body.includes('£500 deposit') && p.body.includes('https://clinic.example'), `ai=${p.ai}`);
}
{
  const { p } = await draft(20, 'prop1', 'junk');
  ok('the fallback proposal carries the same blocks', p.ai === false && p.body.includes(`${BLOCKS}\n\nNext step`) && p.body.includes('Why this works for you\n[WHY THIS FITS THEIR GOALS]'), p.body);
  const tok = await mod.signJWT({ role: 'client', clientId: 'prop1' }, 'x');
  const [st, j] = await call(tok, 'POST', '/api/leads/20/proposal', { action: 'send', body: (p.body || '').replace(/\[(?!WHY THIS FITS)[^\]\n]{2,40}\]/g, 'filled in') });
  ok('the fallback proposal cannot be sent until Why this works for you is written', st === 400 && (j.error || '').includes('[WHY THIS FITS THEIR GOALS]'), `${st} ${j.error}`);
}
{
  const { p } = await draft(21, 'prop0', PROPOSAL_TEXT.replace('prop1', 'prop0'));
  ok('no blocks when nothing is saved', p.ai === true && !p.body.includes('How we work') && !p.body.includes('Work you can see') && !p.body.includes('What you can count on'), p.body);
  ok('proposals have no em-dash', !/\u2014/.test(p.body) && !/\u2014/.test(BLOCKS));
}
{
  const w = has('withExtras') ? fw.withExtras : () => null;
  ok('withExtras appends when there is no Next step line', w('Hi Priya,\n\nBest,\nThe team', 'How we work\nX') === 'Hi Priya,\n\nBest,\nThe team\n\nHow we work\nX' && w('Hi\n\nNext step\nReply YES', '') === 'Hi\n\nNext step\nReply YES', String(w('Hi Priya,\n\nBest,\nThe team', 'How we work\nX')));
  ok('proposalExtras gives nothing when nothing is saved', has('proposalExtras') && fw.proposalExtras(fw.offersOf({})) === '');
}

// ── 4. Follow-ups after a proposal: days 3, 7 and 12, skipped when there's nothing true to say ─
const COMMITS = 'Fixed quote. Two rounds of changes included.';
db.exec(`INSERT INTO crm_settings VALUES ('nud1','ai',0,'pro',0,0), ('nud0','ai',0,'pro',0,0), ('nudx','ai',0,'pro',0,0)`);
kv.set('client:nud1', JSON.stringify({ companyName: 'nud1 Co', proof: [PROOF], commitments: COMMITS, actNow: { text: 'Founding clients get 20% off', until: '2027-01-31' } }));
kv.set('client:nud0', JSON.stringify({ companyName: 'nud0 Co' }));
kv.set('client:nudx', JSON.stringify({ companyName: 'nudx Co', actNow: { text: 'An old offer', until: '2026-01-31' } }));
for (const id of ['nud1', 'nud0', 'nudx']) kv.set(`mail:${id}`, JSON.stringify({ provider: 'resend', fromEmail: `hi@${id}.com`, apiKey: 're_x' }));
const addVerified = db.prepare("INSERT INTO leads (id, client_id, name, email, service, is_verified, pipeline_stage, timestamp) VALUES (?, ?, 'Sam Lee', ?, 'Websites', 1, 'priority', ?)");
const sendProposal = async (id, client) => {
  addVerified.run(id, client, `lead${id}@clinic.com`, now);
  const tok = await mod.signJWT({ role: 'client', clientId: client }, 'x');
  const t0 = Date.now();
  const [st] = await call(tok, 'POST', `/api/leads/${id}/proposal`, { action: 'send', body: `Hi Sam,\n\nWhat you need\nA new site.\n\nInvestment\n£3,000\n\nNext step\nReply YES to go ahead.\n\nThe ${client} Co team` });
  return { st, t0, tasks: db.prepare("SELECT kind, status, scheduled_for FROM lead_messages WHERE lead_id = ? AND direction = 'task' ORDER BY scheduled_for").all(id) };
};
const runDue = async (id) => {
  db.prepare("UPDATE lead_messages SET scheduled_for = 0 WHERE lead_id = ? AND direction = 'task' AND status = 'scheduled'").run(id);
  sent.length = 0;
  await mod.default.scheduled({ scheduledTime: Date.now() }, env, ctx); await settle();
  return sent.filter(e => e.to[0] === `lead${id}@clinic.com`).map(e => e.text);
};
const nudges = [];
{
  const { st, t0, tasks } = await sendProposal(30, 'nud1');
  ok('sending a proposal schedules follow-ups on days 3, 7 and 12', st === 200 && tasks.map(t => `${t.kind}@${Math.round((t.scheduled_for - t0) / DAY)}`).join() === 'proposal_nudge@3,proposal_nudge_2@7,proposal_nudge_3@12' && tasks.every(t => t.status === 'scheduled'), JSON.stringify(tasks.map(t => [t.kind, ((t.scheduled_for - t0) / DAY).toFixed(1)])));
  db.prepare('UPDATE leads SET replied_at = ? WHERE id = 30').run(Date.now());
  const texts = await runDue(30); nudges.push(...texts);
  ok('a lead who replied still gets the follow-ups after the proposal', texts.length === 3, `${texts.length} sent`);
  const f1 = texts.find(t => t.includes('Just checking you received the proposal below'));
  ok('follow-up 1 asks for YES and shows the first proof item', f1 && f1.includes("reply YES and we'll get started") && f1.includes('\n\nSome of our work, in case it helps: Clinic site we built https://clinic.example\n\nBest,\nThe nud1 Co team'), f1);
  const f2 = texts.find(t => t.includes('A quick note in case timing matters'));
  ok('follow-up 2 names the offer and its end date while it runs', f2 && f2.startsWith('Hi Sam,\n\nA quick note in case timing matters: Founding clients get 20% off. This runs until 31 January 2027.\n\nTo go ahead, reply YES. If you have a question first, just ask.\n\nBest,\nThe nud1 Co team'), f2);
  const f3 = texts.find(t => t.includes('This is our last email about the proposal'));
  ok('follow-up 3 is the last email and carries the commitments', f3 && f3.includes("so we won't keep filling your inbox") && f3.includes(`\n\nSo you know what you can count on: ${COMMITS}\n\nBest,\nThe nud1 Co team`), f3);
}
{
  await sendProposal(31, 'nud0');
  const texts = await runDue(31); nudges.push(...texts);
  ok('follow-up 2 is skipped without a reason to act now', texts.length === 2 && !texts.some(t => t.includes('timing matters')), `${texts.length} sent`);
  ok('follow-ups 1 and 3 leave out proof and commitments when none are saved', texts.length === 2 && !texts.some(t => t.includes('Some of our work') || t.includes('So you know what you can count on')));
}
{
  await sendProposal(32, 'nudx');
  const texts = await runDue(32);
  ok('follow-up 2 is skipped after the end date', texts.length === 2 && !texts.some(t => t.includes('An old offer')), `${texts.length} sent`);
}
{
  await sendProposal(33, 'nud1');
  const token = db.prepare('SELECT thread_token FROM leads WHERE id = 33').get().thread_token;
  await mod.default.email({ to: `reply+${token}@reply.bytesfx.com`, from: 'lead33@clinic.com', raw: new Response(`From: lead33@clinic.com\r\nTo: reply+${token}@reply.bytesfx.com\r\nSubject: Re: x\r\n\r\nCould we move the start to April?\r\n`).body, setReject: () => {} }, env, ctx); await settle();
  const left = db.prepare("SELECT count(*) n FROM lead_messages WHERE lead_id = 33 AND direction = 'task' AND kind LIKE 'proposal_nudge%' AND status = 'scheduled'").get().n;
  const texts = await runDue(33);
  ok('a reply cancels the remaining follow-ups', left === 0 && !texts.some(t => /proposal below|timing matters|last email about the proposal/.test(t)), `${left} still scheduled, ${texts.length} sent`);
}
{
  await sendProposal(34, 'nud1'); await sendProposal(35, 'nud1'); await sendProposal(36, 'nud1');
  db.exec("UPDATE leads SET outcome = 'won' WHERE id = 34; UPDATE leads SET outcome = 'lost' WHERE id = 35; UPDATE leads SET unsubscribed = 1 WHERE id = 36");
  const sentTo = [...await runDue(34), ...await runDue(35), ...await runDue(36)];
  ok('Won, Lost or unsubscribe stops the follow-ups', sentTo.length === 0, `${sentTo.length} sent`);
}
ok('follow-ups have no em-dash', nudges.length === 5 && nudges.every(t => !/\u2014/.test(t)), `${nudges.length} checked`);
ok('NUDGE_DAYS lists the three follow-ups', JSON.stringify(fw.NUDGE_DAYS) === '{"proposal_nudge":3,"proposal_nudge_2":7,"proposal_nudge_3":12}');
