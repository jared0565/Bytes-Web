import './style.css'


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
      <div class="hero reveal">
        <!-- Interactive Starfield Canvas -->
        <canvas id="hero-stars-canvas" class="hero-stars-canvas"></canvas>
        <div class="hero-bg-glow"></div>
        
        <div class="hero-content">
          <div class="feature-chip">
            <span class="chip-badge">Services</span>
            <span class="chip-text">End-to-end solutions for modern founders</span>
            <span class="chip-arrow">→</span>
          </div>

          <h1 class="hero-title">We build the digital engines that scale your business</h1>
          <p class="hero-subtitle">From high-converting web and mobile applications to viral Video Sales Letters and strategic LinkedIn content, we handle your entire digital presence.</p>
          
          <div class="hero-cta-group">
            <a href="#lead-capture" class="btn btn-primary-lime">Book a demo</a>
          </div>
        </div>
      </div>
      
      <!-- Trusted By Marquee -->
      <div class="trusted-section reveal">
        <p class="trusted-label">TRUSTED BY INNOVATIVE TEAMS WORLDWIDE</p>
        <div class="marquee-container">
          <div class="marquee-content">
            <!-- Original Set -->
            <span class="logo-placeholder">ACME Corp</span>
            <span class="logo-placeholder">Globex</span>
            <span class="logo-placeholder">Soylent</span>
            <span class="logo-placeholder">Initech</span>
            <span class="logo-placeholder">Umbrella</span>
            <span class="logo-placeholder">Stark Ind.</span>
            <!-- Duplicate for seamless infinite scroll -->
            <span class="logo-placeholder">ACME Corp</span>
            <span class="logo-placeholder">Globex</span>
            <span class="logo-placeholder">Soylent</span>
            <span class="logo-placeholder">Initech</span>
            <span class="logo-placeholder">Umbrella</span>
            <span class="logo-placeholder">Stark Ind.</span>
          </div>
        </div>
      </div>

      <!-- Bento Grid Features -->
      <div id="services" class="bento-grid">
        <!-- Top Row -->
        <div class="bento-card bento-wide reveal" onclick="window.openContactModal('Application Development')" style="cursor: pointer;">
          <div class="bento-content">
            <div class="feature-icon">📱</div>
            <h3>Application Development</h3>
            <p>Scalable and secure web and mobile applications engineered from the ground up for exceptional user experiences and robust enterprise functionality.</p>
          </div>
        </div>
        <div class="bento-card reveal" onclick="window.openContactModal('AI Chatbot Development')" style="cursor: pointer;">
          <div class="bento-content">
            <div class="feature-icon">🤖</div>
            <h3>AI Chatbot Development</h3>
            <p>Custom B2B Sales & Lead Gen bots that automatically qualify traffic and book calls 24/7.</p>
          </div>
        </div>

        <!-- Bottom Row -->
        <div class="bento-card reveal" onclick="window.openContactModal('Website Development')" style="cursor: pointer;">
          <div class="bento-content">
            <div class="feature-icon">🌐</div>
            <h3>Website Development</h3>
            <p>Cutting-edge, responsive designs integrated with modern performance standards to captivate your audience and turn clicks into recurring revenue.</p>
          </div>
        </div>
        <div class="bento-card reveal" onclick="window.openContactModal('LinkedIn Services')" style="cursor: pointer;">
          <div class="bento-content">
            <div class="feature-icon">✍️</div>
            <h3>LinkedIn Services</h3>
            <p>Profile optimization, thought-leadership content, and complete management for maximum ROI.</p>
          </div>
        </div>
        <div class="bento-card reveal" onclick="window.openContactModal('Short Form VSL')" style="cursor: pointer;">
          <div class="bento-content">
            <div class="feature-icon">🎬</div>
            <h3>Short Form VSL</h3>
            <p>Dynamic Video Sales Letters optimized for high engagement and supreme conversion rates.</p>
          </div>
        </div>
      </div>

      <!-- Customer Reviews / Social Proof -->
        <section class="reviews-section reveal">
          <div class="reviews-header">
            <h2 class="section-title">Don't just take our word for it</h2>
            <p class="section-subtitle">Hear what founders and modern engineering teams are saying.</p>
          </div>

          <div class="masonry-grid">
            <div class="review-card glass-panel">
              <div class="review-stars">★★★★★</div>
              <p class="review-text">"BytesFX completely overhauled our digital presence. The new SaaS aesthetic they provided helped us increase our lead conversion by 40% in just two months."</p>
              <div class="review-author">
                <div class="author-avatar" style="background-color: var(--accent-color);">EJ</div>
                <div class="author-info">
                  <strong>Elena James</strong>
                  <span>CMO at TechFlow</span>
                </div>
              </div>
            </div>

            <div class="review-card glass-panel">
              <div class="review-stars">★★★★★</div>
              <p class="review-text">"Their application development team is top-tier. Extremely communicative and shipped our complex React dashboard exactly to spec and ahead of schedule."</p>
              <div class="review-author">
                <div class="author-avatar" style="background-color: #ec4899;">MS</div>
                <div class="author-info">
                  <strong>Michael Smith</strong>
                  <span>Founder, DataSync</span>
                </div>
              </div>
            </div>

            <div class="review-card glass-panel">
              <div class="review-stars">★★★★★</div>
              <p class="review-text">"Our Short Form VSLs went viral exactly as they mapped out. Incredible ROI and the LinkedIn content framework established my personal brand perfectly."</p>
              <div class="review-author">
                <div class="author-avatar" style="background-color: #10b981;">AR</div>
                <div class="author-info">
                  <strong>Aisha Rahman</strong>
                  <span>CEO, Nexus AI</span>
                </div>
              </div>
            </div>
          </div>
        </section>
    </div >
        `;
}

function renderLeadCapture() {
  return `
    <div class="modal-premium-layout">

      <!-- Left Brand Panel -->
      <div class="modal-brand-panel">
        <div class="modal-brand-logo">Bytes<span class="highlight">FX</span></div>
        <h2 class="modal-brand-headline">Let's Build Your <span class="highlight">Competitive Edge</span></h2>
        <p class="modal-brand-sub">Tell us what you need. We'll map out the exact solution in a free 30-minute strategy call.</p>
        <ul class="modal-benefit-list">
          <li>
            <span class="benefit-icon">⚡</span>
            <span>High-performance websites that convert</span>
          </li>
          <li>
            <span class="benefit-icon">🤖</span>
            <span>Custom AI chatbots that qualify leads 24/7</span>
          </li>
          <li>
            <span class="benefit-icon">📈</span>
            <span>LinkedIn management that builds authority</span>
          </li>
          <li>
            <span class="benefit-icon">🛡️</span>
            <span>30-day complimentary bug fix guarantee</span>
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
              <option value="Website Development">Website Development</option>
              <option value="Short Form VSL">Short Form VSL</option>
              <option value="LinkedIn Services">LinkedIn Services</option>
              <option value="Application Development">Application Development</option>
              <option value="AI Chatbot Development">AI Chatbot Development</option>
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

