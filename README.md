# BytesFX

The code behind **[web.bytesfx.com](https://web.bytesfx.com/)**, the website of Bytes Enterprises Ltd (London). It has
three parts:

- **The website:** the agency homepage (services, process, Pricing, contact form) and a chat box.
- **The chatbot product:** a chat widget that a business puts on its own website to capture leads, managed from a
  dashboard (leads, conversations, proposals, analytics and settings).
- **The sales follow-up engine (CRM):** a verified lead is emailed questions, replies come back by email, an AI drafts a
  proposal, and a person reviews and sends it.

Everything deploys from `main`. Every push to `main` goes live, so read [How to deploy](docs/how-to/deploy.md) before
you merge.

## Documentation

- **[Knowledge base](docs/knowledge-base.md):** the reference. Architecture, Cloudflare resources, configuration,
  data, plans and limits, features by area, and open items.
- **[How-to guides](docs/how-to/README.md):** step-by-step tasks, such as running locally, running the tests, deploying,
  changing a price, and running a data fix.
- **[HANDOVER.md](HANDOVER.md):** the owner's running log of what changed and what is still open.

## Quick start

You need **Node 22.5 or newer**. Each folder has its own dependencies, so run `npm install` in each one you use.

```
cd bytes-website && npm install && npm run dev            # the website
cd chatbot-api && npm install && npm run dev              # chat worker (ai.bytesfx.com)
cd bytes-website/crm-api-worker && npm install && npm run dev   # CRM worker
```

Then run the checks:

```
cd bytes-website/crm-api-worker && node test/run.mjs      # CRM tests (15 suites)
cd chatbot-api && node test/run.mjs                       # chat tests
```

The full set of checks, and the order to run them, is in [Run the tests](docs/how-to/run-the-tests.md).

## Repository layout

| Folder | What it is |
|---|---|
| `bytes-website/` | The website, dashboard, onboarding and chat widget, built with Vite. `public/` is copied as it is |
| `bytes-website/crm-api-worker/` | The CRM API: auth, leads, the sales flow, email, analytics, admin and scheduled jobs |
| `chatbot-api/` | The chat API (TypeScript): the chat endpoint, bot modes, lead capture and model calls |
| `.github/workflows/` | `deploy-worker.yml`, the "Deploy Agency" workflow that deploys all three on every push to `main` |
| `research/` | Notes and analysis. Not used by the build |

## Things to know before you change anything

- **Plans live in one file:** `bytes-website/public/plans.json`. Prices and limits are read from there by all three parts.
- **No secrets in the repo.** Worker secrets are set with `wrangler secret put`. The names are listed in the
  [knowledge base](docs/knowledge-base.md#4-configuration-and-secrets). Local secret files are git-ignored.
- **Use `--config wrangler.toml`** for every Wrangler command in `bytes-website/crm-api-worker`. Without it, Wrangler acts
  on the website's worker.
- **Production needs a go-ahead.** Changes to the live database, the live APIs and the deploy need the owner's approval
  first.
- **Known gap:** the crm-api `migrate` scripts name a database that the config does not bind. Use the database name
  `chatbot-db` instead. The [open items](docs/knowledge-base.md#11-open-items-and-known-gaps) list it.
