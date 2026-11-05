# Cafe & Bookings documentation audit

Pinned reference: fa70d4e3d126466c73640e259b6a39e6f974bea4. All 34 Markdown/text files retrieved without failures, including historical specs/plans and rebrand evidence. Documents were screened for scope and status; source/runtime not inspected.

README.md and PRODUCT.md establish the current fictional public demo and retained live workflow. docs/REBRAND-AUDIT.md section 1 explicitly records the completed booking system, owner console, CRM, newsletter sender and public availability calendar; it is evidence of delivered functionality, unlike initial architecture plans. The June15 admin-dashboard design's Background describes existing Availability, Reports, Bookings, Messages, Contacts, Tracking, Users and Activity modules and existing server permissions. Newsletter-send design describes owner-controlled compose/test/send and prerequisite sender setup; public demo suppresses outbound sending.

The operational system joins availability and closures, booking validation/slot handling, staff access and permissions, contact/enquiry records, reporting and opt-in newsletter management. No payment integration or autonomous marketing claim is established. The current published project is a fictional portfolio demonstration; menus/photos/prices are illustrative.

Resolve documentation conflicts: rebrand handover heading says not deployed, but section 9 records October22/28 deployments. README's all-synthetic calendar claim is narrowed by handover lines59 and595–600: admin-created slots can be public, and authenticated admin remains a real database writer. No blanket no-writes guarantee for admin. Public booking/enquiry/newsletter submissions are simulated/discarded, with no real reservation or email.

Safe brief: A hospitality website and booking-operations application connecting menus, soft play and party discovery with availability, booking handling and an authenticated staff workspace. The underlying system includes contacts, enquiries, reporting and newsletter controls. BytesFX's public version demonstrates those journeys with fictional content and simulated public submissions, without accepting real bookings or payments.

Sources: README.md; PRODUCT.md; docs/REBRAND-AUDIT.md sections1–4; docs/REBRAND-HANDOVER.md sections2,8,9; docs/superpowers/specs/2026-06-15-admin-dashboard-redesign-design.md Background; June14 architecture/availability/contacts/roles specs; June15 newsletter specs. Plans provide design detail, not stand-alone proof of completion.

## Documentation inventory

- `AGENTS.md` — retrieved and screened.
- `ARAMID.md` — retrieved and screened.
- `CLAUDE.md` — retrieved and screened.
- `GRAPHITE.md` — retrieved and screened.
- `PRODUCT.md` — retrieved and screened.
- `README.md` — retrieved and screened.
- `deliverables/SOCIAL_MEDIA_PITCH.md` — retrieved and screened.
- `docs/BRAND-ASSETS.md` — retrieved and screened.
- `docs/EXTERNAL-CHANGES.md` — retrieved and screened.
- `docs/REBRAND-AUDIT.md` — retrieved and screened.
- `docs/REBRAND-HANDOVER.md` — retrieved and screened.
- `docs/STAFF-PRIVACY-NOTE.md` — retrieved and screened.
- `docs/superpowers/plans/2026-06-14-a1-availability-management.md` — retrieved and screened.
- `docs/superpowers/plans/2026-06-14-a2-public-calendar.md` — retrieved and screened.
- `docs/superpowers/plans/2026-06-14-b-tracking-code-manager.md` — retrieved and screened.
- `docs/superpowers/plans/2026-06-14-c-analytics-reporting.md` — retrieved and screened.
- `docs/superpowers/plans/2026-06-14-d-crm.md` — retrieved and screened.
- `docs/superpowers/plans/2026-06-14-e-lead-capture.md` — retrieved and screened.
- `docs/superpowers/plans/2026-06-14-staff-roles-identity-core-plan.md` — retrieved and screened.
- `docs/superpowers/specs/2026-06-14-a1-availability-management-design.md` — retrieved and screened.
- `docs/superpowers/specs/2026-06-14-a2-public-calendar-design.md` — retrieved and screened.
- `docs/superpowers/specs/2026-06-14-b-tracking-code-manager-design.md` — retrieved and screened.
- `docs/superpowers/specs/2026-06-14-booking-platform-architecture.md` — retrieved and screened.
- `docs/superpowers/specs/2026-06-14-c-analytics-reporting-design.md` — retrieved and screened.
- `docs/superpowers/specs/2026-06-14-d-crm-design.md` — retrieved and screened.
- `docs/superpowers/specs/2026-06-14-e-lead-capture-design.md` — retrieved and screened.
- `docs/superpowers/specs/2026-06-14-staff-roles-identity-core-design.md` — retrieved and screened.
- `docs/superpowers/specs/2026-06-15-account-security-design.md` — retrieved and screened.
- `docs/superpowers/specs/2026-06-15-admin-dashboard-redesign-design.md` — retrieved and screened.
- `docs/superpowers/specs/2026-06-15-newsletter-send-design.md` — retrieved and screened.
- `docs/superpowers/specs/2026-06-15-newsletter-unsubscribe-design.md` — retrieved and screened.
- `public/assets/fonts/OFL.txt` — retrieved and screened.
- `public/robots.txt` — retrieved and screened.
- `tools/brand/REBRAND-BRIEF.md` — retrieved and screened.


## Historical deliverable follow-up

The three historical HTML proposals and their two PDF exports (10 and 2 pages) were retrieved and inspected, plus the current 7-page illustrative menu PDF. Proposals contain forecasts and old real-business hygiene/branding claims, not measured customer results; none is reused in the showcase. Their statement that the operational platform was developed supports scope, while October rebrand records control the current fictional-demo status. Raw copies are kept only in output/.
