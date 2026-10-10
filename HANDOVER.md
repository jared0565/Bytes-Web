# BytesFX — Project Handover

Last updated: 10 Oct 2026, after PR #43. Everything below is merged into `main` and deployed.
Read this file and `CLAUDE.md` before changing anything.

---

## 1. What this is

BytesFX (Bytes Enterprises Ltd) is an agency website plus a small SaaS product:

- **Website** (`web.bytesfx.com`): agency homepage with services, process, **Pricing** and contact form, and a chat widget.
- **Chatbot product**: businesses sign up (onboarding), get a chat widget for their website that captures leads, and
  manage everything in a **dashboard** (leads, conversations, proposals, analytics, settings).
- **Sales follow-up engine** (CRM): verified leads are emailed questions, their replies come back by email, AI drafts
  a proposal, and a person reviews and sends it. Won/Lost tracking and analytics.

| URL | What |
|---|---|
| https://web.bytesfx.com/ | Website (Vite build of `bytes-website/`) |
| https://web.bytesfx.com/dashboard/ | Dashboard (admins and clients) |
| https://web.bytesfx.com/onboarding/ | Self-serve signup and 7-day trial |
| https://web.bytesfx.com/plans.json | The shared plan list (see §6) |
| https://crm-api.bmorris0565.workers.dev | CRM API worker (`crm-api`) |
| https://ai.bytesfx.com | Chatbot API worker (`chatbot-api`) |
| https://github.com/jared0565/Bytes-Web | Repo (deploys on every push to `main`) |

Admins (env `ADMIN_EMAILS`): fbmacagba@gmail.com, fbm2k11@gmail.com, jared0565@gmail.com.
The Bytes website's own bot is client ID **`default`** ("house" client).

---

## 2. Repo layout

```
CLAUDE.md                      Frontend rules (design guardrails, screenshot workflow)
HANDOVER.md                    This file
wrangler.jsonc                 Website worker: static assets from bytes-website/dist
.github/workflows/deploy-worker.yml   CI: deploys chatbot-api → crm-api → website on push to main
chatbot-api/                   Chat worker (TypeScript)
  src/index.ts                 Chat endpoint, bot modes, scripted flow, website gate, LlmService RPC
  src/llm.ts                   Model catalog (prices, premium flag), provider calls (Anthropic/OpenAI/Gemini/OpenRouter)
  test/                        node test/run.mjs (website gate, prompts, scripted flow)
bytes-website/
  index.html, src/main.js, src/home.css   Homepage SPA incl. Pricing section (built by Vite)
  public/                      Copied as-is to dist (NOT bundled):
    plans.json                 THE plan list (prices, limits, features)
    dashboard/ (index.html, main.js, style.css)   Dashboard (vanilla JS, ~4.2k lines)
    onboarding/                Signup flow
    widget.js                  Chat widget loaded on client sites
    _headers                   Security headers + CSP (no inline scripts anywhere)
    track.js                   Cookieless page-view beacon
  crm-api-worker/              CRM worker (Hono, plain JS)
    src/index.js               ~3.3k lines: auth, leads, sales flow, mail, analytics, admin, crons
    src/auth.js                OAuth providers (Google, Facebook, LinkedIn)
    migrations/                Early D1 schema (later tables are created lazily, see §5)
    test/                      node test/run.mjs (9 suites, ~130 checks)
research/                      Notes
```

---

## 3. Architecture

```
Visitor's browser ──widget.js──► chatbot-api (ai.bytesfx.com)
                                   │  D1 chat_logs/leads, KV CLIENT_SETTINGS
                                   │  POST /api/webhooks/new-lead, /api/webhooks/domain-adopted
                                   ▼
Dashboard/onboarding ───────────► crm-api (crm-api.bmorris0565.workers.dev)
                                   │  D1, KV (OAUTH_TOKENS, CLIENT_SETTINGS), R2 FILES
                                   │  service binding LLM → chatbot-api LlmService (Workers RPC)
                                   │  cron every minute (follow-ups, verification, drip, files cleanup)
Lead's email reply ─► Cloudflare Email Routing (reply@reply.bytesfx.com, subaddressing) ─► crm-api email() handler
```

**Cloudflare resources (account `107ddadecf5d982d0dc11c72affcce79`)**

