let lastHash = '#home';

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

  // 2. Spotlight Hover Effects on Bento Cards
  const cards = document.querySelectorAll('.bento-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });

  // 3. Initialize Hero Starfield
  initStarfield();
}

// Global Animation Frame ID to prevent multiple loops
let starfieldAnimId;

function initStarfield() {
  const canvas = document.getElementById('hero-stars-canvas');
  if (!canvas) return; // Only run if canvas is on the page

  const ctx = canvas.getContext('2d');
  let width = canvas.width = canvas.parentElement.offsetWidth;
  let height = canvas.height = canvas.parentElement.offsetHeight;

  // Handle Resize
  window.addEventListener('resize', () => {
    if (document.getElementById('hero-stars-canvas')) {
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    }
  });

  // Star Particles
  const stars = [];
  const numStars = 150;

  for (let i = 0; i < numStars; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.5 + 0.5,
      baseAlpha: Math.random() * 0.5 + 0.3,
      alphaPhase: Math.random() * Math.PI * 2,
      blinkSpeed: Math.random() * 0.02 + 0.01,
      driftX: (Math.random() - 0.5) * 0.2,
      driftY: (Math.random() - 0.5) * 0.2
    });
  }

  // Shooting Star
  let shootingStar = {
    active: false,
    x: 0,
    y: 0,
    length: 0,
    speed: 0,
    opacity: 0,
    angle: Math.PI / 4, // 45 degrees
    waitTimer: Math.random() * 200 + 100
  };

  function spawnShootingStar() {
    shootingStar.active = true;
    shootingStar.x = Math.random() * (width / 2); // Start left-ish
    shootingStar.y = Math.random() * (height / 2); // Start top-ish
    shootingStar.length = Math.random() * 80 + 40;
    shootingStar.speed = Math.random() * 10 + 15;
    shootingStar.opacity = 1;
    shootingStar.waitTimer = Math.random() * 300 + 150; // frames to wait for next
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Draw normal stars
    for (let i = 0; i < stars.length; i++) {
      let s = stars[i];
      // Drift
      s.x += s.driftX;
      s.y += s.driftY;

      // Wrap around
      if (s.x < 0) s.x = width;
      else if (s.x > width) s.x = 0;
      if (s.y < 0) s.y = height;
      else if (s.y > height) s.y = 0;

      // Blink
      s.alphaPhase += s.blinkSpeed;
      let alpha = s.baseAlpha + Math.sin(s.alphaPhase) * 0.3;
      if (alpha < 0) alpha = 0;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }

    // Draw shooting star
    if (shootingStar.active) {
      shootingStar.x += Math.cos(shootingStar.angle) * shootingStar.speed;
      shootingStar.y += Math.sin(shootingStar.angle) * shootingStar.speed;
      shootingStar.opacity -= 0.02; // Fade out

      if (shootingStar.opacity <= 0 || shootingStar.x > width || shootingStar.y > height) {
        shootingStar.active = false;
      } else {
        const tailX = shootingStar.x - Math.cos(shootingStar.angle) * shootingStar.length;
        const tailY = shootingStar.y - Math.sin(shootingStar.angle) * shootingStar.length;

        ctx.beginPath();
        const gradient = ctx.createLinearGradient(shootingStar.x, shootingStar.y, tailX, tailY);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${shootingStar.opacity})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.moveTo(shootingStar.x, shootingStar.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
      }
    } else {
      shootingStar.waitTimer--;
      if (shootingStar.waitTimer <= 0) {
        spawnShootingStar();
      }
    }

    starfieldAnimId = requestAnimationFrame(draw);
  }

  // Cancel any existing animation loops before starting a new one
  if (starfieldAnimId) {
    cancelAnimationFrame(starfieldAnimId);
  }
  draw();
}

