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

// The page opens with the chatbot itself, built into the page: not the homepage's scripted console beside a
// floating chat, which made the two pages look alike
const hero = html.match(/<section id="home"[\s\S]*?<\/section>/)?.[0] || '';
check(hero.includes('id="chatbot-window"') && hero.includes('id="chatInput"'), 'the opening section does not hold the chat itself');
check(!html.includes('id="btnOpenChat"') && !html.includes('chatbot-launcher'), 'the page still has the floating chat button');
check(!hero.includes('hx-console') && !/>\s*Live\s*</i.test(hero), 'the opening section still has the scripted "Live" demo');
check(!html.includes('hx-kicker') && !html.includes('hx-eyebrow'), 'a small label above a heading: let the heading speak');
const minPaid = Math.min(...plans.plans.filter(p => p.price > 0).map(p => p.price));
const heroText = text(hero);
check(heroText.includes(`Plans from ${plans.currency}${minPaid} a month`) && heroText.includes(`${plans.trial.days}-day AI trial`),
    `the opening's facts do not say "Plans from ${plans.currency}${minPaid} a month" and "${plans.trial.days}-day AI trial" (plans.json)`);
// Its quick questions end in a way to sign up, and its conversation is its own (not the homepage chat's)
const pageJs = readFileSync(join(site, 'src', 'chatbot-page.js'), 'utf8');
check(/label: 'Start my free trial', href: '\/onboarding\/'/.test(pageJs), 'the chat on the page offers no "Start my free trial" choice to /onboarding/');
check(/sessionKey: '(?!bytesfx_chat_default')[\w-]+'/.test(pageJs), 'the chat on the page shares the homepage conversation');
// The questions go after the first message, and the way to sign up must not go with them: a link above the
// text box, hidden until src/chat.js shows it (#chatGo)
const chatTop = html.match(/<div id="chatbot-window"[\s\S]*?<form id="chatForm">/)?.[0] || '';
const stay = chatTop.match(/<div id="chatGo"([^>]*)>\s*<a ([^>]*)>([^<]*)<\/a>\s*<\/div>/);
check(stay && /\shidden(?=[\s>]|$)/.test(stay[1]) && /href="\/onboarding\/"/.test(stay[2]) && stay[3].trim() === 'Start my free trial',
    'the chat keeps no "Start my free trial" link to /onboarding/ above its text box (a hidden div#chatGo holding the link)');

// The Free card starts the free plan; the trial comes with it
const freeCard = html.match(/<article[^>]*data-plan="free"[\s\S]*?<\/article>/)?.[0] || '';
check(/>Start free</.test(freeCard) && text(freeCard).includes(`Includes a ${plans.trial.days}-day AI trial`), 'the Free card does not say "Start free" and the trial it includes');

// The install line shown is the one the dashboard gives a client, with a stand-in for the ID
const dashJs = readFileSync(join(site, 'public', 'dashboard', 'main.js'), 'utf8');
const embed = dashJs.match(/config-embed'\)\.textContent = safeId \? `([^`]*)` \+ 'script>'/)?.[1];
const shownCode = (html.match(/<code class="cb-install">([\s\S]*?)<\/code>/)?.[1] || '')
    .replace(/\r\n/g, '\n').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
check(embed && shownCode === `${embed.replace('${safeId}', 'your-client-id').replace(/\\n/g, '\n')}script>`,
    `the install line shown (${JSON.stringify(shownCode)}) is not the dashboard's (public/dashboard/main.js, config-embed)`);

// The homepage's chatbot section has its own heading, so the two pages don't share one
const homeJs = readFileSync(join(site, 'src', 'main.js'), 'utf8');
const norm = (s) => text(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const teaserH2 = norm(homeJs.match(/<section id="chatbot"[\s\S]*?<h2>([\s\S]*?)<\/h2>/)?.[1] || '');
const pageH1 = norm(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] || '');
check(teaserH2 && pageH1 && !teaserH2.includes(pageH1.split(' ').slice(0, 4).join(' ')), `the homepage's chatbot heading ("${teaserH2}") repeats this page's ("${pageH1}")`);

// Faint text stays readable (4.5:1) on every surface it sits on. The legal pages' stylesheet (public/site.css)
// carries its own copy of the colour, which must stay the same.
const homeCss = readFileSync(join(site, 'src', 'home.css'), 'utf8');
const token = (n) => homeCss.match(new RegExp(`--${n}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];
const legalFaint = readFileSync(join(site, 'public', 'site.css'), 'utf8').match(/--text-faint:\s*(#[0-9a-f]{6})/i)?.[1];
check(legalFaint && legalFaint.toLowerCase() === (token('text-faint') || '').toLowerCase(), `the legal pages' faint text (${legalFaint}, public/site.css) differs from the site's (${token('text-faint')}, src/home.css)`);
const lum = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const faint = token('text-faint');
// The four surfaces, and the Recommended plan card's amber tint over ink-2 (measured in the browser)
for (const [name, bg] of [['ink-0', token('ink-0')], ['ink-1', token('ink-1')], ['ink-2', token('ink-2')], ['ink-3', token('ink-3')], ['the Recommended card', '#24302b']]) {
    check(faint && bg && ratio(faint, bg) >= 4.5, `faint text ${faint} on ${name} (${bg}) is ${faint && bg ? ratio(faint, bg).toFixed(2) : '?'}:1; it needs 4.5:1`);
}

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
