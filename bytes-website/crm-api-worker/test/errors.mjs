// The global error handler's log line. crm-api logs errors only (no per-request lines), so this
// line is the only place a crash shows which route failed. It must never carry the query string:
// sign-in nonces, unsubscribe tokens and emails travel there.
const mod = await import('./src/index.js');
const ok = (l, c, x = '') => console.log(c ? 'PASS' : 'FAIL', l, x);

const lines = [];
const realError = console.error;
console.error = (...args) => lines.push(args.map(a => a instanceof Error ? `${a.message} ${a.stack}` : String(a)).join(' '));

// A store that fails, so /api/register-settings throws into app.onError.
const broken = { get: async () => { throw new Error('kv down'); }, put: async () => {}, delete: async () => {} };
const env = { OAUTH_TOKENS: broken, CLIENT_SETTINGS: broken, JWT_SECRET: 'x' };
const req = new Request('http://x/api/register-settings?token=secret-probe&email=probe%40x.com', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ setupToken: 'abc', settings: {} }),
});
const res = await mod.__app.fetch(req, env, { waitUntil: p => p });
const body = await res.json().catch(() => ({}));
console.error = realError;

const line = lines.find(l => l.startsWith('[CRM-API ERROR]')) || '';
ok('the caller gets the generic 500 reply, not the error', res.status === 500 && body.error === 'Something went wrong. Please try again.' && !JSON.stringify(body).includes('kv down'), `${res.status} ${JSON.stringify(body)}`);
ok('the error line names the method and route', line.includes('POST /api/register-settings'), line.slice(0, 160));
ok('the error line never carries the query string', line !== '' && !line.includes('secret-probe') && !line.includes('probe%40x.com') && !line.includes('?'), line.slice(0, 160));
ok('the error itself is still logged, with its stack', line.includes('kv down') && line.includes('at '), line.slice(0, 160));
