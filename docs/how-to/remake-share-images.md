# Remake the share images

The two link-preview images are `bytes-website/public/og-home.jpg` (homepage and legal pages) and
`bytes-website/public/og-trial.jpg` (onboarding). Each is 1200×630, a JPEG of about 80 KB. They are made from HTML cards
in `bytes-website/og-src/`, which is **not deployed**. Only the JPEGs are.

The exact regeneration steps are written at the top of `og-src/home.html`. Follow those. This guide covers what to watch for.

## Steps

1. Open `og-src/home.html` (or `trial.html`) in a browser at 1200×630, served from a local server, not from a
   `file://` address. Fonts must load first.
2. Wait for `document.fonts.ready`, then check that the fonts are `loaded`. Do not rely on `document.fonts.check`
   alone: it can return true before a font is actually in use.
3. Screenshot the card as a JPEG at quality 88. That keeps the file near 80 KB.
4. Save the new file under a **new filename**, for example `og-home-2.jpg`. Platforms cache previews by address, so an
   overwritten file can keep showing the old picture for days.
5. Point the `og:image`, `og:image:secure_url`, `twitter:image` and the image alt tags at the new file, on every page
   that uses it:
   - homepage: `index.html`
   - legal pages: `public/privacy-policy.html`, `cookie-policy.html`, `terms-of-service.html`, `data-deletion.html`
   - onboarding: `public/onboarding/index.html`
6. Leave `og-image.png` in place. Posts that already show it keep working.
7. Check the image at its real size, and read the text on it at phone width. X shows only the image, so the offer has to
   be readable inside it.

## After the deploy

Only the platforms' own tools show what they display. The owner can run Facebook's Sharing Debugger and LinkedIn's Post
Inspector on the live address. Those tools fetch the live site, so run them after the deploy, and ask the owner first.