| Resource | Binding | ID / name |
|---|---|---|
| D1 database | `DB` (both workers) | `chatbot-db`, `83348fa4-873f-4b07-b372-6a6e3b0896b6` |
| KV | `CLIENT_SETTINGS` (both) | `cffce7f12c7248f7935c31f7c591c726` |
| KV | `OAUTH_TOKENS` (crm-api) | `8ad06a763d6745d1bbbbd7fce1f4eb6c` |
| R2 | `FILES` (crm-api) | `bytes-lead-files` (lead attachments) |
| Service binding | `LLM` (crm-api) | `chatbot-api`, entrypoint `LlmService` |
| Rate limiters | `CHAT_LIMITER`, `CLIENT_LIMITER` (chatbot-api) | see chatbot-api/wrangler.jsonc |

**CI** (`deploy-worker.yml`): chatbot-api deploys first because crm-api binds to it. Secret `CLOUDFLARE_API_TOKEN` is
in GitHub. The crm-api step has no pinned Wrangler version, so keep crm-api code compatible with older Wrangler.
For example, import plans.json with a plain `import x from '../../public/plans.json'`, without `with { type: 'json' }`.

---

## 4. Secrets and config (names only, set with `npx wrangler secret put NAME` in that worker's folder)

**crm-api** (`bytes-website/crm-api-worker`)

| Secret | Purpose |
|---|---|
| `JWT_SECRET`, `OAUTH_STATE_SECRET` | Sessions and OAuth state signing |
| `ADMIN_SECRET` | Admin key login (plus TOTP 2FA in KV `totp:secret`) |
| `GOOGLE_CLIENT_ID/SECRET`, `FACEBOOK_CLIENT_ID/SECRET`, `LINKEDIN_CLIENT_ID/SECRET` | Social sign-in |
| `GEMINI_API_KEY` | Fallback when the `LLM` binding is unavailable |
| `RESEND_API_KEY`, `WEBSITE_MAIL_FROM`, `WEBSITE_MAIL_NAME` | Bytes website email sender (a sender saved in Settings takes priority) |

Vars in `wrangler.toml`: `ALLOWED_ORIGINS`, `AUTH_REDIRECT_URL`, `FRONTEND_*_URL`, `REPLY_DOMAIN=reply.bytesfx.com`,
`ADMIN_EMAILS`.

**chatbot-api**

| Secret | Purpose |
|---|---|
| `GEMINI_API_KEY` | Required (default model and lead extraction) |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY` | Optional providers; models without a key show "(no API key)" |

Per-client email senders (Resend, SendGrid or Mailgun) are saved by each client in the dashboard, in KV `mail:<clientId>`.

---

## 5. Data

**D1 tables:**
- `leads`, `chat_logs`, `email_sequences`, `crm_settings` (plan, trial dates, campaign mode, auto-approve)
- `users`, `roles`, `automations`, `email_templates`
- `page_views`
- `lead_messages` (the email thread, plus scheduled tasks as `direction='task'`)
- `lead_files`

Lazy schema: `ensureSales()` and `ensurePageViews()` in crm-api create these tables and columns on first use. They are
not in `migrations/`:
- tables `lead_messages`, `lead_files`, `page_views`
- `leads` columns `thread_token`, `brief`, `replied_at`, `last_reply_at`, `outcome`, `deal_value`, `lost_reason`,
  `closed_at`, `unsubscribed`, `proposal`, `session_id`

**KV keys:**

| Key | Namespace | Holds |
|---|---|---|
| `client:<id>` | CLIENT_SETTINGS | Bot config: companyName, mode, systemPrompt, llmModel, llmEffort, services, allowedDomains, showBranding, widget*, askQuestions, bookingUrl, alertEmail, draftModel, readModel |
| `mail:<id>` | OAUTH_TOKENS | Client email sender |
| `email_client:<email>` | OAUTH_TOKENS | Owner email → clientId |
| `migr:bot-modes-v1` | OAUTH_TOKENS | One-time mode migration flag |
| `adopted:<id>:<domain>` | OAUTH_TOKENS | Website-adoption alert sent |

Other OAUTH_TOKENS keys are session and login state: `device:*`, `totp:*`, `setup:*`, `exchange:*`, `pending_2fa:*`.

---

## 6. Plans, bot modes and limits

**`bytes-website/public/plans.json` is the single source of truth.** Change prices and limits there only. It is read by:
- crm-api (bundled)
- chatbot-api (bundled, message caps)
- the website Pricing section (imported by Vite)
- dashboard and onboarding (`fetch('/plans.json')`)

| Plan | Price | Bot mode | Websites | Leads | AI follow-ups | Hide badge | White label |
|---|---|---|---|---|---|---|---|
| Free | $0 | Scripted | 1 | 10/day, 50 total | – | – | – |
| Starter | $29/mo | AI | 3 | unlimited | ✓ | – | – |
| Pro | $79/mo | AI | 10 | unlimited | ✓ | ✓ | – |
| Business | $149/mo | AI Plus | 25 | unlimited | ✓ | ✓ | ✓ |
| Enterprise | custom | AI Plus | unlimited | unlimited | ✓ | ✓ | ✓ |

**Bot modes:**

| Mode | Messages/day | Messages per chat | Notes |
|---|---|---|---|
| `scripted` | 400 | 40 | Guided questions built from the client's Services list |
| `ai` | 2,000 | 40 | |
| `ai_plus` | 5,000 | 60 | Allows premium models (output price > $15 per 1M tokens) |

Old mode names map over: free/standard → scripted, pro → ai, elite → ai_plus.

**Rules** (crm-api `entitlements()`, `modesForPlan()`, `syncBotMode()`):
- **Trial:** 7 days, only meaningful on the Free plan. A trial gives AI replies and AI follow-ups on Free limits
  (1 website, badge on). A paid plan always gets its own entitlements, even during a trial.
- **Admin-only settings:** bot mode, AI model, effort and the sales email models are set by admins only, in Manage
  Clients. Clients see them read-only and their saves never change them.
- **Plan changes:** the bot moves to the new plan's top mode. Downgrades force the badge on and strip white-label fields.
- **Plan changes are manual:** there is **no payment integration**. Admins change plans in Manage Clients. "Choose
  <plan>" on the Pricing section pre-fills the contact form.

---

## 7. Features (where to look)

**Website** (`bytes-website/src/main.js`):
- Homepage sections and chat widget.
- Pricing built from plans.json. `?upgrade=<plan>&client=<id>#pricing` highlights a plan and pre-fills the request.
- Contact form posts to `POST /api/public/website-lead`.

