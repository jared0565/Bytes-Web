import './style.css';
import './home.css';
// The one plan list (also served as /plans.json to onboarding and the dashboard, and bundled into the API)
import PLAN_DATA from '../public/plans.json';

// Global state
let lastHash = '#home';
let chatHistory = [];

// ============================================================================
// ROUTING & NAVIGATION
// ============================================================================

function handleRouteChange() {
  const hash = window.location.hash || '#home';

  if (hash === lastHash && hash !== '#home') return;
  lastHash = hash;

  // Close mobile menu on navigation
  document.getElementById('navLinks')?.classList.remove('active');

  // Route to section on same page
  if (hash.startsWith('#')) {
    const section = document.getElementById(hash.substring(1));
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
  // Render page content first so the interactions below can find its elements
  initLeadCapture();

  // Set initial route
  handleRouteChange();

  // Listen for hash changes
  window.addEventListener('hashchange', handleRouteChange);

  // Initialize all interactions
  initInteractions();

  // Initialize chatbot
  initChatbot();


  // Initialize modal
  initModal();

  // Pricing: "Choose <plan>" fills in the contact form
  initPricing();

  // Check for upgrade params
  checkUpgradeParams();
}

// ============================================================================
// INTERACTIONS & ANIMATIONS
// ============================================================================

function initInteractions() {
  // 1. Intersection Observer for elements fading in as you scroll
  const revealElements = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  revealElements.forEach(el => observer.observe(el));

  // 2. Spotlight Hover Effects on Cards
  const cards = document.querySelectorAll('.bento-card, .service-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });

  // 3. Initialize Hero Background
  initHeroBackground();

  // 4. Navbar scroll effect
  initNavbarScroll();

  // 5. Smooth scroll for anchor links
  initSmoothScroll();

  // 6. Counter animations
  initCounters();

  // 7. Hero conversion console + process timeline
  initHeroConsole();
  initStepsLine();
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Plays the hero chat one step at a time, then lands the lead card; loops while on screen
function initHeroConsole() {
  const consoleEl = document.querySelector('.hx-console');
  if (!consoleEl) return;
  const steps = [...consoleEl.querySelectorAll('[data-step]')];
  const last = Math.max(...steps.map(el => +el.dataset.step));
  const show = (n) => steps.forEach(el => {
    const k = +el.dataset.step;
    // The typing dots only show while it is "their" step
    el.classList.toggle('is-on', el.classList.contains('hx-typing') ? k === n : k <= n);
  });

  if (prefersReducedMotion()) { show(last); return; }

  const delays = [700, 1300, 1100, 1300, 1100, 900, 4200]; // pause after each step
  let step = -1, timer = null, visible = false;
  const tick = () => {
    step = step >= last ? -1 : step + 1;
    show(step);
    timer = setTimeout(tick, step === -1 ? 600 : delays[step] ?? 1000);
  };
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !timer) tick();
    if (!visible && timer) { clearTimeout(timer); timer = null; }
  }, { threshold: 0.25 }).observe(consoleEl);
}

