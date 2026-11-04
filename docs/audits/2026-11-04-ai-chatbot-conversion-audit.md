# AI chatbot page: UX and conversion audit
Date: 4 November 2026
Target: `bytes-website/ai-chatbot/index.html` and its linked page code.
Primary conversion assumption: completed free-trial signup. No conversion baseline or experiment results were available.

## Recommendation
Make a focused conversion pass within the existing teal-and-amber identity. Keep the real embedded chat, shared plan data, current entitlements, existing onboarding, and existing sales-enquiry routes. Improve decision clarity before adding visual novelty. No changes to production data or backend behavior are needed.

## Evidence and limits
- Inspected local page in isolated Edge at 1440 x 1000 and 390 x 844; checked page width at 320px.
- All worker/API requests were mocked; no production chats, leads, accounts, or settings were created.
- Local baseline screenshots (review artifacts, not application assets): [desktop](../../output/playwright/chatbot-before-desktop.png), [mobile](../../output/playwright/chatbot-before-mobile.png), [pricing](../../output/playwright/chatbot-before-pricing.png).
- At 390px, primary CTA begins at y=504, chat at y=578, trial facts at y=1148, pricing at y=3593.
- No horizontal overflow at 320px, 390px, or 1440px. No page errors observed in the audit run.
- The mobile menu remained open after Escape. Its button has neither aria-expanded nor aria-controls.
- All paid-plan buttons resolve to the homepage contact form with a plan query parameter; they do not buy or activate a plan.
- Browser evidence covers emulated viewport layout and mouse/keyboard interaction, not a physical phone, software keyboard, screen-reader session, or synthesized touch gesture.
- No field Core Web Vitals, slow-network test, complete WCAG conformance audit, or signup funnel experiment was performed.
- Graphite was consulted first. Its markup node has no dependency edges; linked CSS and behavior were therefore verified directly in source and in the browser.

## Audit health
These are scoped audit judgments, not certification or performance measurements.

| Dimension | Score | Evidence |
|---|---:|---|
| Accessibility | 2/4 | Menu state and dismissal gaps; input labeling and focus styles already exist |
| Performance | 2/4 | Layered legacy styles and four requested font families; runtime speed unmeasured |
| Theming | 3/4 | Coherent current tokens, with legacy CSS underneath |
| Responsive design | 3/4 | No observed horizontal overflow; mobile reassurance placement weak |
| Implementation integrity | 3/4 | Shared pricing and structured-data checks are sound; several copy/behavior mismatches |
| Total | 13/20 | Significant targeted improvements available |

## Prioritized findings

### P1: Mobile visitors see the conversion action before its reassurance
Location: `.cb-facts`, `.cb-hero-copy`, mobile rules in `src/chatbot.css`.
The no-card, trial-duration and starting-price facts follow the entire chat on phones. At 390px they begin 1,148px down, outside the initial 844px viewport.
Impact: visitors must decide whether to start before seeing the terms that reduce uncertainty.
Change: put a compact trial-duration/no-card statement immediately beside the hero CTA, with the remaining facts before the demo. Tighten the unused space above the mobile headline.

### P1: Paid-plan button labels imply a more direct action than the destination provides
Location: `src/plans-html.js`, `planButton`.
"Choose Starter/Pro/Business" leads to a general contact form. The explanation that the team sets up the plan appears after the cards.
Impact: visitors expecting activation or checkout encounter an unexpected sales step.
Change: preserve the legitimate contact destinations, label paid actions "Ask about Starter/Pro/Business", and explain the setup process before the grid. Keep a clear trial CTA at the pricing introduction. Do not invent a checkout flow.

### P1: Mobile navigation does not communicate or fully support its state
Location: `#mobileMenuBtn`, `src/ui.js:initMobileMenu`.
No expanded state or controls relationship is exposed; Escape does not close the open menu.
Impact: assistive-technology users cannot determine menu state, and keyboard users lack a familiar dismissal path.
Change: synchronize aria-expanded, add aria-controls, support Escape with focus return, and ensure closed links are not keyboard-focusable. Verify both pages if the shared helper changes.

