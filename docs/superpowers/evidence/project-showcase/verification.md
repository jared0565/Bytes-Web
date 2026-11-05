# Showcase implementation verification

Verified 5 November 2026 on ux/project-showcase. Application base 52ad87a; planning checkpoint 702ebf3. Tested source: PS01–PS07 plus final screenshot links and scoped branding-test correction.

| Check | Result |
|---|---|
| npm --prefix bytes-website run build | Exit 0: six consent cases, five navigation tests, seven showcase tests, Vite, existing chatbot output check and seven-page showcase audit |
| node bytes-website/scripts/check-showcase-pages.mjs --self-test | Exit 0; five deliberately broken output mutations detected |
| Isolated Edge browser, first completed pass | 108/108 checks; zero runtime errors |
| Isolated Edge browser, final confirmation | 108/108 checks; zero runtime errors |
| aramid check --gate pre-push --all --strict --json | Exit 0; zero findings/degraded tools; gitleaks, configured Node worker suites, semgrep, inline scans and shadow ran |
| Focused worker brand suite | 15 passed, zero failed |
| git diff --check | Exit 0 |

Root automatic JS/npm detection excludes subdirectory package.json files. The website build and Node tests were executed explicitly; the configured root gate executes both worker suites.

## Browser coverage

Seven routes at 320, 390, 768 and 1440px: chatbot, project index and five cases. Tested direct responses, one H1, loaded/labelled images, trial actions, overflow, keyboard disclosure/focus, skip link, mobile menu/Escape, five plans, paid enquiries, project actions, mocked chat reply, reduced motion and 200% text sizing.

An initial harness attempt timed out waiting on lazy images in a closed disclosure before screenshot inspection. The harness now opens it first. Initial section captures included fixed navigation during element scrolling; final section captures hide fixed chrome only for the photograph. Full-page captures retain navigation, which is tested separately. Full-size lead/proposal image links were added for mobile inspection and confirmed in the final pass.

The root gate initially failed because its retired agency-name scanner matched the owner-selected BytesAI Learning product. The correction strips only its exact title, slug and domain in seven named showcase files. Four regression assertions verify the exception and retain rejection of bare retired branding, the old agency domain and tokens outside those files. No worker production logic changed.

## Network isolation

Production APIs intercepted before local page load. The chatbot POST was fulfilled locally; the final pass also mocked a social-links GET. Zero production API requests forwarded. No real chats, contacts, emails, bookings, purchases or settings writes. External asset capture blocked 19 writes. Its external platform hydration/blocked-request errors are disclosed in assets.md; previews are not full functional audits.

## Design review

Two completed visual passes; detector run once. Its 72 findings comprised 70 references to inherited global stylesheet patterns repeated across seven pages, a heading-size advisory that missed bundled styles and an existing chatbot copy-cadence warning. No finding targets the new showcase stylesheet/renderer. Existing palette, fonts and button treatments deliberately retained. Screenshots confirm responsive stacking and readable text hierarchy. Review performed inline under the saved no-delegation instruction.

- [Desktop projects](desktop-projects.png)
- [Desktop product proof](desktop-product-proof.png)
- [Mobile projects](mobile-projects.png)
- [Mobile product proof](mobile-product-proof.png)

## Tested output fingerprints

- bytes-website/dist/ai-chatbot/index.html SHA-256: 8e08f7a259a3778292ea785fd5e0a2fd86a94824ed626e95cc4cbf84dee93630
- bytes-website/dist/projects/index.html SHA-256: 1db44be4df7ff39b8d40ad90007bcc65c2f3b941a9dab0bc45fc8edd4da2d1a9
- bytes-website/src/showcase-html.js SHA-256: b1d244bf1c59b8add872b31834db2c037025f0db3ef8e7d8f27feac8eab9b92a

No packages installed. Capture helper paths made checkout-relative after browser verification; this changes artifact location only. Preview/browser closed. Public previews are editorial evidence, not measured customer outcomes. BytesCRM remains draft. No application merge or deployment performed.
