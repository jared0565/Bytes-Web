// Fails the build when the AI chatbot page could mislead a buyer or a search engine: a plan or price that
// differs from plans.json, a placeholder left unfilled, structured data that doesn't parse or doesn't match
// what the page shows, a missing title, description or canonical address, or a broken path to buying.
//
// Run by "npm run build" after vite build, so it reads the page exactly as it is deployed.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(site, 'dist');
const read = (p) => (existsSync(join(dist, p)) ? readFileSync(join(dist, p), 'utf8') : null);
const html = read('ai-chatbot/index.html');
if (!html) { console.error('[chatbot-page] dist/ai-chatbot/index.html was not built'); process.exit(1); }
const plans = JSON.parse(readFileSync(join(site, 'public', 'plans.json'), 'utf8'));

const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };
const text = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// The page as a search engine sees it
check(!html.includes('<!--@') && !/\{\{\w+\}\}/.test(html), 'a placeholder was left unfilled');
const title = html.match(/<title>([^<]*)<\/title>/)?.[1] || '';
check(title.length >= 20 && title.length <= 65, `the title is ${title.length} characters ("${title}"); keep it 20 to 65`);
const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] || '';
check(desc.length >= 70 && desc.length <= 160, `the description is ${desc.length} characters; keep it 70 to 160`);
check(html.includes('<link rel="canonical" href="https://web.bytesfx.com/ai-chatbot/">'), 'the canonical address is not https://web.bytesfx.com/ai-chatbot/');
check((html.match(/<h1[\s>]/g) || []).length === 1, 'the page needs exactly one h1');

// Every plan, with the name, price and tagline plans.json gives it
for (const p of plans.plans) {
    const card = html.match(new RegExp(`<article[^>]*data-plan="${p.id}"[\\s\\S]*?</article>`))?.[0];
    if (!card) { fails.push(`no card for the ${p.name} plan`); continue; }
    const t = text(card);
    check(t.includes(p.name), `the ${p.name} card does not name the plan`);
    check(t.includes(p.tagline), `the ${p.name} card does not show its tagline from plans.json`);
    if (p.price !== null) check(t.includes(`${plans.currency}${p.price}`), `the ${p.name} card does not show ${plans.currency}${p.price}`);
}

// Buying: Free starts the trial, paid plans reach the contact form with the plan named, Enterprise talks to us
check(/data-plan="free"[\s\S]*?href="\/onboarding\/"/.test(html), 'the Free card does not start the trial at /onboarding/');
for (const p of plans.plans.filter(p => p.price > 0)) check(html.includes(`href="/?plan=${p.id}#contact"`), `the ${p.name} button does not lead to the contact form with the plan`);
const ent = plans.plans.find(p => p.price === null);
if (ent) check(html.includes(`href="/?plan=${ent.id}#contact"`), `the ${ent.name} button does not lead to the contact form`);

// Structured data: it parses, and it says what the page says
const blocks = [];
for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { blocks.push(JSON.parse(m[1])); } catch { fails.push('a structured data block does not parse'); }
}
const nodes = blocks.flatMap(b => b['@graph'] || [b]);
const app = nodes.find(n => n['@type'] === 'SoftwareApplication');
check(app, 'no SoftwareApplication structured data');
const priced = plans.plans.filter(p => p.price !== null);
const offers = app?.offers || [];
check(offers.length === priced.length && priced.every(p => offers.some(o => o.name === p.name && Number(o.price) === p.price && o.priceCurrency === 'USD')),
    `the structured data's offers ${JSON.stringify(offers.map(o => [o.name, o.price]))} do not match plans.json`);
const faq = nodes.find(n => n['@type'] === 'FAQPage');
const shownQs = [...html.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)].map(m => text(m[1]));
const dataQs = (faq?.mainEntity || []).map(q => q.name);
check(shownQs.length >= 4 && JSON.stringify(shownQs) === JSON.stringify(dataQs), `the FAQ structured data ${JSON.stringify(dataQs)} does not match the questions shown ${JSON.stringify(shownQs)}`);
check(!JSON.stringify(nodes).includes('Rating'), 'ratings in the structured data: add them only once there are real reviews');

// Words a customer reads: no em dash
const copy = text(html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, ''));
check(!copy.includes('—'), 'an em dash in the page copy');

// Search basics
const sitemap = read('sitemap.xml') || '';
check(sitemap.includes('<loc>https://web.bytesfx.com/ai-chatbot/</loc>') && sitemap.includes('<loc>https://web.bytesfx.com/</loc>'), 'sitemap.xml does not list the homepage and the AI chatbot page');
const robots = read('robots.txt') || '';
check(/^Sitemap: https:\/\/web\.bytesfx\.com\/sitemap\.xml$/m.test(robots) && /^Disallow: \/dashboard\/$/m.test(robots), 'robots.txt does not name the sitemap and keep crawlers out of /dashboard/');

if (fails.length) {
    fails.forEach(f => console.error(`[chatbot-page] ${f}`));
    process.exit(1);
}
console.log(`[chatbot-page] ${plans.plans.length} plans, ${shownQs.length} questions and the structured data match plans.json; sitemap and robots in place`);