function renderHome() {
  return `
    <div class="page-view home-view">
      <!-- 1. HERO SECTION -->
      <section class="hero-v2 reveal">
        <div class="hero-badge">The Future of AI Lead Generation</div>
        <h1 class="hero-title">The AI assistant built for <br><span class="text-gradient">modern agencies</span></h1>
        <p class="hero-subtitle">Automate prospecting, qualify leads 24/7, and grow your agency — all with the power of BytesAI.</p>
        
        <div class="hero-cta-group">
          <a href="/onboarding/" class="btn btn-primary btn-large">Start Free Trial &rarr;</a>
          <a href="/dashboard/" class="btn btn-outline btn-large">Agency Login</a>
        </div>
        <p class="hero-tiny-text">30-day free trial. Then from $29/month.</p>
      </section>

      <!-- 2. SOCIAL PROOF BAR -->
      <section class="stats-bar reveal">
        <div class="stat-item">
          <span class="stat-value">2,400+</span>
          <span class="stat-label">Agencies</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">180K+</span>
          <span class="stat-label">Leads Managed</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">$2.1B+</span>
          <span class="stat-label">Deals Closed</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">4.9★</span>
          <span class="stat-label">Avg Rating</span>
        </div>
      </section>

      <!-- 3. FEATURE GRID -->
      <section id="features" class="section reveal">
        <div class="section-header">
          <h2>Everything your agency needs</h2>
          <p>A complete suite of tools designed for agencies managing multiple clients and complex sales cycles.</p>
        </div>
        <div class="features-grid">
          <div class="glass-card feature-item">
            <div class="feature-icon-box">👥</div>
            <h3>Contact Management</h3>
            <p>Centralize all client data, communication history, and relationships in one place.</p>
          </div>
          <div class="glass-card feature-item">
            <div class="feature-icon-box">📊</div>
            <h3>Deal Pipeline</h3>
            <p>Visualize and manage every deal stage from prospecting to closing.</p>
          </div>
          <div class="glass-card feature-item">
            <div class="feature-icon-box">📈</div>
            <h3>Reports & Analytics</h3>
            <p>Real-time dashboards to track revenue, team performance and growth.</p>
          </div>
          <div class="glass-card feature-item">
            <div class="feature-icon-box">🤖</div>
            <h3>Automation</h3>
            <p>Automate repetitive tasks, follow-ups, and workflows to save hours daily.</p>
          </div>
        </div>
      </section>

      <!-- 4. PRICING TABLE -->
      <section id="pricing" class="section reveal">
        <div class="section-header">
          <h2>Simple, transparent pricing</h2>
          <p>Start free for 30 days, no credit card required.</p>
        </div>
        
        <div class="pricing-grid">
          <!-- Starter -->
          <div class="pricing-card glass-card">
            <div class="pricing-header">
              <h3>Starter</h3>
              <div class="price">$29<span>/month</span></div>
            </div>
            <ul class="pricing-features">
              <li>Up to 500 contacts</li>
              <li>Basic AI pipeline</li>
              <li>Task management</li>
              <li>Lead logging</li>
              <li>Standard reports</li>
            </ul>
            <a href="/onboarding/" class="btn btn-outline btn-full">Start Free Trial</a>
          </div>

          <!-- Pro -->
          <div class="pricing-card glass-card popular">
            <div class="popular-badge">Most Popular</div>
            <div class="pricing-header">
              <h3>Pro</h3>
              <div class="price">$79<span>/month</span></div>
            </div>
            <ul class="pricing-features">
              <li>Up to 5,000 contacts</li>
              <li>Advanced AI pipeline</li>
              <li>Full task & calendar</li>
              <li>Email campaigns</li>
              <li>Advanced analytics</li>
              <li>Automation workflows</li>
            </ul>
            <a href="/onboarding/" class="btn btn-primary btn-full">Start Free Trial</a>
          </div>

          <!-- Enterprise -->
          <div class="pricing-card glass-card">
            <div class="pricing-header">
              <h3>Enterprise</h3>
              <div class="price">$199<span>/month</span></div>
            </div>
            <ul class="pricing-features">
              <li>Unlimited contacts</li>
              <li>Custom pipelines</li>
              <li>Priority support</li>
              <li>API access</li>
              <li>Custom automation</li>
              <li>Dedicated account manager</li>
            </ul>
            <a href="/onboarding/" class="btn btn-outline btn-full">Start Free Trial</a>
          </div>
        </div>
      </section>

      <!-- 5. TESTIMONIALS -->
      <section class="section testimonials reveal">
        <div class="section-header">
          <h2>Loved by agency owners</h2>
        </div>
        <div class="testimonials-grid">
          <div class="testimonial-card">
            <div class="stars">★★★★★</div>
            <p>"BytesAI transformed how we manage clients. Our deal close rate went up 40% in the first quarter."</p>
            <div class="author">
              <strong>Elena James</strong>
              <span>CEO, Apex Agency</span>
            </div>
          </div>
          <div class="testimonial-card">
            <div class="stars">★★★★★</div>
            <p>"The pipeline and automation features alone are worth every penny. We've saved 10+ hours per week."</p>
            <div class="author">
              <strong>James Clarke</strong>
              <span>Founder, CloudScale</span>
            </div>
          </div>
          <div class="testimonial-card">
            <div class="stars">★★★★★</div>
            <p>"Finally a CRM that feels like it was built for agencies. The reporting is outstanding."</p>
            <div class="author">
              <strong>Priya Sharma</strong>
              <span>MD, Brightwave</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 6. FINAL CTA -->
      <section class="final-cta reveal">
        <h2>Ready to grow your agency?</h2>
        <p>Start your 30-day free trial today. No credit card required.</p>
        <a href="/onboarding/" class="btn btn-primary btn-large">Get Started for Free &rarr;</a>
      </section>
    </div>
  `;
}