// Fills the line between the process steps as the section scrolls through the viewport
function initStepsLine() {
  const steps = document.getElementById('hxSteps');
  const fill = steps?.querySelector('.hx-steps-line span');
  if (!fill) return;
  if (prefersReducedMotion()) { fill.style.transform = 'scaleX(1)'; return; }
  let ticking = false;
  const update = () => {
    const r = steps.getBoundingClientRect();
    const vh = window.innerHeight;
    const progress = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
    fill.style.transform = `scaleX(${progress})`;
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

function initHeroBackground() {
  const heroBg = document.querySelector('.hero-bg');
  // Skip if the rendered markup already includes the orbs
  if (!heroBg || heroBg.querySelector('.hero-orb')) return;

  // Create animated gradient orbs
  for (let i = 0; i < 3; i++) {
    const orb = document.createElement('div');
    orb.className = `hero-orb orb-${i + 1}`;
    heroBg.appendChild(orb);
  }
}

function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function initCounters() {
  const counters = document.querySelectorAll('.counter-value');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const counter = entry.target;
        const target = parseInt(counter.dataset.target);
        const suffix = counter.dataset.suffix ?? '+';
        if (prefersReducedMotion()) { counter.textContent = target + suffix; observer.unobserve(counter); return; }
        const duration = 2000;
        const increment = target / (duration / 16);

        let current = 0;
        const updateCounter = () => {
          current += increment;
          if (current < target) {
            counter.textContent = Math.floor(current) + suffix;
            requestAnimationFrame(updateCounter);
          } else {
            counter.textContent = target + suffix;
          }
        };

        updateCounter();
        observer.unobserve(counter);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => observer.observe(counter));
}

// ?upgrade=<plan> (from the dashboard, onboarding and the chatbot badge) opens Pricing on that plan.
// Badge clicks arrive as ?upgrade=free, so they land on the first paid plan.
function checkUpgradeParams() {
  const qs = new URLSearchParams(window.location.search);
  let want = String(qs.get('upgrade') || '').toLowerCase();
  if (!want && window.location.hash !== '#pricing') return;
  if (want === 'free' || !PLAN_DATA.plans.some(p => p.id === want)) want = want ? 'starter' : '';
  requestAnimationFrame(() => {
    const card = want && document.querySelector(`[data-plan="${want}"]`);
    if (card) card.classList.add('is-target');
    (card || document.getElementById('pricing'))?.scrollIntoView({ behavior: 'smooth', block: card ? 'center' : 'start' });
  });
}

// ── Pricing: every number comes from plans.json ─────────────────────────────
const fmtNum = (n) => Number(n).toLocaleString('en-GB');
function planPrice(p) {
  if (p.price === null) return '<span class="hx-price-num">Custom</span>';
  return `<span class="hx-price-num">${PLAN_DATA.currency}${p.price}</span><span class="hx-price-per">${p.price === 0 ? 'forever' : '/ month'}</span>`;
}
function planFeatures(p) {
  const mode = PLAN_DATA.modes[p.mode];
  const yes = (t) => `<li>${t}</li>`;
  const no = (t) => `<li class="is-off"><span class="sr-only">Not included: </span>${t}</li>`;
  return [
    yes(`<strong>${mode.name} chatbot</strong>: ${mode.summary}`),
    yes(`${fmtNum(mode.dailyMessages)} chatbot messages a day`),
    yes(p.domains === -1 ? 'Unlimited websites' : `${p.domains} website${p.domains === 1 ? '' : 's'}`),
    yes(p.leadsPerDay == null ? 'Unlimited leads in your dashboard' : `${p.leadsPerDay} leads a day, ${p.contacts} contacts`),
    p.aiFollowUps ? yes('AI email follow-ups, proposals and campaigns') : no('AI email campaigns'),
    p.removeBadge ? yes('Remove the “Powered by BytesFX” badge') : no('Remove the “Powered by BytesFX” badge'),
    p.whiteLabel ? yes('Custom bot name, colour and avatar') : no('Custom bot name, colour and avatar'),
    ...(p.mode === 'ai_plus' ? [yes('Premium AI models')] : []),
  ].join('');
}
function renderPricing() {
  const cards = PLAN_DATA.plans.filter(p => p.price !== null);
  const ent = PLAN_DATA.plans.find(p => p.price === null);
  const cta = (p) => p.price === 0
    ? `<a href="/onboarding/" class="hx-btn hx-btn-ghost hx-btn-full">Start free trial</a>`
    : `<button type="button" class="hx-btn ${p.featured ? 'hx-btn-primary' : 'hx-btn-ghost'} hx-btn-full" data-request-plan="${p.id}">Choose ${p.name}</button>`;
  return `
    <section id="pricing" class="hx-section hx-pricing" aria-labelledby="pricingTitle">
      <div class="hx-container">
        <header class="hx-head reveal">
          <p class="hx-kicker">Chatbot plans</p>
          <h2 id="pricingTitle">Pick a plan. <em>Upgrade anytime.</em></h2>
          <p>${PLAN_DATA.trial.summary}</p>
        </header>
        <div class="hx-plans">
          ${cards.map((p, i) => `
          <article class="hx-plan reveal${p.featured ? ' is-featured' : ''}" data-plan="${p.id}" style="--d:${i}">
            ${p.featured ? '<p class="hx-plan-badge">Most popular</p>' : ''}
            <h3>${p.name}</h3>
            <p class="hx-price">${planPrice(p)}</p>
            <p class="hx-plan-tag">${p.tagline}</p>
            ${cta(p)}
            <ul class="hx-plan-list">${planFeatures(p)}</ul>
          </article>`).join('')}
        </div>
        ${ent ? `
        <article class="hx-plan hx-plan-wide reveal" data-plan="${ent.id}">
          <div>
            <h3>${ent.name}</h3>
            <p class="hx-plan-tag">${ent.tagline}</p>
          </div>
          <ul class="hx-plan-list hx-plan-list-inline">${planFeatures(ent)}</ul>
          <button type="button" class="hx-btn hx-btn-ghost" data-request-plan="${ent.id}">Talk to us</button>
        </article>` : ''}
        <p class="hx-plan-note">Prices in US dollars. Plans are set up by our team: choose one and we'll reply within 24 hours to get you started.</p>
      </div>
    </section>`;
}
// "Choose <plan>": fill in the contact form, so the request reaches us as an enquiry
function initPricing() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-request-plan]');
    if (!btn) return;
    const plan = PLAN_DATA.plans.find(p => p.id === btn.dataset.requestPlan);
    const client = new URLSearchParams(location.search).get('client');
    const service = document.getElementById('leadService');
    const msg = document.getElementById('leadMessage');
    if (service) service.value = 'chatbot';
    if (msg) msg.value = `I'd like the ${plan.name} plan${plan.price ? ` (${PLAN_DATA.currency}${plan.price}/month)` : ''}.${client && /^[\w-]{1,64}$/.test(client) ? ` My client ID is ${client}.` : ''}`;
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => document.getElementById('leadName')?.focus({ preventScroll: true }), 600);
  });
}

