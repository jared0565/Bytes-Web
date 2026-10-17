# Preview email-link pages

The screens a lead reaches from an email link (confirm, confirmed, a link already used, an incomplete link, and the two
unsubscribe screens) are rendered by the crm-api worker, not the website. This guide serves them on your machine from
the test copy of the worker, with a mocked database, settings and mail. Nothing is sent: the script answers every
outside request itself. Checked on 17 Oct 2026.

The page styles are `PAGE_CSS` in `bytes-website/crm-api-worker/src/index.js`, next to `verifyPage`, `usedLinkPage` and
`brokenLinkPage`. The test that covers them is `test/pages.mjs`.

## Steps

1. Build the test copy of the worker. Running the `pages` suite creates `test/.build`, and it stays after the run:
   ```
   cd bytes-website/crm-api-worker
   node test/run.mjs pages
   ```
2. Save the script below **outside the repo**, for example as `preview-pages.mjs` in your own scratch folder. Do not save
   it in `test/`: the test runner treats every `.mjs` file there as a suite and would start the server mid-run.
3. Run it **from `bytes-website/crm-api-worker`**, because it finds the build from the current folder:
   ```
   node path/to/preview-pages.mjs
   ```
4. Open the addresses it prints, at phone width and at desktop width:
   - **Confirm:** `http://127.0.0.1:4300/api/verify-email?token=preview-token`. Press the button for "Email confirmed".
     Open the address again for "Link already used".
   - **Incomplete link:** `http://127.0.0.1:4300/api/verify-email`
   - **Unsubscribe:** `http://127.0.0.1:4300/api/unsubscribe?t=previewunsubscribe`. Press the button for
     "You're unsubscribed".
5. **Stop it with Ctrl+C before you run the tests again.** On Windows the running server holds `test/.build` open, and
   the test runner cannot clear that folder. To start over, run step 1 again: the data lives in memory and resets.

```js
// Serves the screens a lead reaches from an email link, from the crm-api test build, with a mocked
// database, settings and mail. Nothing leaves the machine: every outside request is answered here.
// Run from bytes-website/crm-api-worker, after `node test/run.mjs pages` has built test/.build.
import http from 'node:http';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const PORT = 4300;
globalThis.fetch = async (url) => {
  url = String(url);
  if (url.includes('dns-query')) return new Response(JSON.stringify({ Answer: [{ data: '10 route1.mx.cloudflare.net.' }] }));
  console.log('  (answered locally, not sent):', url.split('?')[0]);
  return new Response('{"id":"preview"}');
};
const mod = await import(pathToFileURL(join(process.cwd(), 'test', '.build', 'src', 'index.js')).href);

const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE crm_settings (client_id TEXT PRIMARY KEY, default_campaign_mode TEXT, auto_approve_campaigns INTEGER, plan TEXT, trial_started_at INTEGER, trial_ends_at INTEGER);
INSERT INTO crm_settings VALUES ('acme', 'rule', 1, 'pro', 0, 0);
CREATE TABLE leads (id INTEGER PRIMARY KEY, client_id TEXT, name TEXT, email TEXT, service TEXT, budget TEXT, summary TEXT, is_verified INTEGER, verification_token TEXT, pipeline_stage TEXT, next_best_action TEXT, timestamp INTEGER, updated_at INTEGER, session_id TEXT, thread_token TEXT);
CREATE TABLE email_sequences (id INTEGER PRIMARY KEY, lead_id INTEGER, client_id TEXT, email_number INTEGER, subject TEXT, body TEXT, status TEXT, scheduled_for INTEGER);
CREATE TABLE chat_logs (id INTEGER PRIMARY KEY, client_id TEXT, user_message TEXT, bot_response TEXT, timestamp INTEGER, session_id TEXT);`);
db.prepare(`INSERT INTO leads (id, client_id, name, email, service, budget, summary, is_verified, verification_token, pipeline_stage, timestamp, thread_token)
  VALUES (1, 'acme', 'Sam Lee', 'sam@example.com', 'Website', 'Pending', 'Wants a new site', 0, 'preview-token', 'lead', ?, 'previewunsubscribe')`).run(Date.now());

const prepare = (sql) => {
  let args = [];
  const stmt = {
    bind: (...a) => { args = a; return stmt; },
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    first: async () => db.prepare(sql).get(...args) ?? null,
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
  };
  return stmt;
};
const kv = new Map([
  ['client:acme', JSON.stringify({ companyName: 'Acme Dental', alertEmail: 'owner@acme.example' })],
  ['mail:acme', JSON.stringify({ provider: 'resend', fromEmail: 'hello@acme.example', fromName: 'Acme Team', apiKey: 'not-a-real-key' })],
]);
const KV = { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); }, delete: async (k) => { kv.delete(k); } };
const env = {
  DB: { prepare, batch: async (list) => { for (const s of list) await s.run(); } },
  CLIENT_SETTINGS: KV, OAUTH_TOKENS: KV, JWT_SECRET: 'preview', REPLY_DOMAIN: 'reply.bytesfx.com',
  ADMIN_EMAILS: 'owner@acme.example', LLM: { complete: async () => ({ text: '', model: 'preview' }) },
};
const ctx = { waitUntil: (p) => Promise.resolve(p).catch(() => {}) };

http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const init = { method: req.method, headers: req.headers['content-type'] ? { 'content-type': req.headers['content-type'] } : {} };
  if (chunks.length) init.body = Buffer.concat(chunks);
  const r = await mod.__app.fetch(new Request(`http://127.0.0.1:${PORT}${req.url}`, init), env, ctx);
  res.writeHead(r.status, { 'content-type': r.headers.get('content-type') || 'text/html' });
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(PORT, '127.0.0.1', () => {
  const base = `http://127.0.0.1:${PORT}`;
  console.log(`Confirm:      ${base}/api/verify-email?token=preview-token   (press the button for "Email confirmed"; open it again for "Link already used")`);
  console.log(`Broken link:  ${base}/api/verify-email`);
  console.log(`Unsubscribe:  ${base}/api/unsubscribe?t=previewunsubscribe   (press the button for "You're unsubscribed")`);
  console.log('Stop with Ctrl+C before running the tests again.');
});
```

When you press Confirm, the script prints two lines saying the email requests were "answered locally, not sent". Those
are the questions email and the owner's alert, which the real worker would send.

## Things to check

- The frame uses the website's colours and fonts, copied by hand from `bytes-website/src/home.css`. If the site's
  palette changes, copy the change into `PAGE_CSS` too.
- For the confirm link, a second press or opening it again shows "Link already used". A second press of Unsubscribe
  shows "You're unsubscribed" again. Both are correct.
- No script runs on these pages. That is deliberate, because email scanners open every link.
