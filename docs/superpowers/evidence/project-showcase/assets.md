# Approved showcase screenshot manifest

Captured 5 November 2026 with isolated Edge via capture-showcase-assets.mjs, and recaptured 6 November 2026 for the expansion with the same script. All images inspected by eye. Dashboard data is invented, emails use example.com, and monetary values are examples, not results. Stable drawers recaptured with reduced motion; earlier transition captures were replaced.

The four BytesFX workflow images are unchanged by the 6 November recapture. Six project images were recaptured together on 6 November, at 1440 × 1000, from the public live sites, so their framing and quality can be reviewed as one set. The Pivot Parlor images are PR #106's from 17 November: two captured by capture-pivot-shops.mjs, then cropped and re-encoded, and six supplied by Pivot Parlor's handoff. Byte sizes are the files as committed.
| File (under public/projects) | Pixels | Bytes | Source / alt-text meaning | Synthetic content |
|---|---|---|---|---|
| bytesfx-pipeline.png | 1440 × 1000 | 167186 | Actual dashboard board, Starter sample account, six invented contacts and sample budgets/outcomes. | Invented contacts and amounts |
| bytesfx-lead.png | 460 × 1000 | 74802 | Actual lead drawer: unverified synthetic contact and available manual outcome controls. | Invented contact |
| bytesfx-proposal.png | 460 × 1000 | 85562 | Actual proposal editor: verified synthetic contact and draft requiring human review. | Invented contact and scope |
| bytesfx-chat.png | 372 × 520 | 34324 | Actual BytesFX landing-page chat in its initial state; no conversation sent. | None |
| pivot-parlor.png | 1440 × 1000 | 557329 | Recaptured 17 Nov 2026 by capture-pivot-shops.mjs: public fictional FerdyM's Barber Shop demo, demo notice in shot; no booking performed. | Illustrative services, prices and team |
| pivot-linden-lark.png | 1440 × 1000 | 388388 | Captured 17 Nov 2026 by capture-pivot-shops.mjs: public fictional Linden & Lark Hair Studio demo; no booking performed. | Illustrative services, prices and team |
| pivot-bookings.png, pivot-walkin-queue.png, pivot-till.png, pivot-inventory.png, pivot-staff-today.png, pivot-operator-onboarding.png | 1440 × 1000 each | see 2026-11-17-pivot-handoff.md | Supplied by Pivot Parlor's 17 Nov 2026 handoff: local copy, synthetic data; SHA256 checked against the handoff. | Synthetic data |
| active-paw.png | 1440 × 1000 | 1555525 | Public live store homepage; no cart, purchase, or supplier import performed. | None |
| bytesai-learning.png | 1440 × 1000 | 299803 | Public owned learning site; curated free course catalogue, quiz entry and featured courses shown. | None |
| cafe-bookings.png | 1440 × 1000 | 828903 | Public hospitality demonstration with its own DEMO SITE badge; no reservation submitted. | None |
| file-converter.png | 1440 × 1000 | 90894 | Public owned utility; no file uploaded or converted. | None |
| medication-reminder.png | 1440 × 1000 | 222395 | Medication Reminder's schedules view showing three reminder times labelled Sample morning/midday/evening routine. | Synthetic sample schedule; no real medication record |
| shikaku.png | 1440 × 1000 | 356002 | Shikaku's guest puzzle board, Zen Garden level 1, opened as a guest. | None; no account, no matchmaking, no score submitted |

All non-GET/HEAD browser requests were aborted before network access. The 6 November recapture blocked 22 write attempts across six hosts (store and platform analytics, checkout bootstrap, challenge and cafe tracking); zero production writes were forwarded. Two browser errors were the aborted requests themselves. On 6 November the two Pivot images, since replaced by PR #106, were recaptured again later the same day because the first pass left the site's own cookie-consent banner across the bottom of the frame; the dismissal pattern was corrected and both frames were re-taken, with the banner gone. The Pivot platform homepage also logs React hydration errors of its own (numbers 418, 423 and 425) on load; they are that application's, not the capture's. The Medication Reminder capture seeds the browser's own local storage with a synthetic schedule and creates no account, no pairing and no sync. The Shikaku capture plays a level as a guest and submits no score. These captures establish visible interfaces, not a full external application functional audit.

No email provider, live auth session, production token or customer record was used. No production auth bypass was shipped. Source origins are the catalogue liveUrl values; local BytesFX sources are /dashboard/ and /ai-chatbot/.
