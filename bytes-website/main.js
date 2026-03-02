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
    <div class="form-container">
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
  `;
}

// Modal Logic
function openContactModal() {
  const overlay = document.getElementById('contactModalOverlay');
  const formContainer = document.getElementById('modalFormContainer');

  if (!overlay || !formContainer) return;

  // Inject the form inside the modal
  formContainer.innerHTML = renderLeadCapture();

  // Auto-select service if passed via sessionStorage
  const storedService = sessionStorage.getItem('selectedService');
  if (storedService) {
    const selectEl = document.getElementById('serviceOfInterest');
    if (selectEl) selectEl.value = storedService;
  }

  // Display the modal via CSS class
  overlay.classList.add('show');
}

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
  lastHash = hash;

  const app = document.getElementById('app');

  // Cancel starfield animation if navigating away from home
  if (starfieldAnimId) {
    cancelAnimationFrame(starfieldAnimId);
    starfieldAnimId = null;
  }

  // Clear previous observers or timeouts if needed
  switch (hash) {
    case '#home':
      app.innerHTML = renderHome();
      initInteractions();
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

  // Modal Close Button Logic
  const btnCloseModal = document.getElementById('btnCloseModal');
  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', window.closeContactModal);
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
      <div class="form-container" style="text-align: center; padding: 3rem 1rem;">
        <h2 class="section-title">Thank <span class="highlight">You!</span></h2>
        <p class="section-subtitle" style="margin-top: 1rem;">Your inquiry has been instantly sent to our secure database. We will be in touch shortly.</p>
        <button class="btn btn-primary" style="margin-top: 2rem;" onclick="closeContactModal()">Close Window</button>
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
    "LinkedIn Content Writing": "LinkedIn Management & Services",
    "Application Development": "Customized Software Development",
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
