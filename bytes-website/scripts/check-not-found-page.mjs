// Fails the build when the "page not found" page is missing or broken.
//
// web.bytesfx.com is a Cloudflare Pages project. Pages treats a site with no top-level 404.html as a
// single-page app and answers every unknown address with the home page and status 200, which search
// engines can index and which makes a mistyped link look healthy. With 404.html in the build, Pages
// serves it with status 404. The Worker copy of the site (wrangler.jsonc at the repository root) does
// the same only when its assets say not_found_handling "404-page".
//
// The page is served for any missing address at any depth, so every local link in it must start at
// the site root.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(site, 'dist');

export function auditNotFound({
  html = existsSync(join(dist, '404.html')) ? readFileSync(join(dist, '404.html'), 'utf8') : '',
  exists = (p) => existsSync(join(dist, p)),
  wrangler = readFileSync(join(site, '..', 'wrangler.jsonc'), 'utf8'),
} = {}) {
  const failures = [], check = (ok, m) => { if (!ok) failures.push(m); };
  check(!!html, '404.html is missing from the build');
  if (html) {
    check(/<meta name="robots" content="noindex[^"]*">/.test(html), '404.html must carry a noindex robots tag');
    check((html.match(/<h1[\s>]/g) || []).length === 1, '404.html needs exactly one h1');
    check(/<title>[^<]+<\/title>/.test(html), '404.html needs a title');
    check(!/rel="canonical"/.test(html), '404.html must not name a canonical address');
    // A visitor who followed a dead link is still a possible lead: the page must offer the contact form and the chatbot.
    check(/<main>[\s\S]*href="\/#contact"[\s\S]*<\/main>/.test(html), '404.html must offer the contact form');
    // data-cfasync="false" keeps Cloudflare's Rocket Loader from delaying the widget: delayed, it waits for a
    // DOMContentLoaded that has already passed and never starts.
    check(/<script data-cfasync="false" src="\/widget\.js" data-client-id="default"><\/script>/.test(html), '404.html must load the BytesFX chatbot, exempt from Rocket Loader');
    for (const m of html.matchAll(/(?:href|src)="([^"]*)"/g)) {
      const value = m[1];
      if (/^(?:https:\/\/|mailto:)/.test(value)) continue;
      check(value.startsWith('/'), '404.html has a link that does not start at the site root: ' + value);
      if (!value.startsWith('/')) continue;
      const pathname = decodeURIComponent(new URL(value, 'https://web.bytesfx.com').pathname);
      const local = pathname.endsWith('/') ? pathname.slice(1) + 'index.html' : pathname.slice(1);
      check(exists(local), '404.html links to a missing path: ' + pathname);
    }
    for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/g)) check(m[1].startsWith('/'), '404.html loads an outside script: ' + m[1]);
  }
  check(/"not_found_handling"\s*:\s*"404-page"/.test(wrangler), 'wrangler.jsonc must set assets.not_found_handling to "404-page"');
  return failures;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === join(process.argv[1])) {
  const failures = auditNotFound();
  let mutants = [];
  if (process.argv.includes('--self-test')) {
    const page = readFileSync(join(dist, '404.html'), 'utf8');
    mutants = [
      { html: '' },
      { html: page.replace(/<meta name="robots"[^>]*>/, '') },
      { html: page.replace('<h1', '<h1>Twice</h1><h1') },
      { html: page.replace('href="/site.css"', 'href="site.css"') },
      { html: page.replace('href="/projects/"', 'href="/no-such-page/"') },
      { html: page.replace(/<main>[\s\S]*<\/main>/, '<main><h1>Page not found</h1></main>') },
      { html: page.replace(/<script[^>]*src="\/widget\.js"[^>]*><\/script>/, '') },
      { html: page.replace(' data-cfasync="false"', '') },
      { wrangler: '{ "assets": { "directory": "bytes-website/dist" } }' },
    ];
    for (const options of mutants) if (!auditNotFound(options).length) failures.push('checker mutation escaped detection');
  }
  if (failures.length) { failures.forEach(f => console.error('[not-found] ' + f)); process.exitCode = 1; }
  else console.log('[not-found] 404.html is in the build, is not indexed and links only to pages that exist; the Worker serves it with status 404' + (mutants.length ? '; ' + mutants.length + ' negative mutations detected' : ''));
}
