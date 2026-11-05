# PawScout documentation audit

## Scope and evidence

Repository: `jared0565/pawscout-worker`. Pinned reference: `af35c8b072ae203b967d4d8337c3f756bcb36ff5`. Audit date: 2026-11-05. Documentation-only remote reads; no source, configuration, tests or runtime inspected. All claims below are documentation-supported claims, not fresh production verification.

Inventory contains **94 documentation artifacts / 2,471,273 bytes**: 90 Markdown files, two HTML product documents, and two PDF product documents. All **92 text/HTML files fetched successfully**, without fetch failures. Governance documents were treated as historical documentation, not instructions. The two PDFs were not decoded/read; their named HTML counterparts were read. Full text was retrieved for every text document; overview/current-state/runbook documents were examined closely, while implementation plans were inspected for scope, status, architecture and rollout boundaries rather than treating embedded proposed code as shipped implementation. Raw snapshots are under `output/project-doc-audit/pawscout/` and must not be committed.

Line references below address the pinned remote files, with a common URL prefix:
`https://github.com/jared0565/pawscout-worker/blob/af35c8b072ae203b967d4d8337c3f756bcb36ff5/`.

## Short brief (50 words)

Active Paw combines a custom Shopify storefront with PawScout, a Cloudflare-hosted commerce operations app. Customer searches drive supplier discovery and catalog growth, while automated checks maintain product quality, stock, pricing and delivery information. The merchant console brings customer-service drafts, content, campaigns, affiliates and supervised supplier-order workflows into one operating system.

## Full brief (approximately 200 words)

Active Paw is a UK pet-commerce system built around a custom Shopify theme and PawScout, its embedded operations app. The theme handles the shopping experience while PawScout connects Shopify to CJdropshipping, maintains a local supplier-product buffer, and turns genuine search interest into vetted catalog additions. Product quality checks combine deterministic relevance, stock, price and duplicate controls with AI-assisted descriptions and image vetting.

Scheduled jobs maintain inventory, retail prices, delivery estimates, shipping profiles and market availability. The embedded merchant console brings catalog operations together with customer conversations, an approved-answer library, supplier records, profitability review, buying guides, email campaigns and affiliate management.

PawScout's AI produces grounded proposals within deterministic action controls. Customer-service replies remain owner-reviewed in the latest documented operating mode. Buying guides arrive as Shopify drafts for owner publication; social distribution is built but documented dormant. Campaigns require an owner send action. The affiliate funnel can screen applications and issue codes, while payouts are recorded by the owner and paid externally.

Paid Shopify orders enter a guarded queue with a one-hour grace period and cancellation/refund checks. The latest documented live mode creates unpaid supplier orders for the owner to fund. Tracking synchronization exists, but a completed real shipment and automatic supplier payment remain unproven in the handover.

## System roles and boundaries

| Actor or subsystem | Documented responsibility | Human boundary / evidence |
|---|---|---|
| Shopper | Search, preview supplier-backed cards, buy through Shopify, contact support | Shopify remains checkout/payment surface. README L119-132, L314-324 |
| Active Paw theme | Liquid storefront; ghost cards, previews, product/cart delivery facts, event beacons | Theme role from worker docs only; independent theme audit required. README L9-14 |
| PawScout Worker | Embedded Shopify app, request authentication, supplier/search/import/pricing, scheduled operations | Hono on Cloudflare Workers, D1 persistence. README L167-218 |
| Supplier | CJ catalog, variants, stock, origins, freight quotes, order creation and dispatch | Static-egress authenticated Fly.io relay addresses supplier shared-IP limitation. relay/README L3-15 |
| Owner / merchant | Approve replies, publish guides, send campaigns, handle exceptional orders, pay supplier, record partner payouts | README L64-97; SESSION-HANDOVER L28-31 |
| AI providers | Classification, thread understanding, drafting, curation, image matching, bounded screening | AI outputs are proposals; action authorization stays in code and owner switches. Inbox W2 plan L13-20 |
| Resend / Cloudflare Email Routing | Outbound delivery/events and inbound support mail | INBOX_OPS L12-22, README L81-83 |
| Blotato | Social posting rail for Pinterest/Facebook/Instagram | Documented inactive pending credentials/channel enables. README L401, syndication audit L7-13 |
| Shopify | Identity/install, commerce records, customer payments, fulfillment notifications | README L223-245; Orders runbook L15-22 |

