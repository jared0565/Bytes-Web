// The brand is BytesFX. The old name, BytesAI, must not reach a client or come back into the code.
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
const mod = await import('./src/index.js');
const OLD = /bytes[\s_-]?ai/i;
const db = new DatabaseSync(':memory:'); const now = Date.now();
db.exec(`CREATE TABLE crm_settings (client_id TEXT PRIMARY KEY, default_campaign_mode TEXT, auto_approve_campaigns INTEGER, plan TEXT, trial_started_at INTEGER, trial_ends_at INTEGER);
INSERT INTO crm_settings VALUES ('default','ai',1,'pro',0,0), ('acme','ai',1,'pro',0,0);
CREATE TABLE leads (id INTEGER PRIMARY KEY, client_id TEXT, name TEXT, email TEXT, service TEXT, budget TEXT, summary TEXT, is_verified INTEGER, verification_token TEXT, pipeline_stage TEXT, next_best_action TEXT, timestamp INTEGER, updated_at INTEGER, session_id TEXT);
INSERT INTO leads (id, client_id, name, email, service, budget, summary, is_verified, verification_token, pipeline_stage, timestamp) VALUES
 (1,'default','Priya Shah','priya@clinic.com','Websites','Pending','Wants a clinic site',0,'tok-1','lead',${now - 3600e3}),
 (2,'acme','Tom Reed','tom@shop.com','Checkups','Pending','Wants a checkup',0,'tok-2','lead',${now - 3600e3});
CREATE TABLE email_sequences (id INTEGER PRIMARY KEY, lead_id INTEGER, client_id TEXT, email_number INTEGER, subject TEXT, body TEXT, status TEXT, scheduled_for INTEGER);
CREATE TABLE chat_logs (id INTEGER PRIMARY KEY, client_id TEXT, user_message TEXT, bot_response TEXT, timestamp INTEGER, session_id TEXT);`);
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
// The Bytes bot has no company name saved; the client's sender has no name saved
const kv = new Map([['client:acme', JSON.stringify({ companyName: 'Acme Dental' })], ['mail:acme', JSON.stringify({ provider: 'resend', fromEmail: 'hi@acme.com', apiKey: 're_x' })]]);
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v) };
const sent = [];
globalThis.fetch = async (u, o = {}) => { u = String(u);
  if (u.includes('dns-query')) return new Response(JSON.stringify({ Answer: [{ data: '10 route1.mx.cloudflare.net.' }] }));
  if (u.includes('api.resend.com')) { sent.push(JSON.parse(o.body)); return new Response('{"id":"x"}'); }
  return new Response('{}'); };
// No rewrite from the model, so the emails are the worker's own wording
const env = { DB: { prepare: prep, batch: async s => { for (const x of s) await x.run(); } }, JWT_SECRET: 'x', REPLY_DOMAIN: 'reply.bytesfx.com', LLM: { complete: async () => ({ text: '' }) }, ADMIN_EMAILS: 'boss@bytesfx.com', OAUTH_TOKENS: KV, CLIENT_SETTINGS: KV, RESEND_API_KEY: 're_x', WEBSITE_MAIL_FROM: 'contact@bytesfx.com' };
const waits = []; const ctx = { waitUntil: p => waits.push(p) };
const settle = async () => { while (waits.length) await waits.shift(); };
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
const verify = async (token) => { await mod.__app.fetch(new Request('http://x/api/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `token=${token}` }), env, ctx); await settle(); };

await verify('tok-1');
const q = sent.find(e => e.to[0] === 'priya@clinic.com');
ok('Bytes enquiry email is titled with BytesFX', q?.subject === 'Your enquiry with BytesFX', q?.subject);
ok('Bytes enquiry email is signed by the BytesFX team', !!q?.text.includes('The BytesFX team'));
ok('Bytes enquiry email comes from BytesFX', q?.from === 'BytesFX <contact@bytesfx.com>', q?.from);
await verify('tok-2');
const c = sent.find(e => e.to[0] === 'tom@shop.com');
ok('a client sender with no name saved goes out as BytesFX', c?.from === 'BytesFX <hi@acme.com>', c?.from);
ok('no email carries the old name', sent.length >= 2 && !OLD.test(JSON.stringify(sent)), sent.filter(e => OLD.test(JSON.stringify(e))).map(e => e.subject).join(' | '));

// The code itself. Two places may still say the old name: the repair of badge links saved under
// the old domain, and the one-off fix for emails stored before the rename. This file is the third.
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const allowedFiles = ['bytes-website/crm-api-worker/test/brand.mjs', 'bytes-website/crm-api-worker/data-fixes/2026-10-11-bytesfx-name.sql'];
const allowedLine = (file, line) => file === 'chatbot-api/src/index.ts' && line.includes("replace('web.bytesai.com', 'web.bytesfx.com')");
const portfolioFiles = new Set(['bytes-website/src/showcase-content.js','bytes-website/src/showcase-html.js','bytes-website/projects/bytesai-learning/index.html','bytes-website/vite.config.js','bytes-website/scripts/test-showcase-content.mjs','bytes-website/scripts/verify-showcase-ui.mjs','bytes-website/scripts/capture-showcase-assets.mjs']);
// Remove only exact verified portfolio tokens; bare agency names and old agency domains remain detectable.
const brandSource = (file, source) => portfolioFiles.has(file) ? source.replace(/\bBytesAI Learning\b|\blearn\.bytesai\.uk\b|\bbytesai-learning\b/g, 'PORTFOLIO_REFERENCE') : source;
ok('portfolio title and exact route/domain are allowed in showcase files', !OLD.test(brandSource('bytes-website/src/showcase-content.js', 'BytesAI Learning https://learn.bytesai.uk/ /projects/bytesai-learning/')));
ok('bare retired agency branding still fails inside showcase files', OLD.test(brandSource('bytes-website/src/showcase-content.js', 'BytesAI Learning. Contact the BytesAI team.')));
ok('unrecognised old domains still fail inside showcase files', OLD.test(brandSource('bytes-website/src/showcase-content.js', 'https://web.bytesai.com/')));
ok('portfolio exceptions do not apply to agency code', OLD.test(brandSource('chatbot-api/src/index.ts', 'BytesAI Learning')));
const skipDirs = new Set(['node_modules', 'dist', '.wrangler', '.build', '.git']);
const text = /\.(m?js|cjs|ts|html|css|sql|jsonc?|toml|md|txt|svg|ya?ml)$/;
const left = []; let scanned = 0;
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) { if (!skipDirs.has(e.name)) walk(full); continue; }
    const file = relative(root, full).replaceAll('\\', '/');
    if (!text.test(e.name) || e.name === 'package-lock.json' || allowedFiles.includes(file)) continue;
    scanned++;
    // Tags are dropped as well, so a logo written as <span>Bytes</span><span>AI</span> is found too
    const src = brandSource(file, readFileSync(full, 'utf8')); const before = left.length;
    src.split('\n').forEach((line, i) => { if ((OLD.test(line) || OLD.test(line.replace(/<[^>]*>/g, ''))) && !allowedLine(file, line)) left.push(`${file}:${i + 1}`); });
    // ...and one whose two halves sit on different lines
    if (left.length === before && file !== 'chatbot-api/src/index.ts' && /\bbytes[\s_-]?ai(?![a-z])/i.test(src.replace(/<[^>]*>/g, '').replace(/\s+/g, ' '))) left.push(`${file} (split across lines)`);
  }
};
['chatbot-api', 'bytes-website'].forEach(d => walk(join(root, d)));
ok('the code does not use the old name', scanned > 20 && left.length === 0, `${left.length} left in ${scanned} files${left.length ? ': ' + left.slice(0, 40).join(', ') : ''}`);

