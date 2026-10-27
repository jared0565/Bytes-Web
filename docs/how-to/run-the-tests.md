# Run the tests

The full list of checks, with what each one covers, is in the
[knowledge base, section 9](../knowledge-base.md#9-testing-and-checks). This guide gives the commands in the order to run
them. Run `npm install` first in each folder. Node 22.5 or newer is required.

Each block starts from the repo root.

**crm-api** (15 suites, 240 checks on 17 Oct 2026):

```
cd bytes-website/crm-api-worker
node test/run.mjs                 # all suites
node test/run.mjs flow plans      # or only the suites you name
npx wrangler deploy --dry-run --config wrangler.toml   # bundle check; deploys nothing
```

**chatbot-api** (3 suites, `chat`, `gate` and `scripted`, 135 checks on 17 Oct 2026). Its runner always runs every suite:

```
cd chatbot-api
node test/run.mjs
npx tsc --noEmit -p .             # typecheck
```

**Website build** (also copies `public/` into `dist/`). The build runs two checks of its own first, and stops if
either fails:

```
cd bytes-website
npm run build
```

- `scripts/check-consent.mjs` fails the build when the CSP allows a third-party script, or a page loads one from
  another host, while the cookie banner is off (`ASK = false` in `public/consent.js`). It is the guard that keeps
  "no tag sets a cookie without asking" true.
- `scripts/test-consent.mjs` checks the consent rules themselves: a planted cookie grants nothing, the cookie is the
  fallback when browser storage is blocked, and a visitor's own saved choice is honoured.

Run either on its own with `node scripts/check-consent.mjs` or `node scripts/test-consent.mjs` from `bytes-website`.

## Reading the results

- Each suite prints a line with its passed and failed counts. The runner exits with 1 if any check failed. Read the exit
  code itself: piping the output into another command (`| tail`) reports that command's code instead.
- If a crm-api suite fails, run only that suite (`node test/run.mjs <suite>`) to read its output, fix the cause, then
  run the full set again.
- The bundle check should list the DB, KV, R2 and LLM bindings. If it says "No bindings found", Wrangler read the
  website's config. Add `--config wrangler.toml`.
- Stop any local server before running the crm-api tests. On Windows a running server can hold `test/.build` open, and
  the runner then cannot clear it. More in [Troubleshooting](../troubleshooting.md#tests-and-commits).
- Both runners treat every `.mjs` file in `test/` as a suite, so keep helper scripts out of that folder.

## Things the tests do not cover

- Anything on a phone. The site chat's keyboard behaviour is proven only on a real phone.
- What Facebook, LinkedIn and X display for a shared link. Only their own tools can check that, on the live site.
- How an email client sorts a message into Primary or Promotions. Only a mailbox that has never had mail from the sender
  can show that.

For UI checks, use Playwright against `vite preview`, with every production request mocked, and compare at least two
rounds of screenshots. (`CLAUDE.md` names `serve.mjs` and `screenshot.mjs`, which do not exist in this repo.)