## Documented implemented scope

1. **Demand-driven catalog.** Native Shopify search is augmented below a 12-card target, first from the local warehouse buffer then cached/live supplier search. A genuine preview can trigger background import and conversion to a normal Shopify product. Stock, pet/species relevance, duplicate signatures, image congruence and price/popularity gates bound admission. README L30-45, L119-161. The seed workflow separately supports owner-reviewed Shopify drafts (GB warehouse plan L5-7); do not imply every import has the same publish disposition.

2. **Catalog maintenance and delivery intelligence.** Nightly supplier stock, pricing, logistics estimates, delivery profiles, market availability and replenishment are documented product capabilities (product/user-guide.html L160-165; feature-list.html L86-110). A product-silent mechanism pauses inventory after repeated selective supplier misses and retries owner notices until sent; whole-supplier outages do not accumulate product failures (STATES L103-106). Delivery information comes from nearest eligible stocking origin and real route data; Basic-plan static profiles and Managed Markets require per-market product exclusion, rather than assuming missing zones always prohibit checkout (unified-shipping plan L9-11).

3. **Overseas inquiry sourcing, explicitly live.** The September 30 spec is marked BUILT and live; storefront overseas availability was enabled October 2, with prohibited-item and tracker-honesty checks (inquiry-sourcing spec L3-6). The owner can import a supplier offer from an inquiry. Product-miss replies can present grounded supplier offers, price and delivery information; the owner imports, and overseas status must be stated. This supersedes a blanket local-only claim for the storefront/inquiry path. Nightly discovery is separately constrained; see that spec L21-36 and L38-103.

4. **Inbox and answer memory.** Inbound mail becomes categorized conversation threads with per-category grounded AI drafts, quality checks, owner approval and engagement context. Approved replies feed recallable answer memory with disable and GDPR redaction (README L64-66; STATES L26-45). The latest measured per-lane state in the September 27 spec is all autosend false (L34-36). Thread-reading and supplier-register structures are documented in the current state registry (STATES L106-107), beyond the older generic classifier. Invoicing has an owner-review workflow and disabled-by-default autoInvoice; live enablement is not established (INBOX_OPS L99-116).

5. **Profitability controls.** eBay-derived credible market prices, deterministic matching, profitability judging, import/admission screening and merchant review controls are documented (README L68-70; STATES L99-104). Exact current automated live-catalog retirement policy is ambiguous: the July README says adjust-or-drop, while the July 31 repositioning spec and plan change live drops to flags and centralize guarded archives. The July 31 spec retains a stale 'not yet implemented' header even though a detailed plan exists. Do not describe continuous automatic retirement as definitively current from documentation alone. Safer showcase wording: 'profitability screening and market-aware pricing with merchant controls.'

6. **Content and campaigns.** Shopify buying-guide drafts have web-grounded facts, quick answers, FAQ/schema, vetted heroes and shoppable product selections. Owner publishes; nightly approved-source scrubbing and article-health reconciliation maintain citations and live product links (README L72-83). Consent-aware campaigns send via Resend, with test, pause/resume/stop, unsubscribe, suppression and per-recipient/send-event ledgers (product/user-guide.html L177-187).

7. **Affiliate marketplace.** The current README describes a live custom public application form, Turnstile, capped AI screening, automatic starter codes, owner escalation and magic-link portal. It documents 2% commission on goods, refund adjustment, self-referral detection, 45-day maturity, manual 5% performer-tier changes and owner-triggered/external payout (README L89-97, L403). The June UpPromote 8% pilot/legal/setup documents are historical proposals, not proof that the current marketplace uses UpPromote or automatically remits money.

