# Pivot Parlor: public demo and showcase audit

Date: 6 November 2026. Scope: live public BytesFX case study, linked shop homepage and booking entry, compared with the documentation evidence already held in Bytes-Web. No external repository source, authenticated dashboard, generator run, reservation, payment or chat submission was inspected or changed.

## Verdict

The current shop is too thin to serve as the principal visual evidence of the platform's intended output. Its coherent dark/green styling and explicit demo boundary are useful, but its content presents a software walkthrough more than a convincing barber business. Expanding the project description has not resolved the quality gap in the example itself.

This is a finding about the public demonstration. It does not establish that the underlying generator cannot produce richer sites. The browser cannot distinguish incomplete seed content, demo-specific rendering, missing generated assets or a generation/publishing defect. Establish that cause in the owning project before selecting a fix.

## Evidence and priorities

| Priority | Observed evidence | Why it weakens the showcase | Recommended correction |
| --- | --- | --- | --- |
| P1 | Hero contains a large headline over a dark background, without visible shop or haircut photography. | The most prominent screen gives little evidence of generated imagery or a distinctive business identity. | Use a complete generated brand direction with high-quality, appropriately licensed or generated shop/service imagery and business-facing copy. |
| P1 | Exactly three services: Classic haircut, Clipper cut, Restyle & finish; All/Hair filters show little range. Descriptions explain that each service is illustrative. | The catalogue reads as a minimal fixture and the category control demonstrates little useful differentiation. | Seed a plausible, curated service menu across relevant categories, with durations, prices, useful descriptions and matching booking selections. More items alone will not create quality. |
| P1 | Alex Morgan and Jamie Lee have AM/JL avatars and the same placeholder biography. | Staff selection has no visual identity or meaningful reason to choose one person. | Give fictional staff distinct specialisms, concise biographies and representative portraits, clearly covered by the demo disclosure. |
| P1 | No gallery, opening hours, location/contact block or shop-specific story appears in the observed homepage content. | Visitors cannot experience the completeness expected of a local business website. | Include a fictional shop story, gallery, clearly marked sample location/hours and appropriate contact presentation. Do not route enquiries to unrelated real people or businesses. |
| P1 | Demonstration wording fills the notice, hero eyebrow/body, repeated adjacent strips, service descriptions, about section, staff biographies and booking explanation. | Repetition displaces the content that should demonstrate the finished customer experience. | Retain a clear persistent demo indicator and relevant booking/chat disclosures; write the shop content in the voice of the fictional business. Consolidate the duplicated strip. |
| P1 | Case study describes distinct shop designs and owner/staff/operator operations; its visuals show the platform marketing homepage and one shop. | Neither variation between outputs nor operational depth is demonstrated visually. A workflow diagram explains relationships but does not prove execution. | Add at least two actual platform-generated shops with visibly different brand directions and compositions, plus sanitised owner/staff views or a bounded walkthrough. Label unavailable surfaces honestly. |
| P2 | Case study names the shop Ferdy's; the live shop calls itself FerdyM's. | Minor naming drift makes the material feel less carefully curated. | Standardise the fictional shop name across captions, alt text and the actual site. |

Public references: [BytesFX case study](https://web.bytesfx.com/projects/pivot-parlor/), [shop homepage](https://pivotparlor.com/ferdyms-barber-shop-014), [booking entry](https://pivotparlor.com/ferdyms-barber-shop-014/book).

## Keep

- Clear fictional-data, scripted-assistant and no-real-booking/payment disclosures.
- Coherent typography, accent colour and navigation hierarchy.
- Visible service prices/durations and direct service/staff booking links.
- The wider platform description, delivery scope and three workflow lanes in the case study.

The booking entry visibly presents step 1 of 5 and the same three services. This audit did not exercise later steps or validate business operations. Previous build/route checks established delivery correctness within their scope; they were not acceptance of the demo's representativeness or design quality.

## Implementation sequence and acceptance criteria

1. **Owning Pivot Parlor project:** trace whether this demo uses the normal generation/rendering path, what content/assets reach it, and whether its published output matches the intended generation result. Do not assume a CSS fix is the root solution.
2. Produce a flagship fictional shop through the actual platform workflow. Include its complete brand, imagery, services, staff, gallery, story, hours and location information; preserve simulated transactions and labelled scripted chat.
3. Produce a contrasting second shop through that same workflow. Differences must include composition and content treatment, beyond colours and names. A separately hand-built marketing mockup would not validate platform output.
4. Demonstrate a connected customer-to-operations journey with synthetic records, using sanitised screenshots or an isolated demonstration workspace. Keep authenticated production workspaces private.
5. **Bytes-Web:** replace the current screenshots after output acceptance; show both shop designs and operational evidence in the dedicated case study, with accurate captions and accessible workflow diagrams.
6. Accept at desktop and phone widths: images load; no empty placeholder sections or clipping; sample business details are consistent; services/staff agree with booking; demo indicators remain clear; no real appointment, charge, email or operational mutation occurs.

No website code or deployment was changed by this audit. Recommendations concerning the external project require work in its owning repository. The channel-post MCP tool was unavailable in this session, so no cross-repository improvement report was sent.

Documentation baseline: [existing Pivot Parlor documentation audit](pivot-doc-audit.md), pinned to `9599fdb4a86b31b43f663fbb4477c51985113ca9`; this audit does not refresh that source-code or documentation baseline.
