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
