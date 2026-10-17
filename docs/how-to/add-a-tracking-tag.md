# Add a tracking tag

Use this when you want to add Google Analytics, Google Ads, a Meta pixel or any other third-party script. Today the site
sets no analytics or marketing cookies, and the banner stays closed on a first visit. A new tag changes that, so it needs
the owner's decision first.

Read the cookie section of the [knowledge base](../knowledge-base.md#7-features-by-area) before you start.

## Steps

1. **Get the owner's decision.** Say which tag, and what it sets, and wait for a yes.
2. **Turn the banner on.** In `bytes-website/public/consent.js`:
   - set `ASK = true`
   - increase `VERSION` by one, so everyone who answered before is asked again
3. **Allow the script in the Content Security Policy.** `bytes-website/public/_headers` allows `script-src 'self'`
   only. Add the tag's domain to `script-src` and to any `connect-src` or `img-src` it needs. Keep the rule that no
   inline scripts are used.
4. **Load the tag only after consent.** The tag must run only when `consent.js` reports the visitor said yes. Do not put
   the tag's `<script>` in a page's HTML directly.
5. **Update the three legal pages.** They currently say the site sets no analytics or marketing cookies and shows no
   banner. Change that wording in:
   - `bytes-website/public/cookie-policy.html` (list each cookie: name, provider, purpose and how long it lasts)
   - `bytes-website/public/privacy-policy.html`, section 8
   - `bytes-website/public/data-deletion.html`, if it describes what is removed
6. **Check the banner.** Clear the site's stored consent in the browser, load the homepage, and confirm the banner opens.
   Accept, and confirm the tag loads. Refuse, and confirm it does not load.
7. **Run the checks** in [Run the tests](run-the-tests.md), then ask the owner before merging.

## Why the order matters

If the tag loads before the banner, the site sets cookies before the visitor has agreed. That breaks the cookie policy
and the privacy policy, and is the failure this process exists to prevent.
