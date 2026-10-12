// Page views sent by the website's track.js: which are saved, and that the browser accepts the reply.
import { DatabaseSync } from 'node:sqlite';
const mod = await import('./src/index.js');
const db = new DatabaseSync(':memory:');
const prep = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) ?? null, run: async () => { const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }; return o; };
const env = { DB: { prepare: prep }, JWT_SECRET: 'x', ALLOWED_ORIGINS: 'http://localhost:5173,https://web.bytesfx.com' };
const ctx = { waitUntil() {} };
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);

const SITE = 'https://web.bytesfx.com';
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
// What track.js sends: a text/plain POST carrying the page's origin
const view = (origin, ua = CHROME) => mod.__app.fetch(new Request('http://x/api/public/pageview', { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: origin, 'User-Agent': ua }, body: JSON.stringify({ p: '/pricing?x=1', e: 1, r: 'https://www.google.com/', us: '', uc: '' }) }), env, ctx);
const policy = (res) => res.headers.get('Cross-Origin-Resource-Policy');
const saved = () => db.prepare('SELECT path, entry, source, device, browser FROM page_views ORDER BY id').all();

// The website is another origin than the API. A reply marked "same-origin" is blocked by the
// browser after the view is saved, which shows as a failed request on every page.
let res = await view(SITE);
let rows = saved();
ok('a view from the website is saved', res.status === 204 && rows.length === 1, `status ${res.status}, ${rows.length} saved`);
ok('it keeps the page and where the visit came from', rows[0]?.path === '/pricing' && rows[0]?.source === 'Google' && rows[0]?.browser === 'Chrome', JSON.stringify(rows[0]));
ok('the browser may read the reply to a saved view', policy(res) === 'cross-origin', policy(res));

res = await view('https://other.example');
ok('a view from another site is not saved', res.status === 204 && saved().length === 1, `status ${res.status}, ${saved().length} saved`);
ok('the browser may read the reply to a view that is not saved', policy(res) === 'cross-origin', policy(res));

res = await view(SITE, 'Googlebot/2.1 (+http://www.google.com/bot.html)');
ok('a view from a crawler is not saved', res.status === 204 && saved().length === 1, `status ${res.status}, ${saved().length} saved`);
ok('the browser may read the reply to a crawler', policy(res) === 'cross-origin', policy(res));

res = await view('http://localhost:5173');
ok('a view from a local page is not saved', res.status === 204 && saved().length === 1, `status ${res.status}, ${saved().length} saved`);

// Every other reply stays closed to other origins
res = await mod.__app.fetch(new Request('http://x/api/analytics/visitors', { headers: { Origin: SITE } }), env, ctx);
ok('a signed-in route keeps its reply to the same origin', res.status === 401 && policy(res) === 'same-origin', `status ${res.status}, ${policy(res)}`);
res = await mod.__app.fetch(new Request('http://x/api/public/pageviews', { method: 'POST', headers: { Origin: SITE } }), env, ctx);
ok('an address that only starts like the page-view one stays same-origin', policy(res) === 'same-origin', `status ${res.status}, ${policy(res)}`);