function renderLeadCapture() {
  return `
    <div class="modal-premium-layout">
      <!-- Left Brand Panel -->
      <div class="modal-brand-panel">
        <div class="modal-brand-logo">Bytes<span class="highlight">AI</span></div>
        <h2 class="modal-brand-headline">Let's Build Your <span class="highlight">Competitive Edge</span></h2>
        <p class="modal-brand-sub">Build your custom AI sales assistant in minutes. No credit card required.</p>
        <ul class="modal-benefit-list">
          <li>
            <span class="benefit-icon">⚡</span>
            <span>High-performance AI for Agencies</span>
          </li>
          <li>
            <span class="benefit-icon">🤖</span>
            <span>Custom AI chatbots that qualify leads 24/7</span>
          </li>
          <li>
            <span class="benefit-icon">📈</span>
            <span>Lead management that builds authority</span>
          </li>
          <li>
            <span class="benefit-icon">🛡️</span>
            <span>30-day complimentary trial period</span>
          </li>
        </ul>
        <div class="modal-trust-badge">
          <span class="trust-dot"></span>
          Confidential & No Obligation
        </div>
      </div>

      <!-- Right Form Panel -->
      <div class="modal-form-panel">
        <h3 class="modal-form-title">Book a Discovery Call</h3>
        <p class="modal-form-subtitle">Fill in your details and we'll be in touch within 24 hours.</p>

        <form id="contactForm" class="premium-contact-form" onsubmit="handleContactSubmit(event)">
          <div class="form-row">
            <div class="form-group">
              <label for="name">Full Name</label>
              <input type="text" id="name" required placeholder="Jane Doe" autocomplete="name" />
            </div>
            <div class="form-group">
              <label for="email">Email Address</label>
              <input type="email" id="email" required pattern="[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}$" placeholder="jane@company.com" autocomplete="email" />
            </div>
          </div>
          <div class="form-group">
            <label for="serviceOfInterest">Service of Interest</label>
            <select id="serviceOfInterest" required>
              <option value="" disabled selected>Select a service...</option>
              <option value="BytesAI Starter ($29)">BytesAI Starter ($29)</option>
              <option value="BytesAI Pro ($79)">BytesAI Pro ($79)</option>
              <option value="BytesAI Enterprise ($199)">BytesAI Enterprise ($199)</option>
              <option value="AI Chatbot Development">AI Chatbot Development</option>
              <option value="Website Development">Website Development</option>
              <option value="Other">Other Custom Request</option>
            </select>
          </div>
          <div class="form-group">
            <label for="specialRequest">Project Details</label>
            <textarea id="specialRequest" rows="4" placeholder="Tell us about your project, goals, or what problem you're trying to solve..."></textarea>
          </div>
          <button type="submit" class="btn-submit-inquiry">
            <span class="btn-submit-text">Book My Discovery Call</span>
            <span class="btn-submit-arrow">→</span>
          </button>
          <p class="form-fine-print">🔒 No spam. Your details are 100% confidential.</p>
        </form>
      </div>
    </div>
  `;
}

