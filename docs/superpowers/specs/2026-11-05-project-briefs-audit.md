# Project briefs: system-level review draft

Status: historical pre-audit draft, superseded by the completed source audits
in `docs/superpowers/evidence/project-showcase/*-doc-audit.md`, the implementation
plan `docs/superpowers/plans/2026-11-05-system-case-studies.md`, and the current
catalogue. The owner authorized documentation-only cross-repository reads on
5 November 2026. The provisional briefs and research gaps below record the
starting point; they are not the final public descriptions.

## Diagnosis

The original selection method started with public screenshots and described the
visible interface. That was adequate for preview captions, but insufficient for
project briefs. It concealed platform creation, operational tooling, integration
work and automation. A generated shop and an ecommerce storefront are outputs of
larger systems. Public pages must describe the whole delivered system and then
identify exactly which part a screenshot demonstrates.

All six published projects already have dedicated `/projects/<slug>/` pages.
Retain these URLs and expand the content. Do not create duplicate destinations.
BytesCRM remains outside publication pending the separate evidence decision.

## Recommended page structure

1. Project name, accurate project type and “Built by BytesFX”.
2. A short brief naming the complete system and the business need it supports.
3. The delivery scope: customer experience, operations interface, backend,
   integrations, automation and deployment, wherever documented.
4. A workflow diagram showing actors, systems, decisions and important handoffs.
5. A walkthrough of two or three concrete workflows, with matching screenshots.
6. Integration/platform attribution: explain custom work on Shopify or other
   services without implying BytesFX created those underlying platforms.
7. Product/demo links and a relevant project-enquiry or trial action.

Keep operational caveats in the relevant demo caption or feature explanation.
Do not replace a proper brief with paragraphs explaining what was not tested.
Do not publish client data, infrastructure identifiers, internal endpoints or
credentials in diagrams. Separate shipped features from plans and research notes.

## Initial replacement briefs and research gaps

### BytesFX Chat & Sales

**Draft brief:** BytesFX is a website-to-sales system that connects business-specific
chat, contact capture, a lead dashboard and email follow-up. Businesses can install
the widget on their own websites, manage enquiries through a sales pipeline and
turn lead replies into AI-assisted briefs and proposals. Human review controls
proposal sending, while campaign rules, reply tracking and Won/Lost records keep
the wider sales workflow connected.

**Delivery to explain:** public website; client signup and onboarding; embeddable
widget; dashboard and administration; chatbot and CRM APIs; lead and attachment
storage; model and email integrations; background tasks; analytics; deployment.

**Sources:** README.md; docs/knowledge-base.md sections 1, 3, 5–9;
docs/superpowers/evidence/project-showcase/capabilities.md. Some older reference
notes contain outdated gates; current plan-specific wording must remain grounded
in the checked capability evidence and plans.json.

**Workflow:** conversation/contact → saved lead → email confirmation → qualifying
questions/reply → AI-assisted brief/proposal → human review/send → follow-up and
reply handling → owner-recorded outcome. Sender setup and plan boundaries apply.

### Active Paw + PawScout

**Draft brief:** Active Paw combines a customized Shopify theme with PawScout
automation as one ecommerce system. The customer-facing store provides branded
product discovery and shopping, while PawScout supports the operational workflows
behind it. BytesFX delivered the storefront customization and automation
integration together, connecting the shopping experience with the wider store
operation.

**Known:** Shopify theme customization and PawScout automation are owner-confirmed.
The current catalogue identifies separate theme and worker repositories and treats
them as one project. The existing screenshot shows only the storefront.

**Must establish from source documentation:** PawScout's exact responsibilities;
upstream data sources; import, enrichment or publishing stages if implemented;
operator review; scheduled/event-driven work; data flow to Shopify; exception
handling; which capabilities are live versus planned. Do not assume inventory,
fulfilment, supplier crawling, AI enrichment or bidirectional synchronization from
the worker's name.

