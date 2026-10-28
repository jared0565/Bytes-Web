# BytesFX campaign review

Open http://127.0.0.1:8765/ while the local server is running.

To restart it, run from the repository root:

```powershell
python -B -m http.server 8765 --bind 127.0.0.1 --directory output/campaign-2026-10
```

- `index.html`: interactive local review, platform switching, image enlargement, caption/link copy and downloads.
- `assets/`: six final feed PNGs, the generated source artwork and existing website favicon.
- `campaign-plan.md`: strategy, audience, offers, supporting posts, calendar, measurement and publication checks.
- `captions.md` / `posts.json`: final captions, alt text, image dimensions and organic/paid tracked links.
- `campaign.js`: editable copy source. Run `node output/campaign-2026-10/export-copy.cjs` from the repo root to refresh the text exports.
- `artwork-prompt.txt`: exact prompt used with the built-in image generator.

To edit and re-export artwork, open `/?asset=li-01-website` (replace with the relevant post ID) and capture the `.creative` element at its native dimensions. Copy edits in `campaign.js` and layout edits in `index.html` require re-exporting the PNGs as well as regenerating captions.

The review page uses local assets and no tracking. Clicking an external destination opens the real website. No live contact form or signup was submitted during this work. Nothing was published and no advertising spend was authorised.

## In the repository

This pack is committed under `output/campaign-2026-10/`, and the review screenshots under `output/playwright/`. The
zip beside it (`output/BytesFX-campaign-review.zip`) holds the same files packed up, so it is not committed twice.
Rebuild it from this folder when it is needed. None of this is deployed: the website, the APIs and the publishing
accounts are untouched by it.
