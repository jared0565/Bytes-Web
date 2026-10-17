# Remake the share images

The two link-preview images are `bytes-website/public/og-home.jpg` (homepage and legal pages) and
`bytes-website/public/og-trial.jpg` (onboarding). Each is 1200×630, a JPEG of about 80 KB. They are made from HTML cards
in `bytes-website/og-src/`, which is **not deployed**. Only the JPEGs are.

The same steps are written in a comment at the top of `og-src/home.html`; `trial.html` points to it. Change the words in
the card's HTML first. `trial.html` matches the onboarding page's heading, so keep the two in step.

## Steps

1. Serve the website folder with Vite, so the cards' fonts and `card.css` load (not from a `file://` address):
   ```
   cd bytes-website
   npx vite --port 4174
   ```
2. Open `http://localhost:4174/og-src/home.html` (or `/og-src/trial.html`) in a browser window of exactly 1200×630.
3. Wait for `document.fonts.ready`, then check that the fonts are `loaded`. Do not rely on `document.fonts.check`
   alone: it can return true before a font is actually in use.
4. Screenshot the card as a JPEG at quality 88. That keeps the file near 80 KB. As a PNG the grain makes it about
   680 KB, and WhatsApp is reported (not tested here) to drop previews over about 300 KB.
5. Save the new file in `bytes-website/public/` under a **new filename**, for example `og-home-2.jpg`. Platforms cache
   previews by address, so an overwritten file can keep showing the old picture for days.
6. Point the `og:image`, `og:image:secure_url`, `twitter:image` and the image alt tags at the new file, on every page
   that uses it:
   - homepage: `index.html`
   - legal pages: `public/privacy-policy.html`, `cookie-policy.html`, `terms-of-service.html`, `data-deletion.html`
   - onboarding: `public/onboarding/index.html`
7. Leave `og-image.png` and the previous JPEG in place. Posts that already show them keep working.
8. Check the image at its real size, and read the text on it at phone width. X shows only the image, so the offer has to
   be readable inside it.

## After the deploy

Only the platforms' own tools show what they display. The owner can run Facebook's Sharing Debugger and LinkedIn's Post
Inspector on the live address. Those tools fetch the live site, so run them after the deploy, and ask the owner first.