### P2: Demo greeting invites questions the bot cannot reliably answer
Location: initial message inside `#chat-messages`.
"Ask me what your customers would ask" suggests the demo knows a visitor's business. The actual bot is configured for BytesFX, not the visitor's business.
Impact: a predictable off-topic response can make the product appear incapable.
Change: invite questions about the BytesFX chatbot, its setup and pricing. Keep the real demo and explicit disclosure that messages reach BytesFX. Do not pretend to personalize without configuration.

### P2: Navigation creates exits instead of helping evaluation
Location: `#navLinks`.
Services, Process and Contact predominantly lead back to the agency homepage. The dedicated product page has no direct navigation to its own how-it-works, pricing or FAQ sections.
Impact: visitors cannot quickly find purchase objections or compare costs.
Change: product-specific anchors for How it works, Pricing and FAQs; retain the brand/home link and a primary trial action.

### P2: Some copy sets inaccurate expectations
Locations: `#flowTitle`, `#howTitle` supporting copy.
"A lead you can call" conflicts with the described collection of name/email, not a phone number. "No developer needed" is unconditional despite requiring site access and script installation.
Impact: discrepancies weaken confidence and can disappoint less technical buyers.
Change: use "From first question to a lead you can follow up" and describe the actual one-line installation requirement. No invented setup-time, conversion-rate, customer-count or compatibility guarantees.

### P2: Upgrade arrival ignores reduced-motion preference
Location: `src/chatbot-page.js`, upgrade scroll.
The demo action respects reduced motion, but the upgrade-target scroll always requests smooth behavior.
Change: reuse the existing reduced-motion helper for the upgrade scroll and verify the target plan remains visible.

### P2: Font and stylesheet loading carry legacy baggage
Locations: page font request, `style.css`, `src/style.css`, `src/home.css`.
The page requests four font families. Rendered body/headline use Geist and Bricolage Grotesque; the mono role uses JetBrains Mono. There are overlapping legacy and current styles.
Impact: unnecessary requests and complicated overrides increase loading and maintenance costs; no measured LCP claim is made.
Change: remove the unneeded Outfit request only after checking page elements; keep existing brand fonts. Limit CSS edits to page scope rather than attempting a site-wide stylesheet replacement.

### P3: Send control is smaller than the preferred touch target
Location: `.cb-chat-send`.
The send button measures 42 x 42px.
Change: enlarge to at least 44 x 44px and retain visible focus states.
This is an enhanced usability improvement, not automatically a WCAG AA failure. WCAG 2.2 AA's minimum is 24 x 24px subject to exceptions.
Reference: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

## Impeccable detector interpretation
The source detector was run. It follows imported legacy styles and reported fonts, flat type hierarchy, purple gradients, pulsing dots, a marquee and glow effects.
Most are not verified defects on this rendered surface: the measured headline uses Bricolage Grotesque with a clear size hierarchy; current accents are amber and mint; the chat status dot is static. Typing animation conveys a real pending response.
Do not redesign the brand or remove meaningful chat feedback merely to clear these source warnings. Legacy stylesheet overlap is a real maintenance finding.

## Strengths to preserve
- The product can be tried directly on the page, with no signup required to see it.
- Trial links already reach onboarding directly.
- Prices, entitlements, FAQs and structured data derive from shared data, with build checks against drift.
- Native FAQ details, a labeled message field, semantic page landmarks and visible focus treatments are already present.
- No fabricated reviews, conversion statistics or customer-logo wall.

## Design options
1. **Focused conversion refinement (recommended):** fix the nine findings while keeping the current identity and sales model. Smallest regression surface, fastest review.
2. **Pricing-led restructuring:** move pricing directly after the hero. Faster cost evaluation, but interrupts the explanation and live-demo progression.
3. **Full visual redesign:** replace the page composition and visual identity. Greater review and regression cost; current evidence does not justify it.

