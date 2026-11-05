# Product capability evidence

Checked 5 November 2026 against application baseline 52ad87a. Implementation authorized by the owner with “yes” after the explicit implementation question. No release authorized.

| Display claim | Actual source / symbol | Plan boundary and prerequisites | Demonstration / verification |
|---|---|---|---|
| Chat answers and collects a contact | public/plans.json modes; src/chatbot-page.js initChatbot; chatbot-api/src/index.ts | AI during trial and paid plans; Free is Scripted. Shared conversation limits remain unchanged. | Actual landing-page chat; mocked response only. |
| Leads show email verification status | public/dashboard/main.js fetchLeads, openLeadDrawer; crm-api-worker/src/index.js /api/verify-email | All plans; Free 10 leads/day, 50 contacts. Confirmation delivery requires configured email sender. Opening the verification link alone does not confirm: POST does. | Actual dashboard with synthetic verified/unverified records; no email sent. |
| Track leads through a sales pipeline | public/dashboard/main.js LD_STAGE_NAMES, renderLeads, ldCol | Dashboard feature; not a separate CRM purchase. Columns: Inbox, Priority, Opportunity, Campaigns, Closed. | Actual board; synthetic records in each column. |
| Review a proposal before sending | public/dashboard/main.js ldProposalHtml, ldWireProposal; crm-api-worker/src/index.js draftProposal, POST /api/leads/:id/proposal | Draft/save/send are separate actions; bracketed blanks block sending. UI describes AI proposals with paid AI campaigns. Do not claim proposals auto-send or assert an entitlement gate absent from this endpoint. | Actual draft editor populated through mocked lead read; no draft/send endpoint invoked. |
| AI email follow-ups during trial and paid plans | public/plans.json aiFollowUps; crm-api-worker/src/index.js entitlements, campaign generation routes | Free after trial uses simple rule sequence; AI sequences up to five emails, rule sequence three. Requires sender setup; reply tracking needs routing setup. | Read source; no delivery claims from screenshots. |
| Record Won / Lost | public/dashboard/main.js LD_OUTCOME, ldOutcomeHtml; crm-api-worker/src/index.js POST /api/leads/:id/outcome | Dashboard outcome action; owner confirms outcome. A positive proposal reply is a flag, not automatic Won. | Actual Closed column with separate invented Won/Lost examples; no outcome writes. |

Paths above are relative to bytes-website unless stated otherwise. The trial retains Free website/contact/branding limits, per public/plans.json.

## Execution baseline

- Isolated native Codex worktree: C:/Users/fbmac/atlas/Codex/.codex_state/user_home/worktrees/626f/Bytes-Web
- Branch: ux/project-showcase; starts at planning checkpoint 702ebf32391e8f9b3a2fefce0d6a4e16ae138da1.
- npm --prefix bytes-website run build: exit 0; consent checks, six consent cases, five navigation tests, Vite build and existing chatbot output check passed.
- Existing repository dependencies reused by a local node_modules junction; no package installed.
- Shared Graphite graph checked fresh in original checkout. Dashboard/config context and Vite impact were advisory, so relevant source and explicit build entries were inspected directly.
- Source review only: no production chats, leads, email, booking, payments or settings writes.
