// Where sign-ups come from: the onboarding page sends the ad tag a visitor arrived with, register saves it on
// the new client, and Analytics → Visitors counts sign-ups by source and campaign next to the visitors.
import { DatabaseSync } from 'node:sqlite';
const mod = await import('./src/index.js');
const db = new DatabaseSync(':memory:');
// crm_settings as production has it today: no signup columns yet
db.exec(`CREATE TABLE crm_settings (client_id TEXT PRIMARY KEY, default_campaign_mode TEXT, auto_approve_campaigns INTEGER, plan TEXT DEFAULT 'free', trial_started_at INTEGER DEFAULT 0, trial_ends_at INTEGER DEFAULT 0);
CREATE TABLE chat_logs (id INTEGER PRIMARY KEY, client_id TEXT, session_id TEXT, timestamp INTEGER);
CREATE TABLE leads (id INTEGER PRIMARY KEY, client_id TEXT, timestamp INTEGER);`);
let blockAlter = false;
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; },
  all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null,
  run: async () => { if (blockAlter && /ALTER TABLE crm_settings/i.test(sql)) throw new Error('D1 refused the ALTER'); const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const kvs = () => { const mp = new Map(); return { mp, get: async k => mp.get(k) ?? null, put: async (k, v) => mp.set(k, v), delete: async k => mp.delete(k), list: async () => ({ keys: [] }) }; };
const env = { DB: { prepare: prep }, JWT_SECRET: 'x', OAUTH_TOKENS: kvs(), CLIENT_SETTINGS: kvs() };
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);

let ip = 0;
// What onboarding/main.js sends, from its own address each time (register allows 5 an hour per address)
const register = (clientId, extra = {}, headers = {}) => mod.__app.fetch(new Request('http://x/api/register', { method: 'POST',
  headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': `10.0.0.${++ip}`, ...headers },
  body: JSON.stringify({ clientId, ownerEmail: `${clientId}@example.com`, settings: { companyName: clientId, website: `${clientId}.com` }, ...extra }) }), env, { waitUntil() {} });
const stored = (id) => { try { return db.prepare('SELECT signup_source s, signup_campaign c FROM crm_settings WHERE client_id = ?').get(id) ?? null; } catch (_) { return null; } };
const admin = await mod.signJWT({ role: 'admin' }, 'x');
const visitors = async () => { const r = await mod.__app.fetch(new Request('http://x/api/analytics/visitors?days=30', { headers: { Authorization: `Bearer ${admin}` } }), env, { waitUntil() {} }); return [r.status, await r.json().catch(() => ({}))]; };

// Before any sign-up is tracked, and even if the database refuses the new columns, nothing breaks
blockAlter = true;
let [st, d] = await visitors();
ok('Visitors still loads when the sign-up columns cannot be added', st === 200 && d.signups?.total === 0, `${st} ${JSON.stringify(d.signups)}`);
let res = await register('fail-one', { source: 'fb', campaign: 'spring-sale' });
ok('a sign-up still succeeds when its source cannot be saved', res.status === 200, res.status);
ok('  and the new client is created', !!db.prepare("SELECT 1 FROM crm_settings WHERE client_id = 'fail-one'").get());
blockAlter = false;

// Tagged ad links: the source gets the same readable name a visit from that tag gets
res = await register('tag-fb', { source: 'fb', campaign: 'spring-sale' });
ok('a sign-up from a tagged Facebook ad saves "Facebook" and its campaign', res.status === 200 && stored('tag-fb')?.s === 'Facebook' && stored('tag-fb')?.c === 'spring-sale', JSON.stringify(stored('tag-fb')));
await register('tag-li', { source: 'linkedin', campaign: 'spring-sale' });
ok('a sign-up from a tagged LinkedIn ad saves "LinkedIn"', stored('tag-li')?.s === 'LinkedIn' && stored('tag-li')?.c === 'spring-sale', JSON.stringify(stored('tag-li')));
await register('plain-one');
ok('a sign-up with no tag is saved as not tagged (empty, not missing)', stored('plain-one')?.s === '' && stored('plain-one')?.c === '', JSON.stringify(stored('plain-one')));

// Do Not Track and Global Privacy Control: the tag is never saved, whatever the page sent
await register('gpc-one', { source: 'fb', campaign: 'spring-sale' }, { 'Sec-GPC': '1' });
ok('Global Privacy Control: no source or campaign is saved', stored('gpc-one')?.s === '' && stored('gpc-one')?.c === '', JSON.stringify(stored('gpc-one')));
await register('dnt-one', { source: 'fb', campaign: 'spring-sale' }, { DNT: '1' });
ok('Do Not Track: no source or campaign is saved', stored('dnt-one')?.s === '' && stored('dnt-one')?.c === '', JSON.stringify(stored('dnt-one')));