## Proposed implementation
- Preserve the existing main headline and brand treatment.
- Put trial duration and "No card needed" next to the hero CTA; keep the demo secondary and bring mobile reassurance above it.
- Use page-specific navigation and a skip-to-content link.
- Clarify demo greeting and the two inaccurate headings/setup claims described above.
- Keep all five plans and their entitlements. Explain paid-plan enquiries before the grid and make their CTA labels explicit.
- Fix menu state/dismissal with tests covering the shared helper; respect reduced motion on upgrade arrival.
- Enlarge chat send/choice hit areas to 44px where practical, remove the unused font request after verification.
- Do not add testimonials, tracking, sticky overlays, new checkout, or changes to plan data.
- Build; verify desktop/mobile, keyboard menu, CTA destinations and reduced motion in one batched browser pass; fix once and confirm in at most one additional pass.
- Run Impeccable detector after changes and classify findings against the rendered page.
- Report shipped changes separately from hypotheses. Measure eventual signup completion per eligible page visit before claiming conversion improvement.

## Suggested Impeccable sequence
Clarify + layout/adapt for the conversion hierarchy; harden for navigation behavior; optimize for verified payload waste; polish last.
## Approved implementation and verification

The owner approved the focused design. Implemented on branch `ux/chatbot-conversion`; not yet published.

- Trial terms now sit directly below the primary CTA; facts precede the chat in both DOM and mobile visual order. Removed the duplicated 80px navbar clearance from the hero.
- At 390 x 844, trial reassurance begins at y=448 instead of y=1148. The price/install facts end at y=542 and the demo begins at y=566. These are layout improvements, not conversion-rate results.
- Product navigation links to How it works, Pricing and FAQs; a skip link reaches the main content. The shared mobile helper now synchronizes expanded state and inert links, closes on Escape with focus return, and resets correctly across breakpoints. The homepage was checked too.
- Paid labels now say "Ask about" and the enquiry process is explained before the cards. All five plans, prices, entitlements and sales routes are retained; client context still forwards on upgrade enquiries.
- Demo greeting, setup requirements and follow-up wording now match the actual product. During error-path verification, identified canned fallback replies that can solicit contact details even after an API failure. The chatbot page now uses an explicit unavailable/retry message through an optional shared-helper parameter; homepage fallback behavior is preserved.
- Chat controls have 44px minimum targets where changed. Both demo and upgrade scroll respect reduced motion, using instant scrolling when reduction is requested. Removed the unused Outfit font request.

Validation:
- `npm run build` passed, including consent checks, five navigation regression tests and all existing pricing/FAQ/structured-data checks. Four navigation tests failed against the original helper before the fix; all five pass after it.
- The local built site passed 36 browser checks: CTA destinations, all plan cards, enquiry labels, explanation order, skip-link focus, mobile reassurance placement, menu state and Escape, closed links excluded from focus, FAQ, mocked chat success/failure/recovery, persistent trial action, upgrade context and reduced motion, onboarding arrival and homepage navigation.
- No observed horizontal overflow at 320, 390, 768, 1024 or 1440px, or at 390px with 200% root text sizing. No uncaught browser errors. This does not replace physical-device, screen-reader or browser-zoom testing.
- Two bounded desktop/mobile visual passes completed. Final confirmation: pricing heading clears the fixed nav; all mobile menu links fit within 844px; closed links are inert; visible chat choices are at least 44px high.
- All external API requests were mocked; no production messages, leads, accounts or settings were written.
- Impeccable detector rerun on changed markup. Legacy-style warnings remain as described above. It also flags the short trial/no-card reassurance as aphoristic cadence; that copy conveys concrete eligibility terms at the decision point and is retained intentionally.
- Graphite refreshed; `git diff --check` passed.

Local final review screenshots: [desktop](../../output/playwright/chatbot-final-desktop.png), [mobile](../../output/playwright/chatbot-final-mobile.png), [pricing](../../output/playwright/chatbot-final-pricing.png), [mobile navigation](../../output/playwright/chatbot-final-mobile-menu.png).

Remaining measurement: compare completed signups per eligible page visit after release. No conversion lift, Core Web Vitals gain or complete accessibility conformance is claimed.