// Global scope exposure
window.handleContactSubmit = (e) => {
  e.preventDefault();
  // We'll call the actual submission logic here if needed
  window.closeContactModal();
};

window.openContactModal = () => {
  const overlay = document.getElementById('contactModalOverlay');
  const container = document.getElementById('modalFormContainer');
  if (overlay && container) {
    container.innerHTML = renderLeadCapture();
    overlay.classList.add('active');
  }
};

window.closeContactModal = () => {
  const overlay = document.getElementById('contactModalOverlay');
  if (overlay) overlay.classList.remove('active');
};

window.handleServiceRequest = (service) => {
  sessionStorage.setItem('selectedService', service);
  window.location.hash = '#lead-capture';
};

function renderPrivacy() {
  return `
    <div class="page-view legal-page-wrapper">
      <div class="legal-header">
        <h2>Privacy <span class="title-accent">Policy</span></h2>
        <p class="last-updated">Last updated: ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div class="legal-body glass-panel">
        <p>This Privacy Policy explains how BytesAI (operated by Bytes Enterprises Ltd., "we", "us", or "our") collects, uses, and protects your personal information. We comply with the UK General Data Protection Regulation (UK GDPR), the EU GDPR, and the Privacy and Electronic Communications Regulations (PECR).</p>
        
        <h3>1. Information We Collect</h3>
        <p><strong>1.1 Information You Provide Directly:</strong></p>
        <ul>
          <li>Name and email address provided via contact forms or registration.</li>
          <li>Any information voluntarily submitted through communication.</li>
        </ul>
        <h3>2. Legal Basis for Processing</h3>
        <p>We process your data under Consent, Contract, and Legitimate Interests to improve our platform performance and ensure security.</p>

        <h3>3. Sharing Your Information</h3>
        <p>We do not sell your personal data. We share information only with essential service providers for infrastructure and email tools.</p>

        <h3>4. International Data Transfers</h3>
        <p>Your data may be transferred to or stored in countries outside the UK/EEA (such as the USA) with equivalent level of protection.</p>

        <h3>5. Your Rights</h3>
        <p>You have the right to Access, Correct, or Delete your personal data, and Object to or restrict processing.</p>

        <h3>6. Contact Us</h3>
        <p><strong>Business Name:</strong> Bytes Enterprises Ltd.<br>
        <strong>Email:</strong> <a href="mailto:contact@bytesai.com">contact@bytesai.com</a></p>
      </div>

      <div class="revenue-center-cta">
        <div class="revenue-center-content">
          <h2>Ready to scale your business?</h2>
          <p>Don't let your digital presence hold you back. Let's discuss how we can engineer growth for your brand.</p>
          <a href="/onboarding/" class="btn btn-primary">Start Free Trial</a>
        </div>
      </div>
    </div>
  `;
}

