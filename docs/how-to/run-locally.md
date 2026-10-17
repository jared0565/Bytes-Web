# Run locally

You need **Node 22.5 or newer** (the crm-api tests use `node:sqlite`). Run `npm install` once in each folder you use.

**Read this first:** the website and dashboard call live APIs (`ai.bytesfx.com` and the crm-api worker) by default.
Running them locally still talks to production unless you mock those requests. For layout or copy work, mock them; see
[Preview email-link pages](preview-email-link-pages.md) and the UI checks in [Run the tests](run-the-tests.md). Any
request to production needs the owner's go-ahead.

## The website

```
cd bytes-website
npm install
npm run dev        # Vite dev server
```

The page is served on the port Vite prints (usually 5173). To check the built output the way production serves it:

```
npm run build
npm run preview    # serves dist/ (vite preview, usually port 4173)
```

`public/` is copied into `dist/` as it is, and is not bundled. After you change a file in `public/`, rebuild before
you preview.

## chatbot-api (ai.bytesfx.com)

```
cd chatbot-api
npm install
npm run dev        # wrangler dev
```

Local secrets go in `chatbot-api/.dev.vars`. That file is git-ignored. The names it needs are in the
[knowledge base, section 4](../knowledge-base.md#4-configuration-and-secrets). `GEMINI_API_KEY` and `ADMIN_API_KEY` are
the minimum. Without `ADMIN_API_KEY` every chat returns 503, by design.

## crm-api (the CRM worker)

```
cd bytes-website/crm-api-worker
npm install
npm run dev        # wrangler dev --config wrangler.toml
```

Local secrets go in `.dev.vars` in this folder, with the names from
[section 4](../knowledge-base.md#4-configuration-and-secrets). The crm-api binds to chatbot-api through the `LLM`
service binding, so run chatbot-api too when you need model calls.

## Before you push

Run the checks in [Run the tests](run-the-tests.md). Stop any local server you started before running them: on Windows a
running server can hold `test/.build` open, and the test runner then cannot clear it.
