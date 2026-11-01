// The AI chatbot page (/ai-chatbot/). Its content is plain HTML; this adds the behaviour it shares with the
// homepage, the live chat, and the plan a visitor arrived for.
import './style.css';
import './home.css';
import './chatbot.css';
import PLAN_DATA from '../public/plans.json';
import { initChatbot } from './chat.js';
import { initReveal, initHeroConsole, initNavbarScroll, initMobileMenu, setFooterYear } from './ui.js';

initReveal();
initHeroConsole();
initNavbarScroll();
initMobileMenu();
setFooterYear();
initChatbot();

// "Try it on this page" opens the chat
document.querySelectorAll('[data-open-chat]').forEach((btn) => {
  btn.addEventListener('click', () => document.getElementById('btnOpenChat')?.click());
});

// Arriving from a "Powered by BytesFX" badge, the dashboard or onboarding (?upgrade=<plan>): show that plan.
// Badge clicks arrive as ?upgrade=free, so they land on the first paid plan. A client id from the dashboard
// travels on to the contact form, so the team knows whose plan to change.
const qs = new URLSearchParams(location.search);
const client = qs.get('client');
if (client && /^[\w-]{1,64}$/.test(client)) {
  document.querySelectorAll('a[href^="/?plan="]').forEach((a) => {
    a.href = a.getAttribute('href').replace('#contact', `&client=${encodeURIComponent(client)}#contact`);
  });
}
let want = String(qs.get('upgrade') || '').toLowerCase();
if (want && (want === 'free' || !PLAN_DATA.plans.some((p) => p.id === want))) want = 'starter';
if (want) {
  requestAnimationFrame(() => {
    const card = document.querySelector(`[data-plan="${want}"]`);
    card?.classList.add('is-target');
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}