// The one-off fix for the live database: stored emails not sent yet get the new name, nothing else moves
const fix = new DatabaseSync(':memory:');
fix.exec(`CREATE TABLE email_templates (id INTEGER PRIMARY KEY, client_id TEXT, name TEXT, steps_json TEXT);
INSERT INTO email_templates VALUES (1,'agency_demo','Standard Web Design Sequence','[{"body":"Best,\\nThe BytesAI Team"}]'),
 (2,'acme','Standard Web Design Sequence','[{"body":"We met at the BytesAI stand"}]'), (3,'default','Welcome','[{"body":"The BytesAI team"}]');
CREATE TABLE email_sequences (id INTEGER PRIMARY KEY, client_id TEXT, subject TEXT, body TEXT, status TEXT);
INSERT INTO email_sequences VALUES (1,'default','Hello','The BytesAI team','approved'), (2,'default','Hello','The BytesAI team','sent'),
 (3,'acme','Hello','We met at the BytesAI stand','approved'), (4,'default','Your enquiry with BytesAI','Hi','draft');
CREATE TABLE leads (id INTEGER PRIMARY KEY, client_id TEXT, proposal TEXT);
INSERT INTO leads VALUES (1,'default','{"status":"draft","body":"The BytesAI team"}'), (2,'default','{"status":"sent","body":"The BytesAI team"}'), (3,'default',NULL);`);
const fixSql = readFileSync(join(root, 'bytes-website', 'crm-api-worker', 'data-fixes', '2026-10-11-bytesfx-name.sql'), 'utf8');
fix.exec(fixSql); fix.exec(fixSql); // twice: running it again changes nothing more
const seq = Object.fromEntries(fix.prepare('SELECT id, subject, body FROM email_sequences').all().map(r => [r.id, r]));
const prop = Object.fromEntries(fix.prepare('SELECT id, proposal FROM leads').all().map(r => [r.id, r.proposal]));
const tpl = Object.fromEntries(fix.prepare('SELECT id, steps_json FROM email_templates').all().map(r => [r.id, r.steps_json]));
ok('fix: the stored template is signed by BytesFX', tpl[1] === '[{"body":"Best,\\nThe BytesFX Team"}]' && tpl[3] === '[{"body":"The BytesFX team"}]');
ok('fix: another client\'s template is untouched', tpl[2] === '[{"body":"We met at the BytesAI stand"}]', tpl[2]);
ok('fix: Bytes emails not sent yet get the new name', seq[1].body === 'The BytesFX team' && seq[4].subject === 'Your enquiry with BytesFX');
ok('fix: a sent email and another client\'s email are untouched', seq[2].body === 'The BytesAI team' && seq[3].body === 'We met at the BytesAI stand');
ok('fix: a proposal draft gets the new name, a sent one does not', prop[1] === '{"status":"draft","body":"The BytesFX team"}' && prop[2] === '{"status":"sent","body":"The BytesAI team"}' && prop[3] === null);