**Safe initial diagram:** PawScout automation → Shopify store ↔ customized Active
Paw theme ↔ shopper. This is a scope sketch, not a verified integration diagram;
specific automation inputs, directions and review stages await the docs audit.

### Pivot Parlor

**Draft brief:** Pivot Parlor is a shop-creation and booking platform for salons
and barbershops. It creates individual shops with distinct branded frontends,
connecting each shop's services, team and customer booking experience with the
wider platform. BytesFX delivered the platform and the shop experiences it
produces, spanning application design, frontend development, backend integration
and deployment.

**Known:** owner-confirmed unique shop generation; public homepage describes
onboarding, branded page generation, booking and staff scheduling. One generated
shop has a fictional booking walkthrough and scripted assistant.

**Must establish:** platform administration, shop-owner/staff tools, creation and
publishing lifecycle, additional application surfaces meant by “multi-platform”,
implemented reminders/payment flows and the boundaries of the public demo.

**Workflow:** shop setup → platform creates branded shop frontend → services/team
configuration → customer explores shop and booking → scheduling workflow.
Detailed admin and booking-state transitions require source documentation.

### BytesAI Learning

**Draft brief:** BytesAI Learning brings AI course discovery, providers and topic
navigation into a single learning product. It helps visitors explore available
courses and use a learning quiz as a starting point for choosing what to study.
BytesFX delivered the product interface, discovery workflows, integrations and
deployment.

**Known:** public course, provider and quiz entry interfaces. This is deliberately
provisional: the website preview alone does not establish the platform's full scope.

**Must establish:** catalogue ingestion and maintenance; quiz logic; personalized
recommendations if implemented; accounts, progress or learning tools; admin
workflows; AI use; backend jobs and integrations; hosted courses versus outbound
provider links. Do not imply it hosts courses or tracks learning outcomes without
documentation.

### BytesFX Cafe & Bookings

**Draft brief:** BytesFX Cafe & Bookings brings a family cafe's menu, soft-play
activities, party information and booking interface into one hospitality
experience. The application connects customer discovery with the information and
calendar needed to plan a visit or event. BytesFX delivered its design,
application development, booking integration and deployment.

**Known:** public demonstration of menu, soft play, parties and calendar. The
brief must expand if operational features are documented.

**Must establish:** availability/capacity handling; booking lifecycle; staff and
admin interfaces; confirmations, reminders and cancellations; payments; party
management; integrations; which operations are demo-only. Do not describe a
calendar screenshot as proof of an end-to-end reservations system.

### File Converter

**Draft brief:** File Converter is a browser-based utility that brings file
selection, output-format choices and a saved-file library into one application.
BytesFX delivered the interface and conversion workflows, the on-device library
and deployment, giving users a focused path from choosing a file to working with
its output.

**Known:** public interface and product descriptions of on-device processing.

**Must establish:** formats and actual engines; browser versus server execution
for each workflow; batch jobs; previews; output/download lifecycle; persistence;
size limits; fallback services and supported environments. No independent privacy
or security assurance is inferred from the marketing page.

## Diagram direction

Use one high-level, readable workflow per project, plus a second diagram only
where a distinct operational workflow needs it. Active Paw needs the storefront
and automation layers together; Pivot needs platform-to-multiple-shops branching.
BytesFX needs the human review decision visible. Do not force every system into a
linear three-step sequence.

Implement as accessible static HTML/SVG using the existing site tokens, with a
text equivalent and mobile stacking. Avoid a new diagram runtime dependency.
Draft diagrams in Markdown/Mermaid during research; publish only the flows that
the documentation supports.

## Next research checkpoint

Read all documentation files in each authorized project, including README,
architecture, product specifications, feature documentation, operational guides
and handover notes. Index the files read; distinguish implemented, planned and
deprecated functionality; attach a source to every major public claim. Then
replace the provisional briefs and diagrams with complete, evidence-backed
case-study content before revising the website.