// Modal Logic
window.openContactModal = function (serviceOverride = null) {
  const overlay = document.getElementById('contactModalOverlay');
  const formContainer = document.getElementById('modalFormContainer');

  if (!overlay || !formContainer) return;

  // Inject the form inside the modal
  formContainer.innerHTML = renderLeadCapture();

  // Auto-select service if passed via direct parameter or fallback to sessionStorage
  const selectEl = document.getElementById('serviceOfInterest');
  if (selectEl) {
    if (serviceOverride) {
      selectEl.value = serviceOverride;
    } else {
      const storedService = sessionStorage.getItem('selectedService');
      if (storedService) {
        selectEl.value = storedService;
      }
    }
  }

  // Display the modal via CSS class
  overlay.classList.add('show');
};

window.closeContactModal = function () {
  const overlay = document.getElementById('contactModalOverlay');
  if (overlay) {
    overlay.classList.remove('show');
  }
  // Optional: clear out form content or hash when closing
  window.location.hash = lastHash || '#home';
};

// Track previous hash to cleanly exit the modal
let lastHash = '';

function renderPrivacy() {
  return `
    <div class="page-view legal-page-wrapper">
      <div class="legal-header">
        <h2>Privacy <span class="title-accent">Policy</span></h2>
        <p class="last-updated">Last updated: ` + new Date().toLocaleDateString() + `</p>
      </div>
      
      <div class="legal-body glass-panel">
        <p>This Privacy Policy explains how BytesFX (operated by Bytes Enterprises Ltd., "we", "us", or "our") collects, uses, and protects your personal information. We comply with the UK General Data Protection Regulation (UK GDPR), the EU GDPR, and the Privacy and Electronic Communications Regulations (PECR).</p>
        
        <h3>1. Information We Collect</h3>
        <p><strong>1.1 Information You Provide Directly:</strong></p>
        <ul>
          <li>Name and email address provided via contact forms or newsletter sign-ups.</li>
          <li>Any information voluntarily submitted through communication.</li>
        </ul>
        <p><strong>1.2 Automatically Collected Information & Cookies:</strong></p>
        <p>Our website uses cookies and similar tracking technologies (such as the Meta/Facebook Pixel) to collect:</p>
        <ul>
          <li>IP address, browser type, and device information.</li>
          <li>Interaction data (pages visited, time spent, and links clicked).</li>
        </ul>
        <p><strong>Consent:</strong> We will only fire non-essential cookies (including marketing and analytics pixels) if you provide explicit consent via our cookie banner. You can withdraw your consent at any time through your browser settings or our site's preference center.</p>

        <h3>2. Legal Basis for Processing</h3>
        <p>We process your data under the following lawful bases:</p>
        <ul>
          <li><strong>Consent:</strong> When you opt-in to marketing or non-essential cookies.</li>
          <li><strong>Contract:</strong> To provide services or templates you have requested.</li>
          <li><strong>Legitimate Interests:</strong> To improve our website performance and ensure security.</li>
          <li><strong>Legal Obligation:</strong> To comply with tax, fraud prevention, or regulatory requirements.</li>
        </ul>

        <h3>3. Sharing Your Information</h3>
        <p>We do not sell your personal data. We share information only with:</p>
        <ul>
          <li><strong>Service Providers:</strong> Infrastructure and email tools (e.g., Groove, email marketing software).</li>
          <li><strong>Advertising Partners:</strong> We use Meta (Facebook) for retargeting. This involves sharing hashed data or pixel events to show you relevant ads on social media.</li>
          <li><strong>Legal Authorities:</strong> Only where required by law.</li>
        </ul>

        <h3>4. International Data Transfers</h3>
        <p>As we use global service providers, your data may be transferred to or stored in countries outside the UK/EEA (such as the USA). We ensure these transfers are protected by Standard Contractual Clauses (SCCs) or the UK Extension to the Data Privacy Framework, ensuring your data receives an equivalent level of protection.</p>

        <h3>5. Data Retention</h3>
        <p>We retain personal data only for as long as necessary to fulfill the purposes outlined (e.g., as long as you are subscribed to our list) or to meet legal record-keeping obligations.</p>

        <h3>6. Your Rights</h3>
        <p>You have the right to:</p>
        <ul>
          <li>Access, Correct, or Delete your personal data.</li>
          <li>Object to or restrict processing (including opting out of marketing).</li>
          <li>Data Portability (requesting a copy of your data in a machine-readable format).</li>
          <li>Withdraw Consent at any time.</li>
        </ul>

        <h3>7. How to Complain</h3>
        <p>If you have concerns, please contact us at <a href="mailto:contact@bytesfx.com">contact@bytesfx.com</a> first. If you remain unsatisfied, you have the right to lodge a complaint with the Information Commissioner’s Office (ICO), the UK’s supervisory authority for data protection.</p>
        <p><strong>ICO Website:</strong> <a href="https://www.ico.org.uk" target="_blank" rel="noopener noreferrer">https://www.ico.org.uk</a><br><strong>Address:</strong> Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF.</p>

        <h3>8. Contact Us</h3>
        <p><strong>Business Name:</strong> Bytes Enterprises Ltd.<br>
        <strong>Address:</strong> International House, 24 Holborn Viaduct, London, United Kingdom, EC1A 2BN<br>
        <strong>Email:</strong> <a href="mailto:contact@bytesfx.com">contact@bytesfx.com</a></p>
      </div>

      <!-- Revenue Center CTA -->
      <div class="revenue-center-cta">
        <div class="revenue-center-content">
          <h2>Ready to scale your business?</h2>
          <p>Don't let your digital presence hold you back. Let's discuss how we can engineer growth for your brand.</p>
          <button class="btn btn-primary" onclick="window.location.hash='#lead-capture'">Book a Free Discovery Call</button>
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
        <p class="last-updated">Last updated: ` + new Date().toLocaleDateString() + `</p>
      </div>
      
      <div class="legal-body glass-panel">
        <h3>1. Introduction</h3>
        <p>These Terms & Conditions govern the relationship between Bytes Enterprises Ltd ("BytesFX", "we", "us") and you. By using this website or purchasing our services, you agree to these terms.</p>
        
        <h3>2. Services & Consumer Rights</h3>
        <p>We provide digital web design and development services. In accordance with the Consumer Rights Act 2015, we warrant that all services will be provided with reasonable care and skill.</p>

        <h3>3. Right to Cancel (Cooling-Off Period)</h3>
        <p>If you are a consumer, you have the right to cancel your order within 14 days without giving a reason. However, if you request that we begin digital services immediately, you acknowledge that you waive your right to cancel once the service has been fully performed or once digital content download has begun.</p>
        
        <h3>4. Intellectual Property</h3>
        <p>All original tools, templates, and site code remain the property of BytesFX. Upon full payment, the specific "final design" and content created for a client project are transferred to the client, subject to a non-exclusive license for any BytesFX proprietary elements included therein.</p>
        
        <h3>5. Fees and Payment</h3>
        <p>All prices are as stated at the time of purchase. In compliance with the Digital Markets, Competition and Consumers Act 2024, we do not practice "drip pricing." The total cost, including any applicable VAT, will be clearly displayed before you confirm your order.</p>

        <h3>6. Affiliate Disclosure</h3>
        <p>This site uses affiliate links. If you click a link and make a purchase, we may receive a commission. this does not affect the price you pay. We only recommend tools we use or believe in.</p>

        <h3>7. Limitation of Liability</h3>
        <p>To the maximum extent permitted by law (England and Wales), BytesFX shall not be liable for any indirect or consequential loss. We do not exclude liability for death or personal injury caused by our negligence, or for fraudulent misrepresentation.</p>

        <h3>8. Governing Law & Disputes</h3>
        <p>These terms are governed by the laws of England and Wales. If a dispute arises, we encourage you to contact us directly to reach an amicable solution. If we cannot resolve it, you may seek resolution through an Alternative Dispute Resolution (ADR) provider.</p>
        
        <h3>9. Contact Information</h3>
        <p>
          Bytes Enterprises Ltd.<br>
          International House, 24 Holborn Viaduct, London, EC1A 2BN<br>
          Email: <a href="mailto:contact@bytesfx.com">contact@bytesfx.com</a>
        </p>
      </div>

      <!-- Revenue Center CTA -->
      <div class="revenue-center-cta">
        <div class="revenue-center-content">
          <h2>Ready to scale your business?</h2>
          <p>Don't let your digital presence hold you back. Let's discuss how we can engineer growth for your brand.</p>
          <button class="btn btn-primary" onclick="window.location.hash='#lead-capture'">Book a Free Discovery Call</button>
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
  // We don't overwrite lastHash on #services so backtracking is clean
  if (hash !== '#services') {
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
      // Lock background scroll on mobile
      if (isMobile()) {
        document.body.style.overflow = 'hidden';
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
    // Restore scroll on mobile
    if (isMobile()) {
      document.body.style.overflow = '';
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
      removeTypingIndicator(typingId);

      // 4. Add Bot Message to UI
      if (response.ok && data.response) {
        chatHistory.push({ role: 'user', parts: [{ text: message }] });
        chatHistory.push({ role: 'model', parts: [{ text: data.response }] });
        appendMessage(data.response, 'bot-message');
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

  function appendMessage(text, className) {
    const div = document.createElement('div');
    div.className = `chat-message ${className}`;

    // Simple markdown formatting for bold text from Gemini
    const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
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
      <div class="modal-premium-layout">
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
      </div>
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
