# Our Work checkpoint — 5 November 2026

Implemented on `ux/our-work-navigation`, based on released `origin/main` 2008892.
The owner approved implementation and a preview before deployment. No merge,
push, PR or deployment has been performed for this change.

Delivered: Our Work navigation across marketing and legal pages; compact homepage
and chatbot previews; Built by BytesFX attribution and delivery scope for all six
projects; a featured BytesFX Chat & Sales case study; accurate project labels,
sample-data disclosures, relevant enquiry/trial actions and sitemap entry.

Validation:
- `npm run build` in `bytes-website`: passed, including consent, five navigation
  tests, nine catalogue tests, chatbot output checks and eight showcase pages.
- `node scripts/check-showcase-pages.mjs --self-test`: passed; five negative
  output mutations detected.
- `scripts/review-our-work.mjs` through the existing Playwright CLI: 437/437 checks,
  zero runtime errors, zero production writes forwarded. Thirteen routes at
  widths 1440, 1024, 800, 769, 768, 390 and 320; 200% text and real local project
  navigation. Layout fixes include the legal-page tablet header and text wrapping.
- `aramid check --staged --strict --json`: exit 0, no findings or degraded tools.
  This root gate runs secret checks; JS validation above is run in the website.
- `git diff --cached --check`: passed. Graphite reports a fresh shared graph.

Local preview: http://127.0.0.1:4173/projects/ (Vite preview session 75749).
Homepage: http://127.0.0.1:4173/ . Start again if the preview process has ended:
`npm run preview -- --host 127.0.0.1 --port 4173 --strictPort` in `bytes-website`.

Screenshots and result summary: `output/playwright/our-work/` (local review files,
not staged). Includes desktop/mobile catalogue, homepage and BytesFX case study,
chatbot preview and open mobile menu. Existing owner untracked files preserved.
No packages installed and no worker/backend production source changed.

Next: owner reviews the preview. Release requires the owner to request deployment;
a push to main deploys production components. Preserve this checkpoint and do not
reopen completed implementation work without new feedback.
