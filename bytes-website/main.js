import './style.css'

const routes = {
  '': renderHome,
  '#home': renderHome,
  '#lead-capture': renderLeadCapture,
  '#privacy': renderPrivacy,
  '#terms': renderTerms
};

function router() {
  const path = window.location.hash;
  const app = document.getElementById('app');

  const renderFn = routes[path] || routes['#home'];

  window.scrollTo(0, 0);
  app.innerHTML = renderFn();

  // Replay view transition observers and interactions
  initInteractions();

  // If lead capture is rendered, pre-fill service if applicable
  if (path === '#lead-capture') {
    const serviceInput = document.getElementById('serviceOfInterest');
    const savedService = sessionStorage.getItem('selectedService');
    if (serviceInput && savedService) {
      serviceInput.value = savedService;
    }
  }
}

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
      <div class="bento-grid">
        <div class="bento-card bento-wide reveal">
          <div class="bento-content">
            <div class="feature-icon">🌐</div>
            <h3>Website Development</h3>
            <p>Cutting-edge, responsive designs integrated with modern performance standards to captivate your audience and turn clicks into recurring revenue.</p>
          </div>
        </div>
        <div class="bento-card bento-tall reveal">
          <div class="bento-content">
            <div class="feature-icon">📱</div>
            <h3>Application Development</h3>
            <p>Scalable and secure web and mobile applications engineered from the ground up for exceptional user experiences and robust enterprise functionality.</p>
          </div>
        </div>
        <div class="bento-card reveal">
          <div class="bento-content">
            <div class="feature-icon">🎬</div>
            <h3>Short Form VSL</h3>
            <p>Dynamic Video Sales Letters optimized for high engagement and supreme conversion rates.</p>
          </div>
        </div>
        <div class="bento-card reveal">
          <div class="bento-content">
            <div class="feature-icon">✍️</div>
            <h3>LinkedIn Content</h3>
            <p>Strategic, thought-leadership content designed to skyrocket your professional network reach.</p>
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
    <div class="page-view lead-capture-view">
          <div class="form-container glass-panel">
            <h2 class="section-title">Let's Build Something <span class="highlight">Amazing</span></h2>
            <p class="section-subtitle">Fill out the form below or email us directly at <strong>contact@bytesfx.com</strong>.</p>

            <form id="contactForm" class="contact-form" onsubmit="handleContactSubmit(event)">
              <div class="form-group">
                <label for="name">Full Name</label>
                <input type="text" id="name" required placeholder="Jane Doe" />
              </div>
              <div class="form-group">
                <label for="email">Email Address</label>
                <input type="email" id="email" required pattern="[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}$" placeholder="jane@example.com" />
              </div>
              <div class="form-group">
                <label for="serviceOfInterest">Service of Interest</label>
                <select id="serviceOfInterest" required>
                  <option value="" disabled selected>Select a Service</option>
                  <option value="Website Development">Website Development</option>
                  <option value="Short Form VSL">Short Form VSL</option>
                  <option value="LinkedIn Content Writing">LinkedIn Content Writing</option>
                  <option value="Application Development">Application Development</option>
                  <option value="Other">Other Custom Request</option>
                </select>
              </div>
              <div class="form-group">
                <label for="specialRequest">Special Request / Project Details</label>
                <textarea id="specialRequest" rows="4" placeholder="Tell us more about what you want to build..."></textarea>
              </div>
              <button type="submit" class="btn btn-primary btn-block">Submit Inquiry</button>
            </form>
          </div>
    </div >
        `;
}

function renderPrivacy() {
  return `
    <div class="page-view legal-view glass-panel">
      <h2>Privacy Policy</h2>
      <p class="last-updated">Last updated: ` + new Date().toLocaleDateString() + `</p>
      
      <div class="legal-content">
        <h3>1. Introduction</h3>
        <p>Welcome to Bytes Enterprises, Ltd ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data.</p>
        
        <h3>2. Data Collection</h3>
        <p>When you use our services or submit a lead capture form, we may ask you to provide us with certain personally identifiable information (e.g., Name, Email Address, Service Details).</p>

        <h3>3. Use of Data</h3>
        <p>Bytes Enterprises uses collected data to provide and maintain our Service, notify you about changes, provide customer support, and gather analysis so we can improve our Service.</p>

        <h3>4. Contact Us</h3>
        <p>If you have any questions about this Privacy Policy, please contact us at <strong>contact@bytesfx.com</strong>.</p>
      </div>
    </div >
        `;
}

function renderTerms() {
  return `
    <div class="page-view legal-view glass-panel">
      <h2>Terms of Service</h2>
      <p class="last-updated">Last updated: ` + new Date().toLocaleDateString() + `</p>
      
      <div class="legal-content">
        <h3>1. Agreement to Terms</h3>
        <p>By accessing or using the services provided by Bytes Enterprises, you agree to be bound by these Terms.</p>
        
        <h3>2. Intellectual Property</h3>
        <p>The Service and its original content, features, and functionality are and will remain the exclusive property of Bytes Enterprises and its licensors.</p>

        <h3>3. Limitation of Liability</h3>
        <p>In no event shall Bytes Enterprises, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages.</p>
        
        <h3>4. Contact Us</h3>
        <p>For inquiries regarding these terms, send an email to <strong>contact@bytesfx.com</strong>.</p>
      </div>
    </div >
        `;
}

// Event Listeners
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => {
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

  // Initialize Cookie Consent Banner Logic
  initCookieConsent();
});

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

  const subject = encodeURIComponent(`New Inquiry from ${name}`);
  const body = encodeURIComponent(
    `Name: ${name}\n` +
    `Email: ${email}\n` +
    `Service of Interest: ${service}\n\n` +
    `Project Details:\n${details}`
  );

  // Trigger the default email client
  window.location.href = `mailto:contact@bytesfx.com?subject=${subject}&body=${body}`;

  // Optionally reset the form after sending to the mail client
  document.getElementById('contactForm').reset();

  // Navigate back home to give a feeling of completion
  setTimeout(() => {
    window.location.hash = '#home';
  }, 500);
};
