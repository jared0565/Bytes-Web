# Roll back a deploy

Use this when a merge to `main` broke something live. **Rolling back changes production, so it needs the owner's
go-ahead.** None of the commands below has been run against production; they come from Wrangler 4.149.0's help and
Cloudflare's rollback documentation (checked on 17 Oct 2026).

## The normal route: revert the pull request

1. On GitHub, open the merged pull request and press **Revert**. GitHub opens a new pull request that undoes it.
2. Run the checks in [Run the tests](run-the-tests.md) on that branch.
3. Merge it. The "Deploy Agency" workflow deploys all three parts again, from code that is now the old code.

This keeps `main` and production the same, so the next deploy does not bring the broken change back.

## The fast route: roll a worker back

Use this when production cannot wait for a pull request and a deploy. Each worker keeps its earlier versions, and
Cloudflare can switch back to one in seconds. You can roll back to any of the 100 most recent versions.

1. **List the versions** and pick the one from before the bad deploy:
   ```
   npx wrangler deployments list
   ```
2. **Roll back to it:**
   ```
   npx wrangler rollback <version-id> -m "Why you rolled back"
   ```

Where to run them:

| Worker | Folder | Add |
|---|---|---|
| chatbot-api | `chatbot-api` | nothing |
| crm-api | `bytes-website/crm-api-worker` | `--config wrangler.toml` |
| Website (`bytes-website`) | `chatbot-api` (it has Wrangler installed) | `--name bytes-website` |

The website's config is `wrangler.jsonc` at the repo root, which has no Wrangler of its own, so name the worker instead.
The Cloudflare dashboard can do the same: open the worker, then **Deployments**, then **Rollback**.

**Roll back in reverse deploy order:** the website, then crm-api, then chatbot-api, and only the parts the bad change
touched. crm-api calls chatbot-api's `LlmService`, so an old chatbot-api under a new crm-api can break that call.

3. **Then revert on `main` too** (the normal route above). Until you do, the next merge to `main` deploys the broken
   code again.

## What a rollback does not undo

Only the worker's code and settings go back. Cloudflare does not change the resources a worker uses, so:

- **D1 rows and columns stay as they are.** A column that the new code added (crm-api's `ensureSales`, chatbot-api's
  `ensureSchema`) is still there. The old code ignores it, but code that expects a column to be missing could fail.
- **KV and R2 keep what the new code wrote.**
- **Emails already sent stay sent**, including follow-ups queued by the new code.
- Cloudflare refuses the rollback if the old version binds a KV namespace or R2 bucket that no longer exists.
- Secrets: not checked here. If you changed one since that version, check the worker after the rollback.

To undo data as well, see the restore steps in [Run a data fix](run-a-data-fix.md#if-a-fix-went-wrong).
