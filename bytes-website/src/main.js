import './style.css';

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

  // Initialize cookie consent
  initCookieConsent();

  // Initialize modal
  initModal();

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
}

function initHeroBackground() {
  const heroBg = document.querySelector('.hero-bg');
  if (!heroBg) return;

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
        const duration = 2000;
        const increment = target / (duration / 16);

        let current = 0;
        const updateCounter = () => {
          current += increment;
          if (current < target) {
            counter.textContent = Math.floor(current) + '+';
            requestAnimationFrame(updateCounter);
          } else {
            counter.textContent = target + '+';
          }
        };

        updateCounter();
        observer.unobserve(counter);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => observer.observe(counter));
}

function checkUpgradeParams() {
  const upgradeParam = new URLSearchParams(window.location.search).get('upgrade');
  if (upgradeParam || window.location.hash === '#pricing') {
    requestAnimationFrame(() => {
      const el = document.getElementById('pricing');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    });
  }
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

  // Handle form submission
  chatForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = chatInput?.value?.trim();
    if (!message) return;

    // Add user message
    addChatMessage(message, 'user');
    chatInput.value = '';

    // Show typing indicator
    showTypingIndicator();

    // Generate response
    const response = await generateChatResponse(message);
    removeTypingIndicator();
    addChatMessage(response, 'bot');
  });
}

