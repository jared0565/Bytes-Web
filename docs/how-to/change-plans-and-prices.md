# Change plans and prices

**Edit one file: `bytes-website/public/plans.json`.** Prices, limits, features and the chat caps all live there. Do not
copy a price into the website, the dashboard or crm-api. They all read this file.

Before you change it, read the plan table and the rules in the
[knowledge base, section 6](../knowledge-base.md#6-plans-bot-modes-and-limits). The main points:

- A website list is capped at **50** on every plan, and so is the Enterprise plan. Raising the cap means changing the
  code, not the file.
- The per-minute chat limit is in `chatbot-api/wrangler.jsonc` (`CHAT_LIMITER`), not in `plans.json`.
- Paid plans say "unlimited" leads. Adding a cap means adding `leadsPerDay` or `contacts` to the plan. Enforcement
  already reads them.

## Steps

1. Edit `bytes-website/public/plans.json`.
2. Run the plan and mode suites:
   ```
   cd bytes-website/crm-api-worker
   node test/run.mjs plans modes
   ```
3. Build the website, then check the Pricing section and the dashboard's plan text in the preview:
   ```
   cd bytes-website
   npm run build
   npm run preview
   ```
   Mock the live API requests while you check (see [Run locally](run-locally.md)).
4. Check the wording next to each number. The "Recommended" label is written in `bytes-website/src/main.js` (around
   line 280), not read from `plans.json`, so change it there if the recommended plan changes.
5. Ask the owner before you merge. A price change is public the moment it deploys.

## Things that are not in the file

- **Premium models.** Business and Enterprise say "premium AI models". The code refuses premium models below AI Plus,
  but nothing gives a bot one. See `HANDOVER.md` section 11, item 11, before you change that wording.
- **Plan changes are manual.** There is no payment integration. Admins change a client's plan in Manage Clients.