**Chat widget and chatbot-api:**
- **Website gate (`siteGate`):**
  - A bot answers only on its saved websites, plus web.bytesfx.com for previews.
  - A client bot with an empty list adopts the first real website it's used on, once. The owner is emailed via
    `/api/webhooks/domain-adopted`.
  - Onboarding now requires a website.
- **Prompts:**
  - `HOUSE_PROMPT` is used only for `default`.
  - Client bots without a usable prompt get `clientDefaultPrompt()`, built from company name, services and booking link.
  - Prompt lines with unfilled `[blanks]` are dropped.
- **AI lead capture:** once the visitor types an email, gemini-2.5-flash-lite reads the chat to get name, need, budget
  and timeline.
- **Handoff:** LinkedIn handoff only on the Bytes website. Client bots point to their booking link.

**Leads board** (dashboard → Leads):
- Kanban: Inbox / Priority / Opportunity / Campaigns / Closed.
- Filters, CSV export, lead drawer.

**Close-the-sale flow** (crm-api sales section; `startCloseFlow`, `handleInboundEmail`, `handleSalesCron`):
1. The lead verifies their email. They get a **questions email** in a thread (5 questions, the 5th optional:
   examples/references). The reply-to is `reply+<token>@reply.bytesfx.com`. A reminder goes out after 2 days.
2. **Replies** arrive through Email Routing and are stored as evidence. Attachments are saved to R2:
   - Images, PDF and Office files only; 10 MB per file and 25 MB per lead.
   - Anything else is skipped, and the lead is asked for a Drive/Dropbox link.
3. **Brief:** an AI reads need, goals, budget, timeline, references and links. Anything missing is asked for **once**;
   with no answer after 3 days, the proposal is drafted with `[blanks]`.
4. **Proposal:** AI-drafted for every lead who replies, and **never sent automatically**.
   - The owner edits it in the drawer; Send is blocked while `[blanks]` remain.
   - Once sent: the lead moves to Opportunity, gets one nudge after 3 quiet days, and a "yes" reply is flagged.
5. **Won/Lost** records an amount or reason. Analytics shows reply rate, win rate, revenue won and time to close.
6. **Stop rules:** follow-ups stop on reply, Won/Lost or unsubscribe (link plus `List-Unsubscribe` header).

- **Owner alerts** go to the alerts email (Settings → Sales follow-up).
- **Models:** drafting and reading models are admin-set; default GPT-6 Luna, falling back to Gemini 2.5 Flash.
- **Conversation view:** the drawer shows the full thread and files; it can be downloaded as text or printed to PDF.

**Analytics:** chat, lead and visitor stats (cookieless `track.js`), sales results.

**Settings** (admin, the Bytes website):
- Bot behaviour and mode
- Services
- Sales follow-up
- Website email sender
- Status bar (reply tracking and file storage, with a warning at 8 GB)

