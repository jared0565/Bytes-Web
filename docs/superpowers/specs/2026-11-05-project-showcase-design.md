# Project showcase design

Status: proposed implementation design, updated with owner-supplied domains. No site implementation or publishing is authorized by this document.

## Purpose

Add concrete evidence of BytesFX's implementation work to the existing AI-Chatbot page. Help a business owner understand what has been built, inspect a relevant example, and return to the chatbot trial. Preserve the current dark palette, typography, trial funnel and product entitlements. This is a scoped addition to the existing site, not a redesign.

Owner clarification: Bytes-Web itself connects chat, captured leads and sales pipelines. Its integrated product workflow is the primary evidence for this offer. The local project knowledge base documents the chatbot dashboard, sales follow-up engine, reviewed proposals and Won/Lost outcomes. BytesCRM is a separate product with overlapping capabilities, not a capability missing from Bytes-Web.

## Project catalogue and readiness

| Project | Repositories | Public URL | Presentation |
|---|---|---|---|
| BytesFX / Bytes-Web | jared0565/Bytes-Web | https://web.bytesfx.com/ai-chatbot/ | Primary product evidence shown directly on the page: chat, captured lead, sales pipeline, proposal/follow-up and outcome. Do not present this owned product as an independent client project. |
| Pivot Parlor | fbmacagba/Pivot-Parlor | https://pivotparlor.com/ferdyms-barber-shop-014 | Featured demonstration. Branded services, team and booking walkthrough. Its sample assistant is explicitly scripted. |
| Active Paw with PawScout | jared0565/active-paw-theme and jared0565/pawscout-worker | https://activepaw.co.uk/ | Featured owned store and automation project. Treat the two repositories as one product. Do not imply that this proves chatbot performance. |
| BytesAI Learning | jared0565/bytesai-learning | https://learn.bytesai.uk/ | Featured external example for course discovery and recommendations; any assistant claim must match the live feature actually demonstrated. |
| BytesCRM | jared0565/nexusflow | https://bytescrm.app/ | Optional supporting product with overlapping chat-to-lead-to-pipeline capabilities. Hold publication until homepage claims are substantiated or corrected and a useful product preview is available. It does not replace BytesFX's own demonstration. |
| BytesFX Cafe & Bookings | jared0565/Oak-Hill | https://cafe.bytesfx.com/ | Supporting demonstration for hospitality, menu, calendar and party-booking UX. Use its current public name, not the repository name. |
| File Converter | jared0565/File-Converter | https://file-converter.bmorris0565.workers.dev/ | Supporting utility demonstrating browser-based processing and privacy. Keep it in broader work rather than the primary chatbot proof section. |

Homepage availability was checked for all six domains: HTTP 200. Availability does not establish that every feature works. The CRM and cafe public content were also inspected in an isolated browser. No sign-in, booking, enquiry, payment or chat was submitted. Analytics/submission requests were blocked; the CRM's empty-payload public launch-configuration read was permitted in a second check to avoid drawing conclusions from a missing configuration response.

The CRM remains marked Pre-Release and displays 2,400+ agencies, 180K+ contacts, $2.1B+ deals, a 4.9 rating and Verified customer testimonials. Their evidence is not available in this review. An owner question is pending; do not assume these statements are fabricated or verified. No public product-tour entry was found on the inspected landing page. Its domain should be labelled Visit product site, not Try live demo, until a demo route exists.

## Page sequence and layout

Lead the proof with BytesFX's own workflow: live chat, captured/verified lead, sales pipeline, reviewed proposal/follow-up and outcome. Show the actual product interface with clearly labelled sample data. Keep the existing chat as the conversation entry point and expose downstream screens through screenshots or an isolated read-only walkthrough. Use actual screen/stage names and plan boundaries; do not invent a pipeline or imply that all paid features are included on the Free plan. No real leads or outbound emails should be created just to demonstrate the flow.

Insert Explore what we've built after that product explanation and before installation steps/pricing. The visitor sees the offer, its own workflow, wider implementation evidence, setup and pricing in that order. Reveal BytesFX's dashboard/pipeline evidence directly instead of adding a circular project link back to the same chatbot page.

