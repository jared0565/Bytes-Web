// A Google, Facebook or LinkedIn sign-in leaves the onboarding page, so the page's address loses the ad tag the
// visitor arrived with. The server keeps the tag under the sign-in's one-time nonce and hands it back with the
// name and email; the provider never sees it.
import { DatabaseSync } from 'node:sqlite';
const mod = await import('./src/index.js');
const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE crm_settings (client_id TEXT PRIMARY KEY, default_campaign_mode TEXT, auto_approve_campaigns INTEGER, plan TEXT DEFAULT 'free', trial_started_at INTEGER DEFAULT 0, trial_ends_at INTEGER DEFAULT 0);
CREATE TABLE users (id INTEGER PRIMARY KEY, social_id TEXT, provider TEXT, email TEXT UNIQUE, name TEXT, picture TEXT, created_at INTEGER);`);
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; },
  all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null,
  run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
// The KV store, which can be told to fail for the kept tags only (the sign-in's own records keep working)
let failTagPut = false, failTagGet = false;
const ttls = {};
const kvs = () => { const mp = new Map(); return { mp,
  get: async k => { if (failTagGet && k.startsWith('signin_tag:')) throw new Error('KV read failed'); return mp.get(k) ?? null; },
  put: async (k, v, opt = {}) => { if (failTagPut && k.startsWith('signin_tag:')) throw new Error('KV write failed'); ttls[k] = opt.expirationTtl; mp.set(k, v); },
  delete: async k => mp.delete(k), list: async () => ({ keys: [] }) }; };
const OT = kvs();
const env = { DB: { prepare: prep }, JWT_SECRET: 'x', OAUTH_STATE_SECRET: 's', OAUTH_TOKENS: OT, CLIENT_SETTINGS: kvs(),
  GOOGLE_CLIENT_ID: 'gid', GOOGLE_CLIENT_SECRET: 'gs', FRONTEND_ONBOARDING_URL: 'https://d/onboarding/', FRONTEND_DASHBOARD_URL: 'https://d/dashboard/' };
// Google: the token call, then the user
let gUser = { id: 'g1', email: 'ferdy@example.com', verified_email: true, name: 'Ferdy' };
globalThis.fetch = async (u) => String(u).includes('token') ? new Response(JSON.stringify({ access_token: 'a' })) : new Response(JSON.stringify(gUser));
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);
const get = (path, headers = {}) => mod.__app.fetch(new Request('http://x' + path, { headers }), env, { waitUntil() {} });

let seq = 0;
const nonce = () => `n${String(++seq).padStart(3, '0')}${'a'.repeat(28)}`;
const keptTags = () => [...OT.mp.keys()].filter(k => k.startsWith('signin_tag:'));
// Each sign-in from its own network address unless a test names one (an address may keep 5 tags an hour)
let ipSeq = 0;
const nextIp = () => `10.1.0.${++ipSeq}`;
// One sign-in, as the browser makes it: onboarding starts it, Google returns the state it was given to the
// callback, and onboarding exchanges the token. Returns where each step went and what the exchange gave.
async function signIn(n, query = '', headers = {}) {
  const start = await get(`/api/auth/google?n=${n}${query}`, { 'CF-Connecting-IP': nextIp(), ...headers });
  const toProvider = start.headers.get('location') || '';
  const kept = OT.mp.get(`signin_tag:${n}`) ?? null;
  const state = toProvider.startsWith('https://accounts.google.com') ? new URL(toProvider).searchParams.get('state') : null;
  if (!state) return { toProvider, kept };
  const back = await get(`/api/auth/google/callback?code=c&state=${encodeURIComponent(state)}`);
  const toOnboarding = back.headers.get('location') || '';
  const token = toOnboarding.includes('social_token=') ? new URL(toOnboarding).searchParams.get('social_token') : null;
  const ex = token ? await get(`/api/auth/exchange?token=${token}&nonce=${n}`) : null;
  return { toProvider, kept, toOnboarding, exStatus: ex?.status, data: ex ? await ex.json() : null };
}

// A tagged sign-in: kept on the server while the visitor is away, handed back once, never sent to Google
let n = nonce();
let r = await signIn(n, '&source=fb&campaign=spring-sale');
ok('a tagged sign-in still goes to Google', r.toProvider.startsWith('https://accounts.google.com'), r.toProvider.slice(0, 60));
ok('  Google is not told the source or the campaign', !r.toProvider.includes('spring-sale') && !/[?&]source=|[?&]campaign=/.test(r.toProvider), r.toProvider);
ok('  the tag is kept under this sign-in for 10 minutes', !!r.kept && ttls[`signin_tag:${n}`] === 600, `${r.kept} ttl ${ttls[`signin_tag:${n}`]}`);
ok('  the exchange hands it back with the name and email', r.exStatus === 200 && r.data?.source === 'fb' && r.data?.campaign === 'spring-sale' && r.data?.email === 'ferdy@example.com' && r.data?.name === 'Ferdy', JSON.stringify(r.data));
ok('  and the kept copy is gone afterwards', !OT.mp.has(`signin_tag:${n}`), keptTags().join(','));

// Only one part of the tag
r = await signIn(nonce(), '&source=newsletter');
ok('a source without a campaign comes back alone', r.data?.source === 'newsletter' && !('campaign' in (r.data || {})), JSON.stringify(r.data));

// Nothing to keep
let before = keptTags().length;
r = await signIn(nonce());
ok('an untagged sign-in keeps nothing', keptTags().length === before && !r.kept, keptTags().join(','));
ok('  and its exchange carries no source or campaign', r.exStatus === 200 && !('source' in r.data) && !('campaign' in r.data), JSON.stringify(r.data));

// Do Not Track and Global Privacy Control: nothing is kept, whatever the page sent
r = await signIn(nonce(), '&source=fb&campaign=spring-sale', { 'Sec-GPC': '1' });
ok('Global Privacy Control: nothing is kept and nothing comes back', !r.kept && r.exStatus === 200 && !('source' in r.data) && !('campaign' in r.data), `${r.kept} ${JSON.stringify(r.data)}`);
r = await signIn(nonce(), '&source=fb&campaign=spring-sale', { DNT: '1' });
ok('Do Not Track: nothing is kept and nothing comes back', !r.kept && r.exStatus === 200 && !('source' in r.data) && !('campaign' in r.data), `${r.kept} ${JSON.stringify(r.data)}`);

// Junk is cleaned the way a sign-up cleans it
r = await signIn(nonce(), `&source=${'x'.repeat(100)}&campaign=${encodeURIComponent('a\u0000b\u001f' + 'c'.repeat(200))}`);
ok('a source is cut to 60 characters', r.data?.source === 'x'.repeat(60), JSON.stringify(r.data?.source));
ok('control characters are removed and a campaign is cut to 80 characters', r.data?.campaign === 'ab' + 'c'.repeat(78), JSON.stringify(r.data?.campaign));
r = await signIn(nonce(), '&source=%20%20&campaign=%01');
ok('a tag of only spaces or control characters keeps nothing', !r.kept && !('source' in r.data) && !('campaign' in r.data), `${r.kept} ${JSON.stringify(r.data)}`);

// A tag belongs to its own sign-in
const a = nonce();
await get(`/api/auth/google?n=${a}&source=fb&campaign=spring-sale`, { 'CF-Connecting-IP': nextIp() });
r = await signIn(nonce());
ok("another sign-in never gets someone else's tag", !('source' in r.data) && OT.mp.has(`signin_tag:${a}`), JSON.stringify(r.data));

// A dashboard sign-in is not a sign-up: nothing is kept
before = keptTags().length;
const dash = await get(`/api/auth/google?n=${nonce()}&redirect=dashboard&source=fb&campaign=spring-sale`, { 'CF-Connecting-IP': nextIp() });
ok('a dashboard sign-in keeps nothing', (dash.headers.get('location') || '').startsWith('https://accounts.google.com') && keptTags().length === before, keptTags().join(','));

// The store failing never stops a sign-in
failTagPut = true;
r = await signIn(nonce(), '&source=fb&campaign=spring-sale');
ok('if the tag cannot be kept, the sign-in still goes to Google and comes back', r.toProvider.startsWith('https://accounts.google.com') && /social_token=/.test(r.toOnboarding || '') && r.exStatus === 200 && !('source' in r.data), `${r.toOnboarding} ${JSON.stringify(r.data)}`);
failTagPut = false;
failTagGet = true;
r = await signIn(nonce(), '&source=fb&campaign=spring-sale');
ok('if the kept tag cannot be read, the sign-in still comes back with the name and email', /social_token=/.test(r.toOnboarding || '') && r.exStatus === 200 && r.data?.email === 'ferdy@example.com' && !('source' in r.data), `${r.toOnboarding} ${JSON.stringify(r.data)}`);
failTagGet = false;

// One network address keeps at most 5 tags an hour, like sign-ups; past that only the tag is dropped
const busy = '10.9.9.9';
const fromBusy = { 'CF-Connecting-IP': busy };
const untaggedFirst = await signIn(nonce(), '', fromBusy);
await signIn(nonce(), '&source=fb&campaign=spring-sale', { ...fromBusy, 'Sec-GPC': '1' });
await get(`/api/auth/google?n=${nonce()}&redirect=dashboard&source=fb&campaign=spring-sale`, fromBusy);
ok('untagged, opted-out and dashboard sign-ins do not count towards the limit', !OT.mp.has(`rl:signin-tag:${busy}`) && untaggedFirst.exStatus === 200, OT.mp.get(`rl:signin-tag:${busy}`));
let keptFromBusy = 0;
for (let i = 0; i < 5; i++) { const x = await signIn(nonce(), '&source=fb&campaign=spring-sale', fromBusy); if (x.data?.source === 'fb') keptFromBusy++; }
ok('5 tagged sign-ins from one address in an hour each keep their tag', keptFromBusy === 5, keptFromBusy);
before = keptTags().length;
r = await signIn(nonce(), '&source=fb&campaign=spring-sale', fromBusy);
ok('the 6th from that address keeps no tag', keptTags().length === before && !r.kept && !('source' in (r.data || {})), `${r.kept} ${JSON.stringify(r.data)}`);
ok('  but its sign-in still goes to Google and comes back', r.toProvider.startsWith('https://accounts.google.com') && /social_token=/.test(r.toOnboarding || '') && r.exStatus === 200 && r.data?.email === 'ferdy@example.com', r.toOnboarding);
r = await signIn(nonce(), '&source=fb&campaign=spring-sale');
ok('another address still keeps its tag', r.data?.source === 'fb', JSON.stringify(r.data));
ok("the limit has its own counter and leaves the address's sign-ups alone", OT.mp.get(`rl:signin-tag:${busy}`) === '5' && !OT.mp.has(`rl:register:${busy}`), `${OT.mp.get(`rl:signin-tag:${busy}`)} ${OT.mp.get(`rl:register:${busy}`)}`);