function renderTerms() {
  return `
    <div class="page-view legal-page-wrapper">
      <div class="legal-header">
        <h2>Terms of <span class="title-accent">Service</span></h2>
        <p class="last-updated">Last updated: ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div class="legal-body glass-panel">
        <h3>1. Introduction</h3>
        <p>These Terms & Conditions govern the relationship between Bytes Enterprises Ltd ("BytesAI", "we", "us") and you.</p>
        
        <h3>2. Services & Consumer Rights</h3>
        <p>We provide digital AI services. In accordance with the Consumer Rights Act 2015, we warrant that all services will be provided with reasonable care and skill.</p>

        <h3>3. Intellectual Property</h3>
        <p>All original tools, templates, and site code remain the property of BytesAI.</p>
        
        <h3>4. Fees and Payment</h3>
        <p>All prices are as stated at the time of purchase. We do not practice "drip pricing" as per the Digital Markets, Competition and Consumers Act 2024.</p>

        <h3>5. Governing Law</h3>
        <p>These terms are governed by the laws of England and Wales.</p>
        
        <h3>6. Contact Information</h3>
        <p>
          Bytes Enterprises Ltd.<br>
          London, UK<br>
          Email: <a href="mailto:contact@bytesai.com">contact@bytesai.com</a>
        </p>
      </div>

      <div class="revenue-center-cta">
        <div class="revenue-center-content">
          <h2>Ready to scale your business?</h2>
          <p>Don't let your digital presence hold you back. Let's discuss how we can engineer growth for your brand.</p>
          <a href="/onboarding/" class="btn btn-primary">Start Free Trial</a>
        </div>
      </div>
    </div>
`;
}
function router() {
  const hash = window.location.hash || '#home';

  // Modal interception: if route is #lead-capture, show the modal but keep the current page underneath
  if (hash === '#lead-capture') {
    openContactModal();
    // Revert the hash back to what it was (or home) so the user stays on the page
    window.location.hash = lastHash || '#home';
    return;
  }

  // Remember the last actual page route
  if (hash !== '#lead-capture' && hash !== '#services') {
    lastHash = hash;
  }

  const app = document.getElementById('app');

  // Cancel starfield animation if navigating away from home natively
  if (starfieldAnimId && hash !== '#home' && hash !== '#services' && hash !== '') {
    cancelAnimationFrame(starfieldAnimId);
    starfieldAnimId = null;
  }

  // Clear previous observers or timeouts if needed
  switch (hash) {
    case '#home':
    case '#services':
    case '':
      // Prevent full re-render if we are already on the home view (to preserve scroll and loaded assets)
      if (!app.querySelector('.home-view')) {
        app.innerHTML = renderHome();
        initInteractions();
      }

      if (hash === '#home' || hash === '') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      if (hash === '#services') {
        setTimeout(() => {
          const servicesEl = document.getElementById('services');
          if (servicesEl) {
            // Calculate position with 80px offset for the fixed navbar
            const y = servicesEl.getBoundingClientRect().top + window.scrollY - 80;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }, 10);
      }
      break;
    case '#privacy':
      app.innerHTML = renderPrivacy();
      break;
    case '#terms':
      app.innerHTML = renderTerms();
      break;
    default:
      app.innerHTML = renderHome();
      initInteractions();
  }
}

// Event Listeners
window.addEventListener('hashchange', router);

function initApp() {
  router(); // Initial render

  // Custom logic for service injection into lead capture
  document.addEventListener('click', (e) => {
    // Check if what we clicked is one of the dropdown services or hero buttons
    if (e.target.matches('.dropdown-menu a') || e.target.matches('[data-service]')) {
      const service = e.target.getAttribute('data-service');
      if (service) {
        sessionStorage.setItem('selectedService', service);
      }
    }

    // Allow native navigation for external or absolute paths like /dashboard/
    const link = e.target.closest('a');
    if (link) {
      const href = link.getAttribute('href');
      // If it's an absolute path to another page in our app, don't prevent default,
      // but let the browser actually navigate there.
      if (href && (href.startsWith('/dashboard/') || href.startsWith('/onboarding/'))) {
        return; // Let native navigation happen
      }
    }
  });

  // Modal Close Button Logic
  const btnCloseModal = document.getElementById('btnCloseModal');
  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', window.closeContactModal);
  }

  // Mobile Menu Logic
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.getElementById('navLinks');

  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });

    // Close menu when a link is clicked
    const navItems = navLinks.querySelectorAll('a');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        navLinks.classList.remove('active');

        // If clicking the link of the page we are currently on, manually trigger router to scroll up
        const targetHash = item.getAttribute('href');
        if (targetHash && (window.location.hash === targetHash || (window.location.hash === '' && targetHash === '#home'))) {
          router();
        }
      });
    });
  }

  // Logo click — always navigate home (hashchange doesn't fire if hash is already #home)
  const logoLink = document.querySelector('.logo-container a');
  if (logoLink) {
    logoLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.hash = '#home';
      router();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Modal Close on click outside content
  const overlay = document.getElementById('contactModalOverlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) window.closeContactModal();
    });
  }

  // Initialize Cookie Consent Banner Logic
  initCookieConsent();

  // Initialize Chatbot UI Loop
  initChatbot();
}