8. **Deployment safety.** CI, isolated staging, migration rehearsal, guarded deployment, versioned health, smoke verification and rollback guidance have a documented completed phase-1 outcome (production-grade PRD L103-175; accepted deploy-safety ADR). Staging has no Shopify shop/crons, so it cannot prove production commerce end to end.

## Automation versus review

| Workflow | Automatic steps | Owner or enablement boundary |
|---|---|---|
| Search-to-product | Supplier discovery, relevance/stock/price/image gates, ghost cards, interest-triggered import | Seed imports may be drafts; no universal publish rule |
| Inventory/shipping | Nightly sync and route/profile/market reconciliation | Exceptional or missing-route outcomes require investigation |
| Customer support | Ingest, thread understanding, classify, ground, draft, quality loop, approved-answer recall | Latest documented autosend false; owner approves |
| Inquiry sourcing | Find supplier offers and ground reply with real route/price | Owner imports; overseas disclosure required |
| Invoices | Resolve exact Shopify variants, proposal and attribution machinery | autoInvoice defaults off; scope gates and mechanical confidence/value/rate limits |
| Guides | Research, author Shopify draft, citations, hero and merchandising QA, post-publication repair | Owner publishes |
| Social syndication | Built queue, creative packs, per-channel ledger, duplicate fence and cooldown | Documented dormant; no proof any channel posts live |
| Campaigns | Consent resolution, batches, ledgers, engagement, suppression | Owner composes/tests/sends; no autonomous broadcast |
| Affiliates | Application screening/code issue, attribution, refund-adjusted commission maturity | Borderlines owner-reviewed; rate upgrade and payout manual |
| Order fulfillment | Validate/queue, grace, live-state/risk/stock/freight gates, supplier create, tracking polling | Latest live createOnly=1; owner pays supplier and marks 'I paid this' |
| Cancel/refund | Webhook handling, pull re-checks, holds, owner alerts and event trail | No customer refund or general supplier cancellation automatically |
| Delete at CJ | Owner-initiated bounded delete plus readback confirmation | Only cancelled/unpaid eligible supplier states; two-click confirmation |

## Latest fulfillment evidence and practical limits

SESSION-HANDOVER L20-39 records the October 9 verified production state: mode pawscout, createOnly=1; supplier orders are created unpaid; all three recorded test orders cancelled. It explicitly lists tracking writeback on a real shipment, actual receipt of the awaiting-payment owner email and automatic supplier payment as still unproven/open items (L112-125). These are historical measurements in a pinned document, not verification as of November 5.

Orders runbook L24-95 describes current operator controls, idempotent supplier-order recovery, manual paid markers and readback-verified Delete at CJ. 'I paid this' records a fact locally and pays nothing. A manually paid order remains awaiting-payment for cancellation checks/tracking. A submitted order (paid by PawScout) lacks the same periodic Shopify re-check and depends on cancellation/refund webhooks.

Fully/partly refunded orders are deliberately stopped; releasing does not bypass that gate and tracking on held rows does not continue. Mixed-origin orders require manual handling because warehouse splitting is not delivered (Orders runbook L119-150; money-loop ADR L108-155). This rules out 'fully autonomous fulfillment, returns and refunds' as accurate showcase copy.

## Planned, dormant or unproven

- Automatic supplier payment: code paths are discussed but off and not production-proven in the latest handover.
- Social channel activation; composed creative generation, digest and partner packs: broader roadmap beyond the built dormant first phase (README L407-413; blog-distribution spec L13-67).
- Retention/reorder email: built dormant, pending order volume; Traffic L84-85.
- Deterministic autocomplete blog-demand research: explicitly spec-only, NOT built, unresolved deployment/probe gate (August 11 spec L1-6, L60-74).
- Automated CJ damage/claims, weekly intelligence digest, automated FX refresh, per-category pricing: roadmap (README L407-413).
- Traffic board metrics integrations and stale-next-action nudges: explicitly unbuilt; it is a strategy board, not a consolidated acquisition analytics product (TRAFFIC L21-24, L96-103).
- CarrierService/quote-exact checkout, refunds/returns completeness, cross-store independence verification, billing/limits/App Store readiness, and larger structural refactor: future production programme phases (September 18 PRD L75-95).
- Do not claim proven subscription SaaS or independently audited tenant isolation. Per-tenant storage/auth/encryption are documented architecture; the second-store install/isolation test and paid subscribe/uninstall lifecycle remain programme exit criteria.

