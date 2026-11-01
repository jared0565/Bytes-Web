// Fails the build when a third-party script is added while the cookie banner is off.
//
// The banner (public/consent.js) asks the visitor only when ASK is true. With it off, the site
// may load nothing that sets cookies: no analytics, no ads, no pixel. The Content-Security-
// Policy in public/_headers is what actually stops it, so that is what is checked here, and
// the pages are checked for a script tag the policy would have to allow.
//
// Run by "npm run build", and so by the deploy workflow. What to do when it fails: set
// "var ASK = true" in public/consent.js, bump VERSION so everyone is asked, and update the
// cookie policy, the privacy policy and the data-deletion page.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = join(dirname(fileURLToPath(import.meta.url)), '..');
const fail = (msg) => { console.error(`[consent] ${msg}`); process.exit(1); };

// 1. Is the banner asking?
const consent = readFileSync(join(site, 'public', 'consent.js'), 'utf8');
const ask = /var\s+ASK\s*=\s*(true|false)/.exec(consent);
if (!ask) fail('public/consent.js no longer says "var ASK = true" or "var ASK = false", so this check cannot tell whether the banner is on.');
if (ask[1] === 'true') {
    console.log('[consent] the banner asks on a first visit, so a third-party tag is allowed');
    process.exit(0);
}

// 2. The policy: a third-party origin in script-src would let a tag run
const headers = readFileSync(join(site, 'public', '_headers'), 'utf8');
const csp = /Content-Security-Policy:\s*(.+)/i.exec(headers);
if (!csp) fail('public/_headers has no Content-Security-Policy, so this check cannot tell what the browser will run.');
const scriptSrc = /script-src\s+([^;]+)/i.exec(csp[1]);
if (!scriptSrc) fail('the Content-Security-Policy has no script-src, so this check cannot tell what the browser will run.');
const thirdParty = scriptSrc[1].split(/\s+/).filter(d => /^https?:\/\//i.test(d));
if (thirdParty.length) fail(`the policy allows a third-party script (${thirdParty.join(', ')}) while the banner is off. Turn the banner on and bump VERSION.`);

// 3. The pages: a script tag the policy would have to allow
const pages = ['index.html', join('ai-chatbot', 'index.html'), ...readdirSync(join(site, 'public')).filter(f => f.endsWith('.html')).map(f => join('public', f))];
for (const p of pages) {
    const file = join(site, p);
    if (!existsSync(file)) continue;
    for (const m of readFileSync(file, 'utf8').matchAll(/<script[^>]+src\s*=\s*["']([^"']+)["']/gi)) {
        if (/^https?:\/\//i.test(m[1])) fail(`${p} loads a script from ${m[1]} while the banner is off. Turn the banner on and bump VERSION.`);
    }
}

console.log('[consent] the banner is off and nothing third-party can run: no cookie is set without asking');