// Check if DOM is already loaded (common with async/module scripts in Vite production builds)
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function initChatbot() {
  const btnOpen = document.getElementById('btnOpenChat');
  const btnClose = document.getElementById('btnCloseChat');
  const chatWindow = document.getElementById('chatbot-window');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const messagesContainer = document.getElementById('chat-messages');

  if (!btnOpen || !btnClose || !chatWindow || !chatForm) return;

  // Initialize with the hardcoded greeting from HTML
  let chatHistory = [
    { role: 'model', parts: [{ text: "Hi there! I'm BytesAI. How can I help you scale today?" }] }
  ];

  const isMobile = () => window.innerWidth <= 480;

  // --- Mobile keyboard handler using visualViewport API ---
  function handleViewportResize() {
    if (!isMobile() || chatWindow.classList.contains('hidden')) return;
    const vv = window.visualViewport;
    if (!vv) return;
    // Set the chatbot window to exactly the visible viewport height and offset
    chatWindow.style.height = vv.height + 'px';
    chatWindow.style.top = vv.offsetTop + 'px';
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleViewportResize);
    window.visualViewport.addEventListener('scroll', handleViewportResize);
  }

  // Toggle Window
  btnOpen.addEventListener('click', () => {
    chatWindow.classList.toggle('hidden');
    if (!chatWindow.classList.contains('hidden')) {
      // Lock background scroll on mobile and hide the launcher
      if (isMobile()) {
        document.body.style.overflow = 'hidden';
        btnOpen.classList.add('chatbot-fab-hidden'); // hide launcher — class wins over !important
        handleViewportResize();
      } else {
        chatInput.focus();
      }
      // Scroll to latest message
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  btnClose.addEventListener('click', () => {
    chatWindow.classList.add('hidden');
    // Restore scroll on mobile and show the launcher again
    if (isMobile()) {
      document.body.style.overflow = '';
      btnOpen.classList.remove('chatbot-fab-hidden'); // restore launcher
      // Reset any inline height set by the keyboard handler
      chatWindow.style.height = '';
      chatWindow.style.top = '';
    }
  });

  // Handle Submit
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    // 1. Add User Message to UI
    appendMessage(message, 'user-message');
    chatInput.value = '';
    chatInput.blur(); // Hide mobile keypad immediately
    chatInput.disabled = true;

    // 2. Add Typing Indicator
    const typingId = showTypingIndicator();

    try {
      // 3. Send to our custom Gemini API Worker (Currently running locally pointing to test port 8787)
      // Note: When you deploy the worker to production, you will change this URL to your actual worker URL!
      const API_URL = "https://chatbot-api.bmorris0565.workers.dev";

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message, history: chatHistory })
      });

      const data = await response.json();

      // Calculate delay based on response length: ~20ms per character, min 750ms, max 3000ms
      const responseText = data.response || "";
      const typingDelay = Math.min(3000, Math.max(750, responseText.length * 20));

      // Simulate "thinking/typing" time
      await new Promise(resolve => setTimeout(resolve, typingDelay));

      removeTypingIndicator(typingId);

      // 4. Add Bot Message to UI
      if (response.ok && data.response) {
        chatHistory.push({ role: 'user', parts: [{ text: message }] });
        chatHistory.push({ role: 'model', parts: [{ text: data.response }] });
        appendMessage(data.response, 'bot-message');

        // 5. Silently submit lead to Google Form (once per session when name+email are captured)
        if (data.leadData && !window._chatLeadSubmitted) {
          window._chatLeadSubmitted = true;
          submitChatbotLead(data.leadData.name, data.leadData.email, data.leadData.summary);
        }
      } else if (response.status === 429) {
        // Specific handling for our rate limiter
        appendMessage(data.error || "You are sending messages too quickly. Please wait a moment.", 'bot-message');
      } else {
        appendMessage("I'm currently unable to connect to my brain. Please email us directly!", 'bot-message');
        console.error("Chat API Error:", data.error || data);
      }

    } catch (err) {
      removeTypingIndicator(typingId);
      appendMessage("Connection error. Please try again later.", 'bot-message');
      console.error("Chat Network Error:", err);
    } finally {
      chatInput.disabled = false;
      // Only auto-focus on desktop to prevent the keypad from re-opening on mobile
      if (window.innerWidth > 768) {
        chatInput.focus();
      }
    }
  });

  const LINKEDIN_URL = 'https://www.linkedin.com/in/fbmacagba/';

  function appendMessage(text, className) {
    const div = document.createElement('div');
    div.className = `chat-message ${className}`;

    // Replace bold markdown
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Detect [LINKEDIN_BUTTON] (regex: case-insensitive, trims surrounding space/newline)
    const linkedinBtnHTML = `<a href="${LINKEDIN_URL}" target="_blank" rel="noopener noreferrer" class="chat-linkedin-btn">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      DM us on LinkedIn
    </a>`;

    formattedText = formattedText.replace(/\[linkedin_button\]/gi, linkedinBtnHTML);

    div.innerHTML = `<p>${formattedText}</p>`;
    messagesContainer.appendChild(div);
    scrollToBottom();
  }

  function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = `chat-message bot-message typing-indicator`;
    div.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
    messagesContainer.appendChild(div);
    scrollToBottom();
    return id;
  }

  function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