// ============================================================================
// MOBILE MENU
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.getElementById('navLinks');

  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
    // A tap on a link scrolls the page without changing the address (initSmoothScroll), so no
    // route change arrives to close the menu. Close it here, or it stays over the page.
    navLinks.addEventListener('click', (e) => {
      if (e.target.closest('a')) navLinks.classList.remove('active');
    });
  }

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!mobileMenuBtn?.contains(e.target) && !navLinks?.contains(e.target)) {
      navLinks?.classList.remove('active');
    }
  });
});

// ============================================================================
// CHATBOT FUNCTIONALITY
// ============================================================================

function initChatbot() {
  const btnOpen = document.getElementById('btnOpenChat');
  const btnClose = document.getElementById('btnCloseChat');
  const chatWindow = document.getElementById('chatbot-window');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');

  if (!btnOpen || !chatWindow) return;

  // Open chatbot
  btnOpen.addEventListener('click', () => {
    chatWindow.classList.remove('hidden');
    btnOpen.classList.add('hidden');
    chatInput?.focus();
  });

  // Close chatbot
  btnClose?.addEventListener('click', () => {
    chatWindow.classList.add('hidden');
    btnOpen.classList.remove('hidden');
  });

  // One message has a character limit (plans.json "chat"; the server enforces it too).
  // The count appears for the last fifth, so a pasted text that was cut short is not a surprise.
  const chatCount = document.getElementById('chatCount');
  const maxChars = PLAN_DATA.chat.messageChars;
  const showCount = () => {
    if (!chatInput || !chatCount) return;
    const left = maxChars - chatInput.value.length;
    chatCount.hidden = left > maxChars / 5;
    chatCount.classList.toggle('at-limit', left <= 0);
    chatCount.textContent = left > 0 ? `${left} character${left === 1 ? '' : 's'} left` : `Limit reached: ${maxChars} characters`;
  };
  if (chatInput) {
    chatInput.maxLength = maxChars;
    chatInput.addEventListener('input', showCount);
  }

  // The services, offered as buttons under the greeting when a chat opens. Only for a new chat: a tap sent in
  // the middle of an earlier conversation would be read as the answer to a later question (a name, a timeline).
  const chatMessages = document.getElementById('chat-messages');
  let choices = null;
  let started = false;
  const hideChoices = () => { choices?.remove(); choices = null; };
  const showChoices = (services) => {
    if (started || chatSessionId || !chatMessages || !chatInput || !services.length) return;
    const greeting = chatMessages.querySelector('.bot-message p');
    // One line, so the question and the three default services fit the window without scrolling
    if (greeting) greeting.textContent = 'Hi! How can we help?';
    choices = document.createElement('div');
    choices.className = 'chat-choices';
    choices.setAttribute('role', 'group');
    choices.setAttribute('aria-label', 'What you need');
    const addChoice = (label, onTap, extra) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = extra ? `chat-choice ${extra}` : 'chat-choice';
      btn.textContent = label; // text only: a service name can never become HTML
      btn.addEventListener('click', onTap);
      choices.appendChild(btn);
    };
    services.forEach((service) => addChoice(service, () => send(service)));
    addChoice('Something else', () => chatInput.focus(), 'chat-choice-other');
    chatMessages.appendChild(choices);
  };
  // The list comes from the bot's settings. If it can't be read, the chat opens as before, with no buttons.
  if (!chatSessionId) {
    fetch(`${CHAT_API_URL}/public/config?clientId=default`)
      .then((res) => (res.ok ? res.json() : null))
      .then((cfg) => showChoices((Array.isArray(cfg?.services) ? cfg.services : []).filter((s) => typeof s === 'string' && s.trim()).slice(0, 8)))
      .catch(() => { /* no buttons */ });
  }

  // One visitor message, typed or tapped. The choices go at once, so a second tap can't send again.
  const send = async (message) => {
    if (!chatInput || chatInput.disabled) return;
    started = true;
    hideChoices();

    // Add user message
    addChatMessage(message, 'user');
    chatInput.value = '';
    showCount();

    // Block new messages until this reply lands so history stays in order
    chatInput.disabled = true;

    // Show typing indicator
    showTypingIndicator();

    // Generate response
    const response = await generateChatResponse(message);
    removeTypingIndicator();
    addChatMessage(response, 'bot');

    chatInput.disabled = false;
    chatInput.focus();
  };

  // Handle form submission
  chatForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = chatInput?.value?.trim();
    if (message) send(message);
  });
}

