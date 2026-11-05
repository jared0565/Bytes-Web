# Approved showcase screenshot manifest

Captured 5 November 2026 with isolated Edge via capture-showcase-assets.mjs. All nine images inspected. Dashboard data is invented, emails use example.com, and monetary values are examples, not results. Stable drawers recaptured with reduced motion; earlier transition captures were replaced.

| File (under public/projects) | Pixels | Bytes | Source / alt-text meaning |
|---|---|---|---|
| bytesfx-pipeline.png | 1440 × 1000 | 167186 | Actual dashboard board, Starter sample account, six invented contacts and sample budgets/outcomes. |
| bytesfx-lead.png | 460 × 1000 | 74802 | Actual lead drawer: unverified synthetic contact and available manual outcome controls. |
| bytesfx-proposal.png | 460 × 1000 | 85562 | Actual proposal editor: verified synthetic contact and draft requiring human review. |
| bytesfx-chat.png | 372 × 520 | 34324 | Actual BytesFX landing-page chat in its initial state; no conversation sent. |
| pivot-parlor.png | 1440 × 1000 | 221049 | Public fictional shop demo with scripted assistant; no booking performed. |
| active-paw.png | 1440 × 1000 | 1567988 | Public live store homepage; no cart, purchase, or supplier import performed. |
| bytesai-learning.png | 1440 × 1000 | 295928 | Public owned learning site; course discovery and quiz entry shown, no assistant tested. |
| cafe-bookings.png | 1440 × 1000 | 850917 | Public hospitality demonstration; no reservation submitted. |
| file-converter.png | 1440 × 1000 | 90612 | Public owned utility; no file uploaded or converted. |

All non-GET/HEAD browser requests were aborted before network access. 19 write attempts blocked (store/platform analytics, checkout bootstrap, challenge and cafe tracking); zero production writes forwarded. Local authenticated API reads were fulfilled with synthetic objects. The only unmapped dashboard/website read was the optional /api/public/site-socials (404). External store hydration/blocked-request errors occurred: 29 browser errors across public previews. These captures establish visible interfaces, not a full external application functional audit.

No email provider, live auth session, production token or customer record was used. No production auth bypass was shipped. Source origins are the catalogue liveUrl values; local BytesFX sources are /dashboard/ and /ai-chatbot/.