// Silently submit a chatbot-captured lead to Google Form
function submitChatbotLead(name, email, summary) {
  const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfUBw3kAv2qoIC2Z45K8RNdzQlaIZYz_UALH4sEFnWDxfUETw/formResponse';

  // Re-use or create a dedicated hidden iframe for the chatbot lead
  let iframe = document.getElementById('chatLeadIframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'chatLeadIframe';
    iframe.name = 'chatLeadIframe';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }

  const form = document.createElement('form');
  form.action = FORM_URL;
  form.method = 'POST';
  form.target = 'chatLeadIframe';
  form.style.display = 'none';

  const inputs = {
    'entry.1698580962': name,
    'entry.1399885084': email,
    'entry.584713419': '',  // service — unknown at this stage
    'entry.31456989': summary || 'Chatbot conversation - chatbot'
  };

  for (const key in inputs) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = inputs[key];
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
  setTimeout(() => form.remove(), 2000);
}

function initCookieConsent() {
  const banner = document.getElementById('cookieConsentBanner');
  if (!banner) return;

  const btnAccept = document.getElementById('btnAcceptCookies');
  const btnDecline = document.getElementById('btnDeclineCookies');

  // Check if consent has already been given or declined
  const cookieConsentStatus = localStorage.getItem('bytesfx_cookie_consent');

  if (!cookieConsentStatus) {
    // Show banner after a slight delay
    setTimeout(() => {
      banner.classList.add('show');
    }, 1500);
  }

  if (btnAccept) {
    btnAccept.addEventListener('click', () => {
      localStorage.setItem('bytesfx_cookie_consent', 'accepted');
      banner.classList.remove('show');
    });
  }

  if (btnDecline) {
    btnDecline.addEventListener('click', () => {
      localStorage.setItem('bytesfx_cookie_consent', 'declined');
      banner.classList.remove('show');
    });
  }
}