function addChatMessage(text, sender) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${sender === 'user' ? 'user-message' : 'bot-message'}`;

  const p = document.createElement('p');
  // Show the link, but keep the raw [LINKEDIN_BUTTON] token in history for the API.
  // Built from text nodes and https links only, so a reply can never become HTML.
  text.replace('[LINKEDIN_BUTTON]', LINKEDIN_URL).split(/(https:\/\/[^\s<>"']+[^\s<>"'.,;:!?)])/).forEach((part) => {
    if (sender !== 'bot' || !/^https:\/\//.test(part)) { p.appendChild(document.createTextNode(part)); return; }
    const a = document.createElement('a');
    a.href = part;
    a.className = 'chat-link';
    a.textContent = part.replace(/^https:\/\//, '');
    if (a.origin === location.origin && a.pathname === location.pathname && a.hash) {
      // A place on this page (the contact form): close the chat and go there
      a.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('btnCloseChat')?.click();
        document.getElementById(a.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
      });
    } else {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    p.appendChild(a);
  });
  messageDiv.appendChild(p);

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Store in history
  chatHistory.push({ sender, text, timestamp: Date.now() });
}

function showTypingIndicator() {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-message bot-message typing-indicator';
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = '<span></span><span></span><span></span>';

  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  document.getElementById('typingIndicator')?.remove();
}

const CHAT_API_URL = 'https://ai.bytesfx.com';
const LINKEDIN_URL = 'https://www.linkedin.com/in/fbmacagba/';

// The conversation is kept on the server; this tab only holds its opaque id
let chatSessionId = null;
try { chatSessionId = sessionStorage.getItem('bytesfx_chat_default'); } catch (_) { /* storage blocked */ }

// Ask the AI backend, falling back to canned replies if it's unreachable
async function generateChatResponse(userMessage) {
  try {
    const res = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage, clientId: 'default', sessionId: chatSessionId })
    });
    const data = await res.json();
    if (data.sessionId && data.sessionId !== chatSessionId) {
      chatSessionId = data.sessionId;
      try { sessionStorage.setItem('bytesfx_chat_default', chatSessionId); } catch (_) { /* storage blocked */ }
    }
    if (res.ok && data.response) {
      return data.response;
    }
  } catch (err) {
    console.error('Chat API error:', err);
  }

  return getFallbackResponse(userMessage);
}

// Sales-optimized chatbot responses
function getFallbackResponse(userMessage) {
  const message = userMessage.toLowerCase();

  // Check for lead capture keywords
  if (message.includes('contact') || message.includes('get started') || message.includes('hire') || message.includes('quote') || message.includes('price') || message.includes('cost')) {
    return "I'd love to help you get started! Could you share your name and email so one of our specialists can reach out with a personalized quote?";
  }

  // Website development
  if (message.includes('website') || message.includes('web design') || message.includes('web development')) {
    return "We specialize in high-performance websites designed for maximum ROI. Our sites are optimized for conversions, fast-loading, and built to scale your business. Would you like to schedule a free consultation?";
  }

  // Application development
  if (message.includes('app') || message.includes('application') || message.includes('software')) {
    return "Our custom application development service delivers tailored solutions to streamline your business operations. From internal tools to customer-facing apps, we've got you covered. What's your specific use case?";
  }

  // Chatbot / AI
  if (message.includes('chatbot') || message.includes('ai') || message.includes('automation')) {
    return "We design and implement intelligent consultant chatbots that qualify leads, answer questions, and drive sales 24/7. Our AI solutions are built to maximize your conversion rates. Interested in seeing a demo?";
  }

  // Pricing
  if (message.includes('price') || message.includes('pricing') || message.includes('cost') || message.includes('expensive')) {
    return "Every project is unique, and we tailor our solutions to your specific needs and budget. Our packages start at competitive rates with ROI-focused delivery. Shall I connect you with a specialist for a custom quote?";
  }

  // Process / timeline
  if (message.includes('time') || message.includes('how long') || message.includes('process') || message.includes('timeline')) {
    return "Our streamlined process typically delivers websites in 2-4 weeks and applications in 4-8 weeks. We prioritize fast delivery without compromising quality. Would you like to learn more about our process?";
  }

  // Portfolio / work
  if (message.includes('portfolio') || message.includes('work') || message.includes('projects') || message.includes('example')) {
    return "We'd be happy to share our portfolio! Our work spans e-commerce, SaaS applications, and custom web solutions. Each project is designed with ROI and conversions in mind. Can I get your email to send you some relevant case studies?";
  }

  // Contact request
  if (message.includes('yes') || message.includes('sure') || message.includes('okay') || message.includes('definitely')) {
    return "Great! Please share your name and email, and our team will be in touch within 24 hours with a personalized proposal for your project.";
  }

  // Default responses - keep the conversation going
  const defaultResponses = [
    "That's a great question! To help you better, could you tell me more about your project or business goals?",
    "I'd love to learn more about your specific needs. What problem are you trying to solve?",
    "Absolutely! Let's find the perfect solution for you. What's your timeline and budget range?",
    "Sounds interesting! Could you share a bit more about what you're looking to achieve?",
    "We're here to help! What specific service interests you the most - website development, applications, or chatbots?"
  ];

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// ============================================================================
// LEAD CAPTURE FUNCTIONALITY
// ============================================================================

function initLeadCapture() {
  // Add lead capture forms to the page
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  // Inject the main content sections
  appContainer.innerHTML = renderHomePage();
}

function renderHomePage() {
  return `
    <!-- Hero -->
    <section id="home" class="hx-hero">
      <div class="hx-hero-bg" aria-hidden="true">
        <div class="hx-glow hx-glow-a"></div>
        <div class="hx-glow hx-glow-b"></div>
        <div class="hx-grid"></div>
        <div class="hx-grain"></div>
      </div>

      <div class="hx-container hx-hero-inner">
        <div class="hx-hero-copy">
          <p class="hx-eyebrow reveal" style="--d:0">
            <span class="hx-pulse" aria-hidden="true"></span>
            London studio · Websites, apps &amp; AI chatbots
          </p>
          <h1 class="hx-title reveal" style="--d:1">
            Websites that turn <em>visitors</em> into <span class="hx-underline">customers</span>.
          </h1>
          <p class="hx-lede reveal" style="--d:2">
            We design and build conversion-optimized websites, custom applications and AI chatbots
            that qualify leads around the clock, so every visit has a path to revenue.
          </p>
          <div class="hx-cta-row reveal" style="--d:3">
            <a href="#contact" class="hx-btn hx-btn-primary">
              Get a free consultation
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-4-4 4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>
            <a href="#services" class="hx-btn hx-btn-ghost">See what we build</a>
          </div>
          <dl class="hx-stats reveal" style="--d:4">
            <div><dt>Projects delivered</dt><dd><span class="counter-value" data-target="150" data-suffix="+">0</span></dd></div>
            <div><dt>Client satisfaction</dt><dd><span class="counter-value" data-target="98" data-suffix="%">0</span></dd></div>
            <div><dt>Average ROI increase</dt><dd><span class="counter-value" data-target="50" data-suffix="%">0</span></dd></div>
          </dl>
        </div>

        <!-- Live conversion console: the chatbot qualifying a visitor, then the lead landing -->
        <div class="hx-console reveal" style="--d:2" aria-label="Example: the BytesFX chatbot qualifying a website visitor">
          <div class="hx-console-bar">
            <span class="hx-dots" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="hx-console-title">yourbrand.com · Assistant</span>
            <span class="hx-live"><span class="hx-pulse" aria-hidden="true"></span>Live</span>
          </div>
          <ol class="hx-chat" id="hxChat">
            <li class="hx-msg hx-user" data-step="0">Hi, do you build booking websites for clinics?</li>
            <li class="hx-msg hx-bot" data-step="1">We do. Online booking, reminders and payments built in. What's your name?</li>
            <li class="hx-msg hx-user" data-step="2">Priya, from Northside Physio.</li>
            <li class="hx-msg hx-bot" data-step="3">Thanks Priya. What monthly budget did you have in mind?</li>
            <li class="hx-msg hx-user" data-step="4">Around £2,000.</li>
            <li class="hx-typing" data-step="5" aria-hidden="true"><i></i><i></i><i></i></li>
          </ol>
          <div class="hx-lead" data-step="6">
            <div class="hx-lead-head">
              <span class="hx-lead-tag">New qualified lead</span>
              <span class="hx-lead-time">just now</span>
            </div>
            <div class="hx-lead-name">Priya · Northside Physio</div>
            <div class="hx-lead-meta">
              <span>Booking website</span><span>£2,000 / mo</span>
            </div>
            <div class="hx-score" aria-hidden="true"><span class="hx-score-fill"></span></div>
            <div class="hx-lead-foot"><span>Lead score</span><strong>92</strong></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Capability ticker -->
    <div class="hx-ticker" aria-hidden="true">
      <div class="hx-ticker-track">
        ${['Conversion-first design','AI lead qualification','Online booking','Custom web apps','API integrations','SEO foundations','Sub-second load times','Email follow-up sequences','CRM pipelines','24/7 chat assistants']
          .concat(['Conversion-first design','AI lead qualification','Online booking','Custom web apps','API integrations','SEO foundations','Sub-second load times','Email follow-up sequences','CRM pipelines','24/7 chat assistants'])
          .map(t => `<span>${t}</span>`).join('<b>✦</b>')}
      </div>
    </div>

    <!-- Services -->
    <section id="services" class="hx-section">
      <div class="hx-container">
        <header class="hx-head reveal">
          <p class="hx-kicker">What we build</p>
          <h2>Three ways we grow <em>your revenue</em></h2>
          <p>We don't just build websites. We build the systems that turn attention into enquiries and enquiries into sales.</p>
        </header>

        <div class="hx-bento">
          <article class="hx-card hx-card-chat bento-card reveal" style="--d:0">
            <div class="hx-card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-12.2 7.5L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z"/></svg>
            </div>
            <h3>AI chatbots that qualify leads</h3>
            <p>An assistant trained on your business that answers questions, captures name, email and budget, and hands you sales-ready leads while you sleep.</p>
            <ul class="hx-tags"><li>Lead qualification</li><li>Sales automation</li><li>24/7 availability</li><li>Custom training</li></ul>
            <div class="hx-mini-chat" aria-hidden="true">
              <span class="hx-bubble">Can you add online booking?</span>
              <span class="hx-bubble hx-bubble-bot">Yes, with reminders and payments. Want a quick estimate?</span>
            </div>
            <a href="#contact" class="hx-link">Build your chatbot <span aria-hidden="true">→</span></a>
          </article>

          <article class="hx-card bento-card reveal" style="--d:1">
            <div class="hx-card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
            </div>
            <h3>Websites built to convert</h3>
            <p>Fast, mobile-first sites where every section earns its place and every page leads somewhere.</p>
            <ul class="hx-tags"><li>Conversion-first design</li><li>Mobile responsive</li><li>SEO optimized</li><li>Fast loading</li></ul>
            <div class="hx-gauge" aria-hidden="true">
              <svg viewBox="0 0 120 64"><path class="hx-gauge-track" d="M10 60a50 50 0 0 1 100 0"/><path class="hx-gauge-fill" d="M10 60a50 50 0 0 1 100 0"/></svg>
              <span>Speed target <strong>95+</strong></span>
            </div>
            <a href="#contact" class="hx-link">Start your project <span aria-hidden="true">→</span></a>
          </article>

          <article class="hx-card bento-card reveal" style="--d:2">
            <div class="hx-card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            </div>
            <h3>Custom applications</h3>
            <p>Internal tools, client portals and integrations that remove busywork and scale with you.</p>
            <ul class="hx-tags"><li>Web applications</li><li>Internal tools</li><li>API integrations</li><li>Scalable architecture</li></ul>
            <div class="hx-nodes" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
            <a href="#contact" class="hx-link">Discuss your needs <span aria-hidden="true">→</span></a>
          </article>
        </div>
      </div>
    </section>

    <!-- Why BytesFX -->
    <section class="hx-section hx-why">
      <div class="hx-container hx-why-inner">
        <header class="hx-head hx-head-left reveal">
          <p class="hx-kicker">Why BytesFX</p>
          <h2>We don't just build. <em>We convert.</em></h2>
          <p>Every project is measured by business outcomes, not just how it looks.</p>
        </header>
        <div class="hx-benefits">
          <div class="hx-benefit reveal" style="--d:0">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>
            <h3>ROI-focused development</h3>
            <p>Built around your business goals. Every feature is there to drive conversions and revenue.</p>
          </div>
          <div class="hx-benefit reveal" style="--d:1">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>
            <h3>Performance first</h3>
            <p>Fast load times and smooth interactions that keep visitors engaged and cut bounce rates.</p>
          </div>
          <div class="hx-benefit reveal" style="--d:2">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>
            <h3>Conversion optimized</h3>
            <p>Strategic calls to action, persuasive copy and data-driven design that turn visitors into customers.</p>
          </div>
          <div class="hx-benefit reveal" style="--d:3">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/></svg>
            <h3>End-to-end support</h3>
            <p>From strategy to launch and beyond. A partner in your growth, not just a vendor.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Process -->
    <section id="process" class="hx-section">
      <div class="hx-container">
        <header class="hx-head reveal">
          <p class="hx-kicker">How it works</p>
          <h2>From first call to <em>first customer</em></h2>
          <p>A proven four-step process to transform your digital presence.</p>
        </header>
        <ol class="hx-steps" id="hxSteps">
          <span class="hx-steps-line" aria-hidden="true"><span></span></span>
          <li class="reveal" style="--d:0"><span class="hx-step-n">01</span><h3>Discovery &amp; strategy</h3><p>We learn your goals, audience and competition, then plan what will win.</p></li>
          <li class="reveal" style="--d:1"><span class="hx-step-n">02</span><h3>Design &amp; development</h3><p>We build for conversion using modern technology and proven patterns.</p></li>
          <li class="reveal" style="--d:2"><span class="hx-step-n">03</span><h3>Testing &amp; optimization</h3><p>We test everything and tune for speed, accessibility and conversions.</p></li>
          <li class="reveal" style="--d:3"><span class="hx-step-n">04</span><h3>Launch &amp; growth</h3><p>We launch with confidence and keep improving with ongoing support.</p></li>
        </ol>
      </div>
    </section>

    ${renderPricing()}

    <!-- CTA -->
    <section class="hx-section hx-cta-wrap">
      <div class="hx-container">
        <div class="hx-cta reveal">
          <div class="hx-cta-glow" aria-hidden="true"></div>
          <h2>Ready for a website that <em>pays for itself</em>?</h2>
          <p>Tell us where you want to grow. We'll show you how we'd get you there, free.</p>
          <a href="#contact" class="hx-btn hx-btn-primary">Book a free consultation</a>
        </div>
      </div>
    </section>

    <!-- Contact -->
    <section id="contact" class="hx-section hx-contact">
      <div class="hx-container hx-contact-inner">
        <div class="hx-contact-copy reveal">
          <p class="hx-kicker">Get in touch</p>
          <h2>Let's build something <em>great together</em></h2>
          <p>Fill in the form and we'll reply within 24 hours with next steps.</p>
          <ul class="hx-contact-list">
            <li><span>Email</span><a href="mailto:contact@bytesfx.com">contact@bytesfx.com</a></li>
            <li><span>Studio</span>London, UK</li>
            <li><span>Response</span>Within 24 hours</li>
          </ul>
        </div>

        <div class="hx-form-card reveal" style="--d:1">
          <form id="leadCaptureForm" class="hx-form">
            <div class="hx-field">
              <label for="leadName">Full name *</label>
              <input type="text" id="leadName" name="name" required placeholder="Jane Smith" autocomplete="name">
            </div>
            <div class="hx-field">
              <label for="leadEmail">Email address *</label>
              <input type="email" id="leadEmail" name="email" required placeholder="jane@company.com" autocomplete="email">
            </div>
            <div class="hx-field">
              <label for="leadService">What do you need? *</label>
              <select id="leadService" name="service" required>
                <option value="">Select a service…</option>
                <option value="website">Website development</option>
                <option value="application">Application development</option>
                <option value="chatbot">Chatbot solutions</option>
                <option value="other">Other / not sure</option>
              </select>
            </div>
            <div class="hx-field">
              <label for="leadMessage">Project details (optional)</label>
              <textarea id="leadMessage" name="message" rows="4" placeholder="Your project, timeline and goals…"></textarea>
            </div>
            <!-- Honeypot: hidden from people, filled by bots -->
            <div class="hx-hp" aria-hidden="true">
              <label for="leadWebsite">Website</label>
              <input type="text" id="leadWebsite" name="website" tabindex="-1" autocomplete="off">
            </div>
            <p class="hx-form-error" id="leadFormError" role="alert" hidden></p>
            <button type="submit" class="hx-btn hx-btn-primary hx-btn-full">
              <span class="btn-text">Request free consultation</span>
              <span class="btn-loading hidden">Sending…</span>
            </button>
            <p class="hx-disclaimer">By submitting, you agree to our <a href="/privacy-policy.html">Privacy Policy</a>. We never share your information.</p>
          </form>
          <div id="formSuccess" class="hx-success hidden">
            <div class="hx-success-icon" aria-hidden="true">✓</div>
            <h3 tabindex="-1" id="formSuccessTitle">Thank you, we've got it!</h3>
            <p>We'll reply within 24 hours. We've emailed you a link to confirm your address. If you can't find it, look in Promotions or Spam.</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