// Junk from the page is cleaned, never stored as sent
await register('junk-one', { source: { evil: 1 }, campaign: 'a\u0000b\u001f' + 'c'.repeat(200) });
const j1 = stored('junk-one');
ok('a source that is not text is dropped', j1?.s === '', JSON.stringify(j1));
ok('control characters are removed and a campaign is cut to 80 characters', j1?.c === 'ab' + 'c'.repeat(78), JSON.stringify(j1?.c));
await register('junk-two', { source: 'x'.repeat(100) });
ok('a source is cut to 60 characters', stored('junk-two')?.s === 'X' + 'x'.repeat(59), JSON.stringify(stored('junk-two')?.s));
res = await register('junk-three', { source: 42, campaign: ['a'] });
ok('numbers and lists do not stop a sign-up', res.status === 200 && stored('junk-three')?.s === '' && stored('junk-three')?.c === '', `${res.status} ${JSON.stringify(stored('junk-three'))}`);

// The source is for Analytics only: a client's own settings never include it
const ctok = await mod.signJWT({ role: 'client', clientId: 'tag-fb' }, 'x');
res = await mod.__app.fetch(new Request('http://x/api/crm-settings', { headers: { Authorization: `Bearer ${ctok}` } }), env, { waitUntil() {} });
const own = await res.json().catch(() => ({}));
ok("a client's own settings leave out where they signed up from", res.status === 200 && own.plan === 'free' && !('signup_source' in own) && !('signup_campaign' in own), `${res.status} ${Object.keys(own).join(',')}`);

// A client from before tracking (NULL) and one from outside the period are left out of the counts
const now = Date.now();
db.prepare("INSERT INTO crm_settings (client_id, plan, trial_started_at) VALUES ('before-tracking', 'free', ?)").run(now - 1000);
db.prepare("INSERT INTO crm_settings (client_id, plan, trial_started_at, signup_source, signup_campaign) VALUES ('long-ago', 'free', ?, 'Facebook', 'spring-sale')").run(now - 60 * 86400000);

// Visits in the same period: 4 Facebook and 2 LinkedIn from the campaign, 3 direct
const pv = db.prepare('INSERT INTO page_views (site, ts, day, visitor, path, entry, source, campaign) VALUES (?, ?, ?, ?, ?, 1, ?, ?)');
const day = new Date(now).toISOString().slice(0, 10);
['f1', 'f2', 'f3', 'f4'].forEach(v => pv.run('default', now - 5000, day, v, '/ai-chatbot/', 'Facebook', 'spring-sale'));
['l1', 'l2'].forEach(v => pv.run('default', now - 5000, day, v, '/ai-chatbot/', 'LinkedIn', 'spring-sale'));
['d1', 'd2', 'd3'].forEach(v => pv.run('default', now - 5000, day, v, '/', null, null));

[st, d] = await visitors();
const s = d.signups || {};
const row = (list, name) => (list || []).find(r => r.name === name);
ok('Visitors reports the sign-ups of the period', st === 200 && s.total === 8, `${st} total ${s.total}`);
ok('  Facebook: 1 sign-up from 4 visitors (25%)', row(s.sources, 'Facebook')?.signups === 1 && row(s.sources, 'Facebook')?.visitors === 4 && row(s.sources, 'Facebook')?.rate === 0.25, JSON.stringify(row(s.sources, 'Facebook')));
ok('  LinkedIn: 1 sign-up from 2 visitors (50%)', row(s.sources, 'LinkedIn')?.signups === 1 && row(s.sources, 'LinkedIn')?.visitors === 2 && row(s.sources, 'LinkedIn')?.rate === 0.5, JSON.stringify(row(s.sources, 'LinkedIn')));
ok('  untagged and opted-out sign-ups are one "Not tagged" row, with no rate', row(s.sources, 'Not tagged')?.signups === 5 && row(s.sources, 'Not tagged')?.rate === null, JSON.stringify(row(s.sources, 'Not tagged')));
ok('  a source with no visits has no rate', row(s.sources, 'X' + 'x'.repeat(59))?.rate === null, JSON.stringify(row(s.sources, 'X' + 'x'.repeat(59))));
ok('  the campaign: 2 sign-ups from 6 visitors', row(s.campaigns, 'spring-sale')?.signups === 2 && row(s.campaigns, 'spring-sale')?.visitors === 6 && Math.abs(row(s.campaigns, 'spring-sale')?.rate - 2 / 6) < 1e-9, JSON.stringify(row(s.campaigns, 'spring-sale')));
ok('  sign-ups with no campaign are not listed as a campaign', !row(s.campaigns, '') && !row(s.campaigns, 'Not tagged'), JSON.stringify(s.campaigns));
ok('  the largest source is listed first', s.sources?.[0]?.name === 'Not tagged', JSON.stringify(s.sources?.map(r => r.name)));