function addChatMessage(text, sender) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${sender === 'user' ? 'user-message' : 'bot-message'}`;

  const p = document.createElement('p');
  p.textContent = text;
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

// Sales-optimized chatbot responses
async function generateChatResponse(userMessage) {
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
// COOKIE CONSENT FUNCTIONALITY
// ============================================================================

function initCookieConsent() {
  const banner = document.getElementById('cookieConsentBanner');
  const btnAccept = document.getElementById('btnAcceptCookies');
  const btnDecline = document.getElementById('btnDeclineCookies');

  if (!banner) return;

  // Check if already consented
  const consent = localStorage.getItem('cookieConsent');
  if (consent) {
    banner.classList.add('hidden');
    if (consent === 'accepted') {
      enableCookies();
    }
    return;
  }

  // Show banner with delay
  setTimeout(() => {
    banner.classList.add('visible');
  }, 1500);

  // Accept cookies
  btnAccept?.addEventListener('click', () => {
    localStorage.setItem('cookieConsent', 'accepted');
    banner.classList.remove('visible');
    setTimeout(() => banner.classList.add('hidden'), 300);
    enableCookies();
    gtag('consent', 'update', {
      'analytics_storage': 'granted',
      'ad_storage': 'granted'
    });
  });

  // Decline cookies
  btnDecline?.addEventListener('click', () => {
    localStorage.setItem('cookieConsent', 'declined');
    banner.classList.remove('visible');
    setTimeout(() => banner.classList.add('hidden'), 300);
    disableCookies();
  });
}

function enableCookies() {
  // Enable analytics and tracking
  console.log('Cookies enabled');
}

function disableCookies() {
  // Disable analytics and tracking
  console.log('Cookies disabled');
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
    <!-- Hero Section -->
    <section id="home" class="hero-section">
      <div class="hero-bg">
        <div class="hero-orb orb-1"></div>
        <div class="hero-orb orb-2"></div>
        <div class="hero-orb orb-3"></div>
      </div>
      <div class="hero-content">
        <div class="hero-badge reveal">
          <span class="badge-icon">&#9733;</span>
          Trusted by Growing Businesses
        </div>
        <h1 class="hero-title reveal">
          Build High-Performance<br>
          <span class="highlight-gradient">Web Experiences</span><br>
          That Drive Real Results
        </h1>
        <p class="hero-subtitle reveal">
          We design and develop conversion-optimized websites, custom applications, and AI chatbots
          tailored to maximize your ROI and scale your business.
        </p>
        <div class="hero-cta reveal">
          <a href="#contact" class="btn btn-primary btn-large">Get Free Consultation</a>
          <a href="#services" class="btn btn-outline btn-large">View Our Services</a>
        </div>
        <div class="hero-stats reveal">
          <div class="stat-item">
            <span class="counter-value" data-target="150">0</span>
            <span class="stat-label">Projects Delivered</span>
          </div>
          <div class="stat-item">
            <span class="counter-value" data-target="98">0</span>
            <span class="stat-label">% Client Satisfaction</span>
          </div>
          <div class="stat-item">
            <span class="counter-value" data-target="50">0</span>
            <span class="stat-label">ROI Increase Avg</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Services Section -->
    <section id="services" class="services-section">
      <div class="container">
        <div class="section-header reveal">
          <span class="section-label">Our Services</span>
          <h2 class="section-title">Solutions Designed for <span class="highlight">Maximum ROI</span></h2>
          <p class="section-subtitle">We don't just build websites — we build business growth engines.</p>
        </div>

        <div class="services-grid">
          <!-- Service 1: Website Development -->
          <div class="service-card bento-card reveal">
            <div class="service-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
            </div>
            <h3>Modern Website Development</h3>
            <p>High-performance, conversion-optimized websites designed to engage visitors and drive results. Every pixel is purposeful.</p>
            <ul class="service-features">
              <li>Conversion-First Design</li>
              <li>Mobile-Responsive Layouts</li>
              <li>SEO Optimized</li>
              <li>Fast Loading Speeds</li>
            </ul>
            <a href="#contact" class="btn btn-primary service-cta">Start Your Project</a>
          </div>

          <!-- Service 2: Application Development -->
          <div class="service-card bento-card reveal">
            <div class="service-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <h3>Customized Application Development</h3>
            <p>Tailor-made applications that streamline your operations and deliver exceptional user experiences.</p>
            <ul class="service-features">
              <li>Web Applications</li>
              <li>Internal Tools</li>
              <li>API Integrations</li>
              <li>Scalable Architecture</li>
            </ul>
            <a href="#contact" class="btn btn-primary service-cta">Discuss Your Needs</a>
          </div>

          <!-- Service 3: Chatbot Solutions -->
          <div class="service-card bento-card reveal">
            <div class="service-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            </div>
            <h3>Consultant Chatbot Design</h3>
            <p>Intelligent AI chatbots that qualify leads, answer questions, and convert visitors 24/7 while you sleep.</p>
            <ul class="service-features">
              <li>Lead Qualification</li>
              <li>Sales Automation</li>
              <li>24/7 Availability</li>
              <li>Custom Training</li>
            </ul>
            <a href="#contact" class="btn btn-primary service-cta">Build Your Chatbot</a>
          </div>
        </div>
      </div>
    </section>

    <!-- Why Choose Us Section -->
    <section class="why-us-section">
      <div class="container">
        <div class="section-header reveal">
          <span class="section-label">Why BytesFX</span>
          <h2 class="section-title">We Don't Just Build — <span class="highlight">We Convert</span></h2>
          <p class="section-subtitle">Every project is driven by business outcomes, not just aesthetics.</p>
        </div>

        <div class="benefits-grid">
          <div class="benefit-card reveal">
            <div class="benefit-number">01</div>
            <h4>ROI-Focused Development</h4>
            <p>We build with your business goals in mind. Every feature is designed to drive conversions and revenue.</p>
          </div>
          <div class="benefit-card reveal">
            <div class="benefit-number">02</div>
            <h4>Performance First</h4>
            <p>Lightning-fast load times and smooth interactions that keep visitors engaged and reduce bounce rates.</p>
          </div>
          <div class="benefit-card reveal">
            <div class="benefit-number">03</div>
            <h4>Conversion Optimized</h4>
            <p>Strategic CTAs, persuasive copywriting, and data-driven design that turns visitors into customers.</p>
          </div>
          <div class="benefit-card reveal">
            <div class="benefit-number">04</div>
            <h4>End-to-End Support</h4>
            <p>From strategy to launch and beyond — we're your partner in digital growth, not just a vendor.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Process Section -->
    <section id="process" class="process-section">
      <div class="container">
        <div class="section-header reveal">
          <span class="section-label">Our Process</span>
          <h2 class="section-title">How We <span class="highlight">Deliver Results</span></h2>
          <p class="section-subtitle">A proven 4-step process to transform your digital presence.</p>
        </div>

        <div class="process-steps">
          <div class="process-step reveal">
            <div class="step-number">1</div>
            <div class="step-content">
              <h4>Discovery & Strategy</h4>
              <p>We dive deep into your business goals, target audience, and competitive landscape to create a winning strategy.</p>
            </div>
          </div>
          <div class="process-step reveal">
            <div class="step-number">2</div>
            <div class="step-content">
              <h4>Design & Development</h4>
              <p>Our team builds with conversion in mind, using modern technologies and best practices for maximum performance.</p>
            </div>
          </div>
          <div class="process-step reveal">
            <div class="step-number">3</div>
            <div class="step-content">
              <h4>Testing & Optimization</h4>
              <p>Rigorous testing ensures everything works perfectly. We optimize for speed, accessibility, and conversions.</p>
            </div>
          </div>
          <div class="process-step reveal">
            <div class="step-number">4</div>
            <div class="step-content">
              <h4>Launch & Growth</h4>
              <p>We launch with confidence and provide ongoing support to ensure continued success and improvement.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="container">
        <div class="cta-content reveal">
          <h2>Ready to Transform Your Digital Presence?</h2>
          <p>Let's discuss how we can help you achieve your business goals with high-performance digital solutions.</p>
          <a href="#contact" class="btn btn-primary btn-large">Schedule Free Consultation</a>
        </div>
      </div>
    </section>

    <!-- Contact Section -->
    <section id="contact" class="contact-section">
      <div class="container">
        <div class="section-header reveal">
          <span class="section-label">Get In Touch</span>
          <h2 class="section-title">Let's Build Something <span class="highlight">Great Together</span></h2>
          <p class="section-subtitle">Fill out the form below and we'll get back to you within 24 hours.</p>
        </div>

        <div class="contact-form-wrapper reveal">
          <form id="leadCaptureForm" class="lead-form">
            <div class="form-group">
              <label for="leadName">Full Name *</label>
              <input type="text" id="leadName" name="name" required placeholder="John Smith">
            </div>

            <div class="form-group">
              <label for="leadEmail">Email Address *</label>
              <input type="email" id="leadEmail" name="email" required placeholder="john@company.com">
            </div>

            <div class="form-group">
              <label for="leadService">Service Interest *</label>
              <select id="leadService" name="service" required>
                <option value="">Select a service...</option>
                <option value="website">Website Development</option>
                <option value="application">Application Development</option>
                <option value="chatbot">Chatbot Solutions</option>
                <option value="other">Other / Not Sure</option>
              </select>
            </div>

            <div class="form-group">
              <label for="leadMessage">Project Details (Optional)</label>
              <textarea id="leadMessage" name="message" rows="4" placeholder="Tell us about your project, timeline, and goals..."></textarea>
            </div>

            <button type="submit" class="btn btn-primary btn-large btn-full">
              <span class="btn-text">Request Free Consultation</span>
              <span class="btn-loading hidden">Sending...</span>
            </button>

            <p class="form-disclaimer">By submitting, you agree to our <a href="/privacy-policy.html">Privacy Policy</a>. We'll never share your information.</p>
          </form>

          <div id="formSuccess" class="form-success hidden">
            <div class="success-icon">&#10003;</div>
            <h3>Thank You!</h3>
            <p>We've received your inquiry and will be in touch within 24 hours.</p>
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

async function handleLeadSubmission(form) {
  const btn = form.querySelector('button[type="submit"]');
  const btnText = btn.querySelector('.btn-text');
  const btnLoading = btn.querySelector('.btn-loading');
  const formSuccess = document.getElementById('formSuccess');

  // Show loading state
  btn.disabled = true;
  btnText?.classList.add('hidden');
  btnLoading?.classList.remove('hidden');

  // Collect form data
  const formData = new FormData(form);
  const leadData = {
    name: formData.get('name'),
    email: formData.get('email'),
    service: formData.get('service'),
    message: formData.get('message'),
    timestamp: new Date().toISOString(),
    source: 'bytesfx-website'
  };

  try {
    // Try to store in localStorage as primary storage
    const leads = JSON.parse(localStorage.getItem('bytesfx_leads') || '[]');
    leadData.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    leads.push(leadData);
    localStorage.setItem('bytesfx_leads', JSON.stringify(leads));

    // Try to send to API if available
    try {
      await fetch('/crm-api/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      });
    } catch (apiError) {
      console.log('API not available, stored locally');
    }

    // Show success
    form.classList.add('hidden');
    formSuccess?.classList.remove('hidden');

    // Trigger chatbot event
    if (window.trackLeadCapture) {
      window.trackLeadCapture(leadData);
    }

  } catch (error) {
    console.error('Lead submission error:', error);
    alert('There was an error submitting your request. Please try again.');
  } finally {
    btn.disabled = false;
    btnText?.classList.remove('hidden');
    btnLoading?.classList.add('hidden');
  }
}

// ============================================================================
// INITIALIZE
// ============================================================================

// Run init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}