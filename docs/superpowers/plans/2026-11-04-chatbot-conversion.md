# Chatbot conversion implementation plan

> Execute inline using the executing-plans skill. The owner approved the focused design in docs/audits/2026-11-04-ai-chatbot-conversion-audit.md.

**Goal:** Make trial signup terms visible at the decision point, make plan enquiries predictable, and fix navigation accessibility without changing product entitlements.

**Architecture:** Keep build-rendered HTML and shared plans.json. Scope layout and copy to the chatbot page. Improve the shared disclosure-menu helper for both entry pages, using its existing 768px breakpoint. Preserve all production API contracts and sales routes.

**Stack:** Vite, semantic HTML, CSS, plain JavaScript; Node's built-in test runner and vm for menu regression tests. No new dependencies.

## Execution

- [x] Add scripts/test-navigation.mjs to exercise the actual ui.js helper with mobile/desktop state, inert closed links, Escape/focus return, outside/link/hash dismissal and missing-element cases. Confirmed four meaningful failures before implementing.
- [x] Update src/ui.js to keep aria-expanded, aria-controls, class state and inert synchronized. Close on Escape/hashchange/outside focus and reset on breakpoint changes. Add shared button focus and touch-target styles in src/home.css. Wire navigation tests into package.json's build command.
- [x] Update ai-chatbot/index.html and src/chatbot.css: skip link, local navigation, trial note adjacent CTA, facts before mobile demo, tighter hero clearance, truthful demo/setup/contact copy, 44px controls, pricing introduction and trial CTA. Remove only the verified unused Outfit font request.
- [x] Update src/plans-html.js labels to Ask about each paid plan, retaining hrefs and all prices/entitlements. Put the paid-enquiry explanation before the grid; retain Free signup and Enterprise enquiry.
- [x] Update src/chatbot-page.js to use prefersReducedMotion for both demo and upgrade scroll; use instant scrolling when reduction is requested so global CSS smooth scrolling cannot override it.
- [x] Run `npm run build` from bytes-website and `git diff --check` from root. Refresh Graphite. Use built Vite preview, with all external worker API calls mocked, for browser checks.
- [x] Batch desktop/mobile screenshots, 320px/390px/1440px layout checks, keyboard menu on both pages, FAQ, demo request/recovery/signup, client query forwarding and reduced-motion upgrade arrival. Confirm pricing terms remain data-driven. Run Impeccable detect once on changed markup and classify legacy-style false positives. All 36 browser checks passed, with 768px/1024px and 200% text sizing checked too.
- [x] Confirm in a second bounded visual pass and update the audit. Leave code local for owner review; do not publish without approval.

Error-path finding addressed during verification: src/chat.js accepts an optional unavailableMessage supplied only by the chatbot page. A failed demo now offers retry/signup instead of pretending to answer and soliciting unsaved contact details. Browser checks covered a forced 503 response followed by successful retry.

## Acceptance

Trial duration and no-card terms appear next to the hero signup link and before the demo on mobile. Paid CTAs name an enquiry and retain their plan parameter. Closed mobile links cannot receive keyboard focus; Escape returns focus to the trigger; desktop links remain usable across resize. No horizontal page overflow at checked widths, no production writes during UI checks, no unsupported claims, no price or entitlement changes.