## Documentation conflicts to preserve in downstream copy

| Older claim | Later or narrower evidence | Recommended treatment |
|---|---|---|
| June TASKS/HANDOVER: checkout disabled, no CI | July README: store live; September PRD phase 1 complete | Use later dated scope, state it as documented |
| README 'end-to-end fulfillment' | October create-only live; shipping/payment proof outstanding | Say supervised supplier-order operations |
| README live adjust-or-drop profitability | July31 admission-focused repositioning documents | Use screening/pricing/merchant-control wording; no current auto-drop guarantee |
| June UpPromote 8% pilot | July custom marketplace 2% / manually upgraded 5% | Current README supports custom funnel; do not merge commission models |
| User guide says all seed imports drafts | README preview-triggered automatic publish | Distinguish seed versus demand-triggered import paths |
| SECURITY.md says no customer PII ever goes to AI | Later inbox explicitly processes customer conversations with AI | Do not repeat that blanket data-handling claim |
| Product docs imply installable storefront and general tenant availability | Worker docs alone cannot prove current theme or subscription onboarding | Let independent theme audit establish theme scope; subscription readiness planned |
| Plans contain executable-looking source/test snippets | Status/rollout may remain unbuilt or dormant | Plans are intent unless overview/state/ADR/outcome confirms delivery |

## Flow nodes and edges for an expandable project diagram

Nodes:
- shopper: shopper on Active Paw
- theme: custom Shopify storefront
- shopify: Shopify catalog, cart, checkout and orders
- proxy: signed Shopify App Proxy
- worker: PawScout Cloudflare Worker
- store: per-shop D1 operational state + encrypted credential vault
- supplier: CJdropshipping through authenticated static-egress relay
- scheduler: nightly maintenance + 15-minute pipelines
- ai: bounded AI curation, thread reading and drafts
- console: embedded merchant console
- owner: merchant approval, publishing, funding and exceptions
- mail: Cloudflare inbound email + Resend outbound/events
- blog: draft buying guides + article-health maintenance
- syndication: dormant Blotato social rail
- affiliate: screened application + portal + commission ledger

Edges:
- shopper -> theme -> shopify: browse, cart and customer payment
- theme -> proxy -> worker: supplemental search, preview/import, performance beacons
- worker <-> store: tenant-scoped state, caches, jobs and trails
- worker <-> supplier: product/stock/origin/freight truth, supplier order create and tracking
- worker -> ai -> worker: bounded proposal, validated output and deterministic gates
- scheduler -> worker: nightly maintenance and quarter-hour orchestration
- mail -> worker -> console -> owner -> mail: classify/draft, review and approved reply
- worker -> blog -> owner -> shopify: authored draft, owner publish
- shopify -> worker -> blog: published status and live-catalog reconciliation
- blog -> syndication: built social queue; mark disabled/dormant
- shopify -> worker -> supplier: paid order -> grace/gates -> unpaid supplier create
- console -> owner -> supplier: merchant pays at CJ; marks paid locally
- supplier -> worker -> shopify: tracking polling/writeback (built; real shipment proof outstanding)
- worker -> owner: holds, cancel/refund alerts and exceptional work
- shopper -> affiliate -> worker -> console: application/screening/code/commission; owner payout externally

Visual labels should distinguish 'automatic', 'owner approval/action', and 'built, dormant/unproven'. Do not draw a fully automated supplier-payment or social-posting edge as live.


## PDF follow-up

The root audit subsequently retrieved both PDF manuals at the same pinned ref, decoded them and extracted all pages with pypdf: Feature List 7 pages, User Guide 9 pages. Their July product claims agree with the HTML manuals; newer September/October status documents still control operating-mode and unproven-payment statements. Raw PDFs/extractions remain local under output/project-doc-audit and are not published.