// ============================================================================
// MODAL FUNCTIONALITY
// ============================================================================

function initModal() {
  const overlay = document.getElementById('contactModalOverlay');
  const btnClose = document.getElementById('btnCloseModal');

  btnClose?.addEventListener('click', () => {
    overlay?.classList.add('hidden');
  });

  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.add('hidden');
    }
  });

  // Handle contact form submission
  document.addEventListener('submit', async (e) => {
    if (e.target.id === 'leadCaptureForm') {
      e.preventDefault();
      await handleLeadSubmission(e.target);
    }
  });
}

const CRM_API_URL = 'https://crm-api.bmorris0565.workers.dev';

async function handleLeadSubmission(form) {
  const btn = form.querySelector('button[type="submit"]');
  const btnText = btn.querySelector('.btn-text');
  const btnLoading = btn.querySelector('.btn-loading');
  const formSuccess = document.getElementById('formSuccess');
  const errorEl = document.getElementById('leadFormError');
  if (btn.disabled) return; // no double submits

  btn.disabled = true;
  btnText?.classList.add('hidden');
  btnLoading?.classList.remove('hidden');
  if (errorEl) { errorEl.hidden = true; errorEl.textContent = ''; }
  form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));

  const fd = new FormData(form);
  const payload = {
    name: fd.get('name'), email: fd.get('email'), service: fd.get('service'),
    message: fd.get('message'), website: fd.get('website'), page: location.pathname,
  };

  try {
    const res = await fetch(`${CRM_API_URL}/api/public/website-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data.field) form.querySelector(`[name="${data.field}"]`)?.setAttribute('aria-invalid', 'true');
      throw new Error(data.error || 'Something went wrong.');
    }

    form.classList.add('hidden');
    formSuccess?.classList.remove('hidden');
    document.getElementById('formSuccessTitle')?.focus();
    // Conversion event for analytics/ads (Consent Mode decides what is stored)
    try {
      if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', { method: 'contact_form', service: payload.service });
      (window.dataLayer = window.dataLayer || []).push({ event: 'generate_lead', lead_source: 'contact_form', service: payload.service });
    } catch (_) {}
  } catch (error) {
    console.error('Lead submission error:', error);
    if (errorEl) {
      errorEl.innerHTML = `${escapeText(error.message || 'We could not send your enquiry.')} You can also email <a href="mailto:contact@bytesfx.com">contact@bytesfx.com</a>.`;
      errorEl.hidden = false;
    }
  } finally {
    btn.disabled = false;
    btnText?.classList.remove('hidden');
    btnLoading?.classList.add('hidden');
  }
}

function escapeText(s) { return String(s).replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`); }

// ============================================================================
// INITIALIZE
// ============================================================================

// Run init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
// Footer year (kept out of inline scripts so the Content-Security-Policy can forbid them)
const yearEl = document.getElementById('currentYear');
if (yearEl) yearEl.textContent = new Date().getFullYear();