**Manage Clients** (admin):
- Plan and trial
- Bot mode, model and effort
- Services, chatbot settings
- Test lead
- **Delete client** (typed confirmation; removes D1 rows, R2 files and KV keys)

**Client Chatbot page:**
- Install code and websites
- Behaviour (read-only mode, model and effort)
- Services
- Campaigns and sales follow-up
- Email sender

**Crons** (crm-api, every minute):
- Verification emails
- Drip sequences
- Sales tasks (reminders, checkpoints, details timeouts, proposal nudges)
- Trial expiry (Free → scripted)

Hourly at :07:
- Page-view retention
- Lead-file cleanup (90 days after Lost or after 90 quiet days; Won keeps them)
- Mode migration (one-time)

---

## 8. External setup already done

- **Email Routing** for `reply.bytesfx.com`:
  - Subdomain added with MX records.
  - **Subaddressing on**.
  - Rule `reply@reply.bytesfx.com` → Worker `crm-api`.
  - Settings → status bar shows "Reply tracking on".
- **R2** bucket `bytes-lead-files` created.
- **Resend** key set for the website sender.
- Production data was reset on 10 Oct 2026: the test leads and chat logs were deleted.
- Setup guide artifact (deploy steps, keys, Resend, Email Routing): https://claude.ai/artifact/DobRk3xrWQUcF73NJ5jkCo

---

## 9. Testing

Requires **Node 22.5+** (uses `node:sqlite`). Run `npm install` first in each worker folder.

```
cd bytes-website/crm-api-worker && node test/run.mjs        # all 9 suites, or: node test/run.mjs flow plans
cd chatbot-api && node test/run.mjs                         # website gate, prompts, scripted flow
cd chatbot-api && npx tsc --noEmit -p .                     # typecheck
cd bytes-website/crm-api-worker && npx wrangler deploy --dry-run   # bundle check, nothing is deployed
cd bytes-website && npm run build                           # website + copies public/
```

**crm-api suites:**

| Suite | Covers |
|---|---|
| `flow` | Close-the-sale |
| `prop` | Proposals |
| `files` | Attachments, completeness |
| `delc` | Delete client |
| `sec` | Security |
| `t` | Auth and onboarding |
| `modes` | Plan-based modes |
| `plans` | Plan limits |
| `site` | Signup website, adoption email |

They run the worker in Node with node:sqlite and mocked KV, R2, mail and LLM, against a scratch copy (`test/.build`,
gitignored).

**UI checks:** follow the screenshot workflow in `CLAUDE.md`. In cloud sessions, the approach was Playwright against
`vite preview` with the crm-api and model-catalog requests mocked.

---

## 10. Working conventions (owner preferences)

- **Short replies:** answer yes/no questions with Yes or No, and keep answers to 1–2 sentences unless asked to
  "explain". Code goes in files or the canvas, not in chat.
- **Approval before risk:** ask before anything destructive or risky, and show a plan before big features.
- **Branch and PR flow:**
  1. Work on a branch, run the tests above, then commit and push.
  2. Ask: "Should I open a PR and merge it?"
  3. Merge with **squash**. Each merge to `main` deploys automatically; check the "Deploy Agency" action.
- **Commit messages:** clear subject plus bullet body. Never put AI model IDs in commits or PRs.
- **Design:** follow `CLAUDE.md` (custom palette, layered shadows, no `transition-all`, hover/focus/active states).
- **CSP:** no inline scripts; Google Fonts only for styles.

---

## 11. Open items and ideas (not built)

1. **Payments:** a Stripe checkout so Pricing and upgrades are self-serve. Plans are admin-set today.
2. **Delete the 7 test clients** in Manage Clients using the Delete client button:
   - test-client-99
   - smoke-test-xyz
   - test_client_03
   - fb-mac-114dc095, fb-mac-c3a09ec7, fb-mac-23d780b3
   - agency_demo
3. **Lead source reporting:** record chatbot vs web form on each lead, and show a funnel per channel (visitors → leads
   → verified → replied → won). This was proposed, not built.
4. **House bot prompt:** check whether `client:default` in KV has its own `systemPrompt`. If it does, that prompt is
   used instead of the new `HOUSE_PROMPT`.
5. **Paid lead limits:** paid plans have no lead caps ("unlimited"). If caps are wanted, add `leadsPerDay`/`contacts`
   in plans.json; enforcement already reads them.
6. **Stale "Waiting 24h+" alert:** the lead drawer shows it even after the lead replied or a proposal exists.
7. **Terms of Service:** has no SaaS plan, trial or refund wording yet.
8. **Old lead migrations:** `migrations/` only has the early schema; newer tables are created lazily (see §5).