// Global Form Submit Handler
window.handleContactSubmit = function (event) {
  event.preventDefault();

  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const service = document.getElementById('serviceOfInterest').value;
  const details = document.getElementById('specialRequest').value;

  const submitBtn = document.querySelector('#contactForm button[type="submit"]');
  const originalText = submitBtn.innerText;
  submitBtn.innerText = "Sending...";
  submitBtn.disabled = true;

  const url = "https://docs.google.com/forms/d/e/1FAIpQLSfUBw3kAv2qoIC2Z45K8RNdzQlaIZYz_UALH4sEFnWDxfUETw/formResponse";

  // Create or reuse hidden iframe to bypass fetch CORS/no-cors payload dropping
  let iframe = document.getElementById('hiddenConfirmIframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'hiddenConfirmIframe';
    iframe.name = 'hiddenConfirmIframe';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }

  // Set up the load event listener to detect when the Google Form finishes loading in the background
  iframe.onload = function () {
    // Show success message inside the modal
    const formContainer = document.getElementById('modalFormContainer');
    formContainer.innerHTML = `
  < div class="modal-premium-layout" >
        <div class="modal-brand-panel">
          <div class="modal-brand-logo">Bytes<span class="highlight">FX</span></div>
          <h2 class="modal-brand-headline">You're one step closer to your <span class="highlight">Competitive Edge</span></h2>
          <p class="modal-brand-sub">We'll review your inquiry and reach out within 24 hours to schedule your strategy call.</p>
          <div class="modal-trust-badge">
            <span class="trust-dot"></span>
            Inquiry Received
          </div>
        </div>
        <div class="modal-form-panel" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:1.5rem;">
          <div style="font-size: 4rem;">&#10003;</div>
          <h3 class="modal-form-title">Thank You!</h3>
          <p class="modal-form-subtitle" style="max-width:320px;">Your inquiry has been sent to our team. Expect a reply within 24 hours.</p>
          <button class="btn-submit-inquiry" style="max-width:240px;" onclick="closeContactModal()">
            <span class="btn-submit-text">Close Window</span>
          </button>
        </div>
      </div >
  `;
    // Clean up
    iframe.onload = null;
  };

  // Create virtual form and submit
  const form = document.createElement('form');
  form.action = url;
  form.method = 'POST';
  form.target = 'hiddenConfirmIframe';
  form.style.display = 'none';

  // Map internal UI dropdown values to the strict exact strings expected by the Google Form
  const serviceMap = {
    "Website Development": "Web Design & Development",
    "Short Form VSL": "Short Form Video Sales Letter (VSL)",
    "LinkedIn Services": "LinkedIn Management & Services",
    "Application Development": "Customized Software Development",
    "AI Chatbot Development": "AI Chatbot Development",
    "Other": "" // Google Form doesn't have an "Other" option enabled, leave blank or map to custom
  };

  const mappedService = serviceMap[service] !== undefined ? serviceMap[service] : service;

  const inputs = {
    "entry.1698580962": name,
    "entry.1399885084": email,
    "entry.584713419": mappedService,
    "entry.31456989": details
  };

  for (let key in inputs) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = inputs[key];
    form.appendChild(input);
  }

  document.body.appendChild(form);

  try {
    form.submit();
  } catch (err) {
    console.error(err);
    alert("There was an error sending your message. Please try again.");
    submitBtn.innerText = originalText;
    submitBtn.disabled = false;
  }
};
