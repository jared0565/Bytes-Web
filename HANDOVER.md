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
  test/                        node test/run.mjs (website gate, prompts, scripted flow, chat endpoint)
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
    data-fixes/                One-off SQL for the live database, run by hand (see §7, Brand name)
    test/                      node test/run.mjs (10 suites, ~145 checks)
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

Add `--config wrangler.toml` to Wrangler commands in this folder (`npx wrangler secret put NAME --config wrangler.toml`).
Without it, Wrangler (seen on 4.72) uses the website's `wrangler.jsonc` from the repo root, and the command acts on the
website worker instead.

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
| `ADMIN_API_KEY` | Keys the scrambled visitor id used for the per-visitor chat limits. It must stay set: without it every chat gets a 503, because an id made with a fixed key could be matched back to an IP address. Changing it only resets that day's counts |

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

chatbot-api's `ensureSchema()` does the same for `chat_logs` columns `session_id`, `flag` (the AI's label for the
message) and `visitor` (the scrambled visitor id; crm-api's `/api/logs` leaves it out of what it returns).

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

| Mode | Messages/day | Notes |
|---|---|---|
| `scripted` | 400 | Guided questions built from the client's Services list |
| `ai` | 2,000 | |
| `ai_plus` | 5,000 | Allows premium models (output price > $15 per 1M tokens) |

Old mode names map over: free/standard → scripted, pro → ai, elite → ai_plus.

**Chat limits** are the same on every plan. The first four are in plans.json under `chat`:

| Limit | Value | Notes |
|---|---|---|
| Messages per chat | 10 | Later messages get a fixed reply with no AI call. A first email typed then is still saved as a lead |
| Characters per message | 500 | Both chat boxes stop typing there and show a count; the server refuses longer messages |
| Messages per visitor per day, per bot | 30 | The visitor is a keyed hash of their network that changes daily (`chat_logs.visitor`) |
| New leads per visitor per hour, per bot | 3 | Each new lead sends a confirmation email. A lead over the limit is not saved |
| Messages per visitor per minute, per bot | 8 | `CHAT_LIMITER` in `chatbot-api/wrangler.jsonc`, not plans.json |

A visitor's network is their IPv4 address, or the first half (/64) of an IPv6 address (`netOf`). All three per-visitor
limits count it, so changing address inside one IPv6 network does not reset them.

Fixed replies (over a limit, chat closed, AI unavailable) are not written to `chat_logs`, so they do not count against
the daily allowance. The one exception is a first email typed after the chat limit: that message is logged.

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
- Homepage sections and the site's own chat box (markup in `index.html`). `public/widget.js` is the separate
  embeddable widget for clients' sites: a change to one usually belongs in both.
- Pricing built from plans.json. `?upgrade=<plan>&client=<id>#pricing` highlights a plan and pre-fills the request.
- Contact form posts to `POST /api/public/website-lead`.

**Chat widget and chatbot-api:**
- **Website gate (`siteGate`):**
  - A bot answers only on its saved websites, plus web.bytesfx.com for previews.
  - A client bot with an empty list adopts the first real website it's used on, once. The owner is emailed via
    `/api/webhooks/domain-adopted`.
  - Onboarding now requires a website.
- **Question order (every bot):** need, then name and email in one question, then timeline, then budget. The email is
  asked for twice at most. Design and evidence: "Chatbot Conversion Design"
  (https://claude.ai/code/artifact/dc745756-cf9a-4083-99c7-3dc8d084490c).
- **Service choices:** when a chat opens, both chat boxes (the site's own in `src/main.js`, and `widget.js`) show
  the bot's Services as buttons under a one-line greeting ("Hi! How can we help?"), then "Something else", which
  puts the cursor in the text box.
  - The list comes from `/public/config` (`services`: 8 at most, 60 characters each). The Bytes bot falls back to
    Websites, Web applications, AI chatbots (`HOUSE_SERVICES`) when none are saved. A bot with no services keeps the
    old greeting and shows no buttons, and so does the site chat when the settings can't be read.
  - A tap sends the service name as an ordinary first message, so it counts toward the 10 per chat and 30 per day.
    Script bots match it exactly (`matchService`) and go straight to name and email. AI bots are told which choices
    the chat box shows (the `CHOICES` part of the prompt), so they don't ask what the visitor needs again.
  - The buttons show only for a new chat (no session id stored in the tab) and go the moment a message is sent,
    tapped or typed. Later in a chat a tap would be read as the answer to a different question.
- **Brand name:** the product is BytesFX in everything a client sees: emails, the widget badge, the dashboard,
  onboarding, the login setup page and authenticator apps. The old name, BytesAI, was replaced on 2026-10-11.
  - Emails name the business from the bot's saved Company name (`companyNameFor`). Only the Bytes bot with none
    saved falls back to "BytesFX". A sender with no name saved also goes out as "BytesFX".
  - The crm-api `brand` suite fails if the old name appears anywhere under `chatbot-api/` or `bytes-website/`,
    including split across tags, as the dashboard and onboarding logos were (`Bytes</span><span>AI`).
    Two places are allowed: the chat worker's repair of badge links saved under `web.bytesai.com`, and the
    data fix below.
  - Stored email text is not changed by a deploy. `crm-api-worker/data-fixes/2026-10-11-bytesfx-name.sql`
    updates the stored follow-up template and the Bytes emails and proposals not sent yet. It is run by hand
    with the owner's OK, from `bytes-website/crm-api-worker`:
    `npx wrangler d1 execute chatbot-db --remote --config wrangler.toml --file data-fixes/2026-10-11-bytesfx-name.sql`.
    It was run on the live database on 2026-10-11 and changed nothing: a count straight after found no stored
    template, unsent email or proposal with the old name. The first try failed with "Authentication error
    [code: 10000]" on the upload step; `npx wrangler login` again fixed it.
  - Saved settings are edited in the dashboard, not here: the Company name, the bot's prompt and the sender name.
  - The chat's session key in the tab is `bytesfx_chat_<clientId>`.
- **Prompts:**
  - The Bytes prompt (`HOUSE_ABOUT`, `HOUSE_STEPS`, `HOUSE_FACTS`, `HOUSE_RULES`) is used only for `default`. Its
    plan prices and trial length are filled in from plans.json.
  - Client bots without a usable prompt get `clientDefaultPrompt()`, built from company name, services and booking link.
  - Prompt lines with unfilled `[blanks]` are dropped.
  - Every AI bot, clients' own prompts included, also gets the security rules, the topic rules and a `THIS TURN`
    block (message number, whether an email was given, and the confirmation sentence to say when the email arrives).
    The sentence is given word for word and later messages say not to repeat it or take it back: in a live test the
    bot, left to its own words, withdrew its confirmation one message later.
  - The leak guard (`leaksPrompt`) covers the instructions only, so a reply can quote prices and links.
- **Off-topic and spam:** the AI starts each reply with a hidden label, `[business]`, `[offtopic]` or `[spam]`. The
  code removes it and stores it in `chat_logs.flag`. Spam closes the chat at once, and so does a second off-topic
  message. No label counts as business. Without AI: a message with no letters or numbers, or with 3 or more links,
  gets a nudge; the same long message twice gets the same reply back.
- **Lead capture:** the lead is saved on the message that carries the email, never from spam and never for a
  placeholder address (test@test.com). No second lead for the same email on the same bot within 30 days.
  - AI bots: gemini-2.5-flash-lite reads the chat for name, need, budget and timeline, and reads it once more two
    messages later to update the lead.
  - Script bots: the script updates the lead as timeline and budget arrive.
  - An update never replaces a known value with an empty one, and never changes the email.
  - Nothing a visitor can see depends on the `leads` table: not the reply, not how long it takes, not the
    `THIS TURN` block. Otherwise a reply would show whether an email address is already a lead of that business.
    So every visitor who gives an email gets the same confirmation sentence ("...unless you've already had one"),
    the lead is saved after the reply has gone (`keepLead`, in `ctx.waitUntil`), and one SQL statement checks and
    saves it. The reply no longer returns `leadData`.
  - Known limit: a visitor over the hourly lead limit is told the same as everyone else, but that lead is not saved.
- **Scripted bot (`scriptedTurn`):** works out where a chat is by replaying the visitor's messages from `chat_logs`.
  It cannot answer questions and says so.
- **Where the chat sends people:** the contact form (`#contact`) on the Bytes website; a client's booking link, or
  "the contact form on this website" when the client has none. LinkedIn is offered only when a visitor asks for a
  person.

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
cd bytes-website/crm-api-worker && node test/run.mjs        # all 10 suites, or: node test/run.mjs flow plans
cd chatbot-api && node test/run.mjs                         # website gate, prompts, scripted flow, chat endpoint
cd chatbot-api && npx tsc --noEmit -p .                     # typecheck
cd bytes-website/crm-api-worker && npx wrangler deploy --dry-run --config wrangler.toml   # bundle check, nothing is deployed
cd bytes-website && npm run build                           # website + copies public/
```

The bundle check should list the DB, KV, R2 and LLM bindings. "No bindings found" means it checked the website worker
instead: without `--config wrangler.toml`, Wrangler (seen on 4.72) uses the `wrangler.jsonc` in the repo root.

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
| `brand` | The BytesFX name in emails and code, the one-off data fix |

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
   used instead of the Bytes prompt in the code.
5. **Paid lead limits:** paid plans have no lead caps ("unlimited"). If caps are wanted, add `leadsPerDay`/`contacts`
   in plans.json; enforcement already reads them.
6. **Stale "Waiting 24h+" alert:** the lead drawer shows it even after the lead replied or a proposal exists.
7. **Terms of Service:** has no SaaS plan, trial or refund wording yet.
8. **Old lead migrations:** `migrations/` only has the early schema; newer tables are created lazily (see §5).
9. **Chat, second build** (in the design document linked in §7, not built): a duplicate check on the contact form, an
   opening line that says the bot is an AI assistant, tap-to-answer buttons, a chat funnel in Analytics, and limiting
   the Bytes bot to web.bytesfx.com.
10. **Chat limits are starting points:** the 10-message limit is a judgement, not a research figure. Review it after
    about 100 real chats (the design document says how to read the data).
11. **No stored follow-up template on the live database:** `email_templates` was empty on 2026-10-11 (counted, not
    read). `generateRuleSequence` needs the row "Standard Web Design Sequence" for the Bytes site, and throws
    "Standard template not found" without it. `autoSequence` swallows that, so a Bytes lead gets no follow-up
    emails when the campaign mode is not AI, or when the AI write fails. The row is seeded by
    `migrations/0001_init.sql` under client `agency_demo`. Why it is gone is not known.
