# Change plans and prices

**Edit one file: `bytes-website/public/plans.json`.** Prices, limits, features and the chat caps all live there. Do not
copy a price into the website, the dashboard, crm-api or chatbot-api. They all read this file.

Before you change it, read the plan table and the rules in the
[knowledge base, section 6](../knowledge-base.md#6-plans-bot-modes-and-limits). The main points:

- **The recommended plan** is the one with `"featured": true` (Pro today). It gets the "Recommended" badge and the
  filled button in the Pricing section. Move the flag to change it.
- **No plan can have more than 50 websites.** Besides each plan's own limit, crm-api cuts every saved website list to 50
  in code (`.slice(0, 50)` in `crm-api-worker/src/index.js`). A plan limit above 50 has no effect until that code
  changes.
- **The Bytes bot quotes the prices.** chatbot-api builds the house bot's price list and trial wording from this file,
  so a price change reaches the chat on the website too.
- The per-minute chat limits are in `chatbot-api/wrangler.jsonc` (`CHAT_LIMITER`, `CLIENT_LIMITER`), not in
  `plans.json`.
- Paid plans say "unlimited" leads. Adding a cap means adding `leadsPerDay` or `contacts` to the plan. Enforcement
  already reads them.

## Steps

1. Edit `bytes-website/public/plans.json`.
2. Run the crm-api plan and mode suites, then all of chatbot-api's tests. From the repo root:
   ```
   cd bytes-website/crm-api-worker
   node test/run.mjs plans modes
   ```
   ```
   cd chatbot-api
   node test/run.mjs
   ```
3. Build the website, then check the Pricing section and the dashboard's plan text in the preview. From the repo root:
   ```
   cd bytes-website
   npm run build
   npm run preview
   ```
   Mock the live API requests while you check (see [Run locally](run-locally.md)).
4. Check the wording next to each number, in the Pricing section and in the dashboard.
5. Ask the owner before you merge. A price change is public the moment it deploys.

## Things that are not in the file

- **Premium models.** Business and Enterprise say "premium AI models". The code refuses premium models below AI Plus,
  but nothing gives a bot one. See `HANDOVER.md` section 11, item 11, before you change that wording.
- **Plan changes are manual.** There is no payment integration. Admins change a client's plan in Manage Clients.
