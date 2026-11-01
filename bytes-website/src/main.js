import './style.css';
import './home.css';
// The one plan list (also served as /plans.json to onboarding and the dashboard, and bundled into the API)
import PLAN_DATA from '../public/plans.json';
import { initChatbot } from './chat.js';
import { prefersReducedMotion, initReveal, initHeroConsole, initNavbarScroll, initMobileMenu, setFooterYear } from './ui.js';

// Chatbot pricing lives on the AI chatbot page. Old links to it (badge links saved on clients' bots,
// the dashboard, bookmarks: ?upgrade=<plan> or #pricing) are sent there, keeping the plan, client and
// referral details in the address.
const forwarding = new URLSearchParams(location.search).has('upgrade') || location.hash === '#pricing';
if (forwarding) location.replace(`/ai-chatbot/${location.search}#pricing`);

// Global state
let lastHash = '#home';

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
  initMobileMenu();

  // Initialize chatbot
  initChatbot();

  // Initialize modal
  initModal();

  // "Choose <plan>" on the AI chatbot page fills in the contact form here
  initPlanRequest();
}

// ============================================================================
// INTERACTIONS & ANIMATIONS
// ============================================================================

function initInteractions() {
  // 1. Elements fade in as they scroll into view
  initReveal();

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

// "Choose <plan>" on the AI chatbot page arrives as ?plan=<id> (and &client=<id> from the dashboard):
// fill in the contact form, so the request reaches us as an enquiry
function initPlanRequest() {
  const qs = new URLSearchParams(location.search);
  const plan = PLAN_DATA.plans.find(p => p.id === qs.get('plan'));
  if (!plan) return;
  const client = qs.get('client');
  const service = document.getElementById('leadService');
  const msg = document.getElementById('leadMessage');
  if (service) service.value = 'chatbot';
  if (msg) msg.value = `I'd like the ${plan.name} plan${plan.price ? ` (${PLAN_DATA.currency}${plan.price}/month)` : ''}.${client && /^[\w-]{1,64}$/.test(client) ? ` My client ID is ${client}.` : ''}`;
  requestAnimationFrame(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }));
  setTimeout(() => document.getElementById('leadName')?.focus({ preventScroll: true }), 600);
}

