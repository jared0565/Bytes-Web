// Page behaviour shared by the homepage and the AI chatbot page: the menu, the navbar, the scroll reveals,
// the demo chat in the hero and the footer year.

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Elements fade in as they scroll into view
export function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// Plays the hero chat one step at a time, then lands the lead card; loops while on screen
export function initHeroConsole() {
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

export function initNavbarScroll() {
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

export function initMobileMenu() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.getElementById('navLinks');

  if (!mobileMenuBtn || !navLinks) return;

  // Match the shared CSS breakpoint. Desktop links must never be made inert.
  const mobile = window.matchMedia('(max-width: 768px)');
  const setOpen = (open) => {
    const expanded = mobile.matches && open;
    navLinks.classList.toggle('active', expanded);
    navLinks.inert = mobile.matches && !expanded;
    mobileMenuBtn.setAttribute('aria-expanded', String(expanded));
    mobileMenuBtn.setAttribute('aria-label', expanded ? 'Close navigation' : 'Open navigation');
  };
  mobileMenuBtn.setAttribute('aria-controls', navLinks.id);
  setOpen(false);

  mobileMenuBtn.addEventListener('click', () => setOpen(!navLinks.classList.contains('active')));
  navLinks.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
  const closeOutside = (e) => {
    if (!mobileMenuBtn.contains(e.target) && !navLinks.contains(e.target)) setOpen(false);
  };
  document.addEventListener('click', closeOutside);
  document.addEventListener('focusin', closeOutside);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('active')) {
      e.preventDefault();
      setOpen(false);
      mobileMenuBtn.focus();
    }
  });
  window.addEventListener('hashchange', () => setOpen(false));
  mobile.addEventListener('change', () => {
    const focusWasInside = mobile.matches && navLinks.contains(document.activeElement);
    setOpen(false);
    if (focusWasInside) mobileMenuBtn.focus();
  });
}

// Footer year (kept out of inline scripts so the Content-Security-Policy can forbid them)
export function setFooterYear() {
  const yearEl = document.getElementById('currentYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}
