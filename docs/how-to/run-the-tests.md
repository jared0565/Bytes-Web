# Run the tests

The full list of checks, with what each one covers, is in the
[knowledge base, section 9](../knowledge-base.md#9-testing-and-checks). This guide gives the commands in the order to run
them.

Run `npm install` first in each folder. Node 22.5 or newer is required.

```
cd bytes-website/crm-api-worker
node test/run.mjs                 # all 15 crm-api suites
node test/run.mjs flow plans      # or only the suites you name

cd ../../chatbot-api
node test/run.mjs                 # website gate, prompts, scripted flow, chat endpoint
npx tsc --noEmit -p .             # typecheck

cd ../bytes-website/crm-api-worker
npx wrangler deploy --dry-run --config wrangler.toml   # bundle check; deploys nothing

cd ..
npm run build                     # website build; copies public/
```

## Reading the results

- If a suite fails, run only that suite (`node test/run.mjs <suite>`) to read its output, fix the cause, then run the
  full set again.
- The bundle check should list the DB, KV, R2 and LLM bindings. If it says "No bindings found", Wrangler read the
  website's config. Add `--config wrangler.toml`.
- Stop any local server before running the crm-api tests (see [Run locally](run-locally.md)).

## Things the tests do not cover

- Anything on a phone. The site chat's keyboard behaviour is proven only on a real phone.
- What Facebook, LinkedIn and X display for a shared link. Only their own tools can check that, on the live site.
- How an email client sorts a message into Primary or Promotions. Only a mailbox that has never had mail from the sender
  can show that.

For UI checks, follow the screenshot workflow in `CLAUDE.md`: Playwright against `vite preview`, with the API requests
mocked, and at least two rounds of comparison.
