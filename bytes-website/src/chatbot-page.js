// The AI chatbot page (/ai-chatbot/). Its content is plain HTML; this adds the behaviour it shares with the
// homepage, the chat built into the page, and the plan a visitor arrived for.
import './style.css';
import './home.css';
import './chatbot.css';
import PLAN_DATA from '../public/plans.json';
import { initChatbot } from './chat.js';
import { initReveal, initNavbarScroll, initMobileMenu, setFooterYear } from './ui.js';

initReveal();
initNavbarScroll();
initMobileMenu();
setFooterYear();

// The chat in the opening section: the Bytes bot, in a conversation of its own (a chat begun on the homepage
// doesn't carry on here). Its questions are about the chatbot, and each makes sense without the page around
// it, because the bot isn't told which page it is on. The last one goes straight to sign-up.
initChatbot({
  sessionKey: 'bytesfx_chat_chatbot_page',
  choices: [
    { label: 'How does the chatbot work on my website?' },
    { label: 'How much does the chatbot cost?' },
    { label: 'Is the chatbot trial really free?' },
    { label: 'Start my free trial', href: '/onboarding/' },
  ],
});

// "Try it on this page": to the chat. The text box is selected where that brings up no keyboard.
document.querySelectorAll('[data-open-chat]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const chat = document.getElementById('chatbot-window');
    chat?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
    if (!matchMedia('(pointer: coarse)').matches) document.getElementById('chatInput')?.focus({ preventScroll: true });
  });
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