Show a maximum of three projects in this section. Give the strongest walkthrough one larger screenshot and description, followed by two concise previews. Use real screenshots as the visual focus. Preserve the site's existing tokens and give screenshots a consistent frame. Stack the examples on mobile; do not hide proof in a carousel.

Each example includes its public name, an accurate Owned product / Live store / Demonstration label, one short business problem, what was built, two or three demonstrable capabilities, and descriptive links. Use View project for the internal case study and Visit live store/site or Try demo according to the destination. GitHub is a secondary technical link. Follow the section with the existing trial action, keeping the chatbot signup the primary conversion.

Initial external-project order: Pivot Parlor, Active Paw, BytesAI Learning. Cafe and File Converter belong in a broader work index with individual case studies; do not expand the chatbot landing page into a repository directory. BytesFX's own integrated workflow remains the primary product proof. BytesCRM can join the broader portfolio once ready, but does not become a prerequisite or substitute for demonstrating the product sold on this page.

## Case studies

Each project gets a static page under /projects/<slug>/ containing: the problem, the implemented workflow, a small set of real screenshots, the capabilities a visitor can inspect, a correctly labelled external link, and a return to the chatbot trial. Explain relevance to the offer without implying that every project uses the BytesFX widget.

For authenticated products, use a short public walkthrough or a separate read-only sample-data environment. Never publish customer records or privileged credentials in previews. A product homepage or signup page is not an interactive demo. A CRM walkthrough should show a sample conversation, lead inbox, pipeline and follow-up, without sending email or affecting a real account.

Do not add revenue improvements, conversion percentages, client logos, customer counts, ratings or testimonials without evidence and permission to publish them. Owned projects and fictional demos are not client case studies. The CRM's current claims must not be copied into this showcase while unverified.

## Implementation boundaries

- Keep a shared, build-time project catalogue with stable slug, name, project kind, verified capability copy, repository links, live URL, image path/alt text, feature order and publication readiness. Pending projects are omitted from published output.
- Add a small build-time renderer alongside the existing content renderers. Extend the Vite HTML transform to insert the project section; render static case-study/index entries through the same build. Keep headings, descriptions and links available without browser JavaScript.
- Scope showcase styling to the chatbot page and project pages using existing design tokens. No new UI framework, dependencies, backend, database or API integration is needed.
- Host screenshots locally, give them dimensions and responsive sizes, and lazy-load images below the first screen. Do not embed external stores or applications in iframes or load their analytics on BytesFX pages.
- Use ordinary HTTPS links with meaningful accessible text. If an external destination opens a new tab, disclose that behavior and protect the opener. Escape all rendered strings and restrict catalogue URLs to approved protocols/domains.
- Availability is editorial metadata checked before release, not a runtime network probe. If a destination is known to be unavailable, update its copy and omit the demo action rather than sending visitors to a placeholder or login screen.

## Rollout and verification

1. Verify the exact BytesFX dashboard, sales pipeline and follow-up screens and their plan availability before writing walkthrough copy. Use an isolated sample-data view for the downstream stages. The separate CRM's readiness does not block this work.
2. Collect approved screenshots and final capability copy for BytesFX and the external examples. Capture public pages without creating real bookings, importing supplier products, sending chats, or exposing customer data.
3. Implement the catalogue, section and static project pages in an isolated branch. Check that the three featured examples each lead back to trial signup.
4. Run the existing site build and checks, plus focused validation of project URLs, published-project filtering, escaping and output links. No live application writes in tests.
5. Inspect desktop/mobile together, including 320px width, keyboard access, reduced motion and image loading. Fix findings in one batch and confirm once, following Impeccable's bounded verification workflow.
6. Review the completed change before publishing. Measure project engagement and subsequent trial starts only through an approved consent-aware measurement setup; do not promise conversion uplift before measurement.

## Open decisions

The owner has supplied both previously missing domains. No new custom domain is needed. The main showcase needs approved BytesFX sample-data screenshots and final capability copy. Evidence for the separate CRM's existing claims and an optional CRM walkthrough matter only if that supporting project is later published. Source projects are reviewed as portfolio evidence; this plan does not authorize editing their repositories.