// The chatbot's place on the homepage: a short pitch that sends people to its own page
function renderChatbotTeaser() {
  const from = Math.min(...PLAN_DATA.plans.filter(p => p.price > 0).map(p => p.price));
  return `
    <section id="chatbot" class="hx-section hx-teaser">
      <div class="hx-container">
        <div class="hx-teaser-card reveal">
          <div class="hx-teaser-copy">
            <p class="hx-kicker">AI chatbot</p>
            <h2>Your website's best salesperson, <em>awake 24/7</em></h2>
            <p>It answers visitors' questions, finds out what they need and sends you the lead. Start on the free plan or a ${PLAN_DATA.trial.days}-day AI trial with no card. Paid plans from ${PLAN_DATA.currency}${from} a month.</p>
          </div>
          <div class="hx-teaser-actions">
            <a href="/ai-chatbot/" class="hx-btn hx-btn-primary">See the AI chatbot</a>
            <a href="/onboarding/" class="hx-btn hx-btn-ghost">Start free trial</a>
          </div>
        </div>
      </div>
    </section>`;
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
            Websites, upgrades, apps &amp; AI&nbsp;chatbots
          </p>
          <h1 class="hx-title reveal" style="--d:1">
            Websites that turn <em>visitors</em> into <span class="hx-underline">customers</span>.
          </h1>
          <p class="hx-lede reveal" style="--d:2">
            We design and build conversion-optimized websites, custom applications and AI chatbots
            that qualify leads around the clock. We also rebuild the site you already have so it does the same.
          </p>
          <div class="hx-cta-row reveal" style="--d:3">
            <a href="#contact" class="hx-btn hx-btn-primary">
              Get a free consultation
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-4-4 4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>
            <a href="#services" class="hx-btn hx-btn-ghost">See what we build</a>
          </div>
          <dl class="hx-stats reveal" style="--d:4">
            <!-- Only what is true today: no figure goes here until records back it -->
            <div><dt>Reply to every enquiry</dt><dd><span class="counter-value" data-target="24" data-suffix="h">24h</span></dd></div>
            <div><dt>Lead capture</dt><dd>24/7</dd></div>
            <div><dt>No card to start</dt><dd>${PLAN_DATA.currency}0</dd></div>
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
            <li class="hx-msg hx-user" data-step="4">Around $2,000.</li>
            <li class="hx-typing" data-step="5" aria-hidden="true"><i></i><i></i><i></i></li>
          </ol>
          <div class="hx-lead" data-step="6">
            <div class="hx-lead-head">
              <span class="hx-lead-tag">New qualified lead</span>
              <span class="hx-lead-time">just now</span>
            </div>
            <div class="hx-lead-name">Priya · Northside Physio</div>
            <div class="hx-lead-meta">
              <span>Booking website</span><span>$2,000 / mo</span>
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
        ${['Conversion-first design','AI lead qualification','Online booking','Custom web apps','Site rebuilds','API integrations','SEO foundations','Sub-second load times','Email follow-up sequences','CRM pipelines','24/7 chat assistants']
          .concat(['Conversion-first design','AI lead qualification','Online booking','Custom web apps','Site rebuilds','API integrations','SEO foundations','Sub-second load times','Email follow-up sequences','CRM pipelines','24/7 chat assistants'])
          .map(t => `<span>${t}</span>`).join('<b>✦</b>')}
      </div>
    </div>

    <!-- Services -->
    <section id="services" class="hx-section">
      <div class="hx-container">
        <header class="hx-head reveal">
          <p class="hx-kicker">What we build</p>
          <h2>Four ways we grow <em>your revenue</em></h2>
          <p>We don't just build websites. We build the systems that turn attention into enquiries and enquiries into sales. We also rebuild the ones you already have so they do it again.</p>
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
            <a href="/ai-chatbot/" class="hx-link">See the AI chatbot <span aria-hidden="true">→</span></a>
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

          <!-- The fourth service is a wide tile: the only card that reads left to right, so the new
               service reads as a closing offer rather than a fourth box of the same size. -->
          <article class="hx-card hx-card-wide bento-card reveal" style="--d:3">
            <div class="hx-card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M21 3v6h-6"/></svg>
            </div>
            <div class="hx-card-body">
              <h3>Website Upgrading</h3>
              <p>The site you already have, rebuilt to work harder: a redesign that fixes what is slow, what is unclear and what is not converting, without losing what you have already earned.</p>
              <ul class="hx-tags"><li>Site audit</li><li>Redesign</li><li>Faster loading</li><li>Content migration</li></ul>
              <a href="#contact" class="hx-link">Upgrade your site <span aria-hidden="true">→</span></a>
            </div>
            <div class="hx-upgrade" aria-hidden="true">
              <svg viewBox="0 0 280 120" role="presentation">
                <g class="hx-upgrade-old">
                  <rect x="4" y="16" width="96" height="88" rx="12"/>
                  <rect class="hx-upgrade-bar" x="18" y="34" width="50" height="7" rx="3.5"/>
                  <rect class="hx-upgrade-bar" x="18" y="52" width="68" height="7" rx="3.5"/>
                  <rect class="hx-upgrade-bar" x="18" y="70" width="38" height="7" rx="3.5"/>
                </g>
                <path class="hx-upgrade-arrow" d="M112 60h40"/>
                <path class="hx-upgrade-arrow" d="m142 50 12 10-12 10"/>
                <g class="hx-upgrade-new">
                  <rect x="176" y="16" width="96" height="88" rx="12"/>
                  <path class="hx-upgrade-rise" d="M192 86l24-20 18 10 22-24"/>
                  <circle class="hx-upgrade-dot" cx="256" cy="52" r="4"/>
                </g>
              </svg>
            </div>
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

    ${renderChatbotTeaser()}

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
                <option value="upgrading">Website Upgrading</option>
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

// Run init when DOM is ready (not while the page is being sent to the AI chatbot page)
if (forwarding) {
  // nothing to show here
} else if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
setFooterYear();
