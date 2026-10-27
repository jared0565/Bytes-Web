# Run locally

You need **Node 22.5 or newer** (the crm-api tests use `node:sqlite`). Run `npm install` once in each folder you use.

**What works today** (checked on 17 Oct 2026 with Wrangler 4.149.0):

| Part | Runs locally? | Notes |
|---|---|---|
| Website (`npm run dev`, `npm run preview`) | Yes | It talks to production. Read the next section first |
| crm-api (`wrangler dev`) | Yes | Local copies of D1, KV and R2. Its `LLM` binding shows "not connected", because chatbot-api does not start |
| chatbot-api (`wrangler dev`) | **No** | The local runtime refuses to start it. See [chatbot-api](#chatbot-api) |

The everyday loop is the tests ([Run the tests](run-the-tests.md)) plus the built site in `vite preview`, with every
production request mocked in Playwright. Running the workers is for when the tests are not enough.

## The website talks to production

- The API addresses are constants with no local setting: `CHAT_API_URL` and `CRM_API_URL` in `bytes-website/src/main.js`,
  and `API_BASE` and `CHATBOT_API` in `bytes-website/public/dashboard/main.js`.
- crm-api accepts browser requests from `http://localhost:5173` and `http://localhost:3000` (its `ALLOWED_ORIGINS`, in
  `crm-api-worker/wrangler.toml`). `vite preview` (4173) is not on that list.
- **The session cookie is ignored for a local origin** (since 27 Oct 2026). Any process on this machine could serve a
  page on one of those ports, and the browser would attach the session cookie to the request, so the cookie alone no
  longer signs anyone in from there. The dashboard sends its JWT in a header as well, and a local page cannot read
  that, so the dashboard still works locally. The public routes (the contact form) still answer a local origin.
- chatbot-api answers a caller only on a site the bot may answer on, and the Bytes bot answers on `web.bytesfx.com`
  only. So a local copy's site chat no longer reaches production: the chat is refused with "not connected".
- So on a local copy, **the contact form creates a real lead and emails the owner** (from 5173 or 3000). Don't send it
  without the owner's go-ahead, and mock it in Playwright.
- Browsing is safe: `track.js` sends no page views from an `http://` address.

For layout and copy work, build the site, preview it, and mock the API requests:

```
cd bytes-website
npm install
npm run dev        # Vite dev server, usually http://localhost:5173
npm run build
npm run preview    # serves dist/, usually http://localhost:4173
```

`public/` is copied into `dist/` as it is, and is not bundled. After you change a file in `public/`, rebuild before
you preview.

## crm-api

From `bytes-website/crm-api-worker`:

```
npx wrangler d1 migrations apply chatbot-db --local --config wrangler.toml   # create the local tables
npx wrangler dev --local --config wrangler.toml
```

- Checked on 17 Oct 2026, with an extra `--persist-to <folder>` on both commands so the local data lived outside the
  repo. Without it, both use `.wrangler/state` in this folder, which git ignores.
- `--local` keeps every binding on your machine. Wrangler 4 does that by default, but the flag makes it certain.
- The migrations create most tables. The worker creates the rest on first use (see the
  [knowledge base, section 5](../knowledge-base.md#5-data)).
- Do not use `npm run migrate:local` or `migrate:remote`. They name a database that does not exist and fail with
  "Couldn't find a D1 DB with the name or binding 'crm-database'".
- Secrets go in `.dev.vars` in this folder (git-ignored; none exists today). The names are in the
  [knowledge base, section 4](../knowledge-base.md#4-configuration-and-secrets). Without them the worker still starts:
  signed-in routes answer 401.
- Cron jobs do not run by themselves in `wrangler dev`.
- The `LLM` binding connects only to a chatbot-api running in `wrangler dev`, which does not start today.

## chatbot-api

**It does not start under `wrangler dev`** (checked on 17 Oct 2026). The local runtime stops with:

```
Uncaught TypeError: Incorrect type for map entry 'SALES_DEFAULT_MODEL': the provided value is not of type 'function or ExportedHandler'.
```

`chatbot-api/src/index.ts` exports string constants next to the worker's handlers, and the local runtime accepts only
handlers there. Deploys are not affected. Until the code changes, chatbot-api is checked with its tests only.

Once it starts, it will need (from reading the code, not yet run):

- In `chatbot-api/.dev.vars`: `ADMIN_API_KEY` (any value locally; without it every chat returns 503), `GEMINI_API_KEY`
  for AI replies, and `ALLOW_LOCALHOST=1` so pages on `localhost` can use any bot.
- The local tables: chatbot-api shares crm-api's database in production. Locally each worker keeps its own data unless
  both use the same `--persist-to` folder.
- Care with email addresses: a lead saved locally still calls crm-api's webhook at its fixed **production** address,
  with the local lead's ID. Production acts only if one of its own leads has that ID, is under 10 minutes old and is
  not yet processed, so the risk is small. Still, don't type email addresses into a local chat.

## Before you push

Run the checks in [Run the tests](run-the-tests.md). Stop any local server you started before running them: on Windows a
running server can hold `test/.build` open, and the test runner then cannot clear it.
