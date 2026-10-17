# Troubleshooting

Each entry gives what you see, why, and what to do. All of them were seen on this project, or read from the code, on or
before 17 Oct 2026. For how the parts fit together, see the [knowledge base](knowledge-base.md).

## Wrangler

**"No bindings found", or a crm-api command acts on the website worker.**
Wrangler found the website's `wrangler.jsonc` at the repo root instead of crm-api's config. In
`bytes-website/crm-api-worker`, add `--config wrangler.toml` to every Wrangler command.

**"Couldn't find a D1 DB with the name or binding 'crm-database'".**
You ran `npm run migrate:local` or `migrate:remote`. They name a database that the config does not bind. Use the
database name `chatbot-db` with `--config wrangler.toml`, as in [Run locally](how-to/run-locally.md#crm-api).

**"Authentication error [code: 10000]".**
Wrangler's login has expired. Run `npx wrangler login`, then the same command again. Do not change the command or the
SQL to get past it.

**An error ending in "os error 10013" when `wrangler dev` starts.**
Windows refused the port, usually because another program holds it. Pick a free one with `--port 8789` (or any other),
or find the holder with `Get-NetTCPConnection -LocalPort <port>` in PowerShell.

## Running locally

**chatbot-api stops with "Incorrect type for map entry 'SALES_DEFAULT_MODEL'".**
A known gap: `src/index.ts` exports string constants beside the worker's handlers, and the local runtime accepts only
handlers. Deploys work. Check chatbot-api with its tests until the code changes. See
[Run locally](how-to/run-locally.md#chatbot-api).

**crm-api's `LLM` binding shows "not connected".**
It connects only to a chatbot-api running in `wrangler dev`, which does not start today (above). Until it does,
anything in crm-api that asks the AI for text cannot be tried locally.

**crm-api answers 401 on signed-in routes.**
There is no `.dev.vars` with the secrets. The names are in the
[knowledge base, section 4](knowledge-base.md#4-configuration-and-secrets).

**The local contact form or site chat created a real lead.**
The website calls production at fixed addresses, even from `npm run dev`. See
[Run locally](how-to/run-locally.md#the-website-talks-to-production) before you type an email address into a local copy.

## The chat

**The chat answers "The chatbot is temporarily unavailable" (503).**
chatbot-api is missing a secret. Without `ADMIN_API_KEY` every chat fails, because the daily visitor key is made from
it. Without `GEMINI_API_KEY` AI replies fail. The same 503 appears if the settings store (KV) cannot be read.

**"This chatbot isn't connected to this website yet" (403).**
The website gate refused the page's address: it is not one of the bot's saved websites. The bot's owner adds it from
their dashboard, as the message says. A client bot with no website saved connects itself to the first public website
it is used on. On `localhost`, chatbot-api allows any bot only with `ALLOW_LOCALHOST=1`.

**"This chatbot is not set up" (404).**
No settings are saved for that client ID. Check the ID in the widget's embed code.

**A model in the list says "(no API key)".**
The provider's key (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY` or `OPENROUTER_API_KEY`) is not set on chatbot-api. Set it,
or pick another model.

## Tests and commits

**The crm-api test runner fails while clearing `test/.build`.**
On Windows a running local server, such as the [email-page preview](how-to/preview-email-link-pages.md), holds files in
that folder open. Stop it, then run the tests again.

**A script you saved in `test/` ran as a suite.**
Both test runners run every `.mjs` file in `test/` except `run.mjs`. Keep helper scripts outside the repo.

**`aramid check --staged` says "skipped (degraded tools)", or `gitleaks-inline` timed out.**
That is not a pass: the secret scan did not finish. Run it again until it is clean. Never commit with `--no-verify`.

## The live site

**The browser logs a failed request for the page view on every page.**
crm-api's reply to `/api/public/pageview` must be marked `cross-origin`, or the browser blocks it. The view is saved
either way. See the [knowledge base, Analytics](knowledge-base.md#analytics-cookieless).

**A shared link still shows the old preview picture.**
Platforms cache the picture by its address. Save the new image under a new filename and point the tags at it. See
[Remake the share images](how-to/remake-share-images.md).
