/* BytesFX cookie consent: Google Consent Mode v2 + granular choices.
   Load synchronously in <head>, before any analytics/ads tag, so the "default" call runs first.
   Public API: window.BytesConsent.open(), .get(), .reset(). Any [data-cookie-settings] element reopens the panel.
   Emits a dataLayer event "consent_update" and a window "bytes:consent" event on every choice. */
(function () {
  'use strict';

  var KEY = 'bfx_consent';
  var VERSION = 2;                         // bump to re-ask everyone (e.g. new vendor)
  var MAX_AGE_DAYS = 180;                  // ICO/CNIL guidance: re-ask at most every 6–13 months
  // Ask on a first visit? Off while no tag on the site sets cookies (the CSP in _headers runs only our own scripts).
  // Before adding Google Analytics, Google Ads or a pixel: set this to true and bump VERSION, so everyone is asked.
  var ASK = false;
  var EEA_UK_CH = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH'];
  var gpc = navigator.globalPrivacyControl === true;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  // 1. Defaults. Opt-in regions start denied; elsewhere analytics + ads start granted unless the browser sends GPC.
  //    Denied tags still send cookieless pings, so Google can model the conversions you would otherwise lose.
  window.gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied',
    functionality_storage: 'granted', security_storage: 'granted', region: EEA_UK_CH, wait_for_update: 500
  });
  window.gtag('consent', 'default', {
    ad_storage: gpc ? 'denied' : 'granted', ad_user_data: gpc ? 'denied' : 'granted',
    ad_personalization: gpc ? 'denied' : 'granted', analytics_storage: 'granted',
    functionality_storage: 'granted', security_storage: 'granted', wait_for_update: 500
  });
  window.gtag('set', 'ads_data_redaction', true);  // strip ad identifiers while ad_storage is denied
  window.gtag('set', 'url_passthrough', true);     // keep gclid/wbraid in URLs so cookieless conversions still attribute

  function read() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (c && c.v === VERSION && Date.now() - c.ts < MAX_AGE_DAYS * 864e5) return c;
      var legacy = localStorage.getItem('cookieConsent');   // old Accept/Decline banner
      // Saved once in the new form, so it expires like any other choice
      if (!c && legacy) return store(legacy === 'accepted', legacy === 'accepted');
    } catch (e) { /* storage blocked: the cookie below still holds the choice */ }
    try {
      // Written next to the stored copy with the same lifetime, so it is only the fallback when storage is blocked
      var m = document.cookie.match(new RegExp('(?:^|; )' + KEY + '=(a?)(m?)-(\\d+)'));
      if (m && Number(m[3]) === VERSION) return { v: VERSION, ts: null, analytics: !!m[1], marketing: !!m[2] };
    } catch (e) {}
    return null;
  }

  function apply(c, isNew) {
    var a = c.analytics ? 'granted' : 'denied';
    var m = c.marketing ? 'granted' : 'denied';
    window.gtag('consent', 'update', { analytics_storage: a, ad_storage: m, ad_user_data: m, ad_personalization: m });
    if (typeof window.fbq === 'function') window.fbq('consent', c.marketing ? 'grant' : 'revoke');
    window.dataLayer.push({ event: 'consent_update', consent_analytics: a, consent_marketing: m, consent_new: !!isNew });
    try { window.dispatchEvent(new CustomEvent('bytes:consent', { detail: c })); } catch (e) {}
  }

  function store(analytics, marketing) {
    var c = { v: VERSION, ts: Date.now(), analytics: !!analytics, marketing: !!marketing };
    try {
      localStorage.setItem(KEY, JSON.stringify(c));
      localStorage.removeItem('cookieConsent');
    } catch (e) {}
    document.cookie = KEY + '=' + (c.analytics ? 'a' : '') + (c.marketing ? 'm' : '') + '-' + VERSION +
      '; Max-Age=' + MAX_AGE_DAYS * 86400 + '; Path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
    return c;
  }

  function save(analytics, marketing) {
    var c = store(analytics, marketing);
    apply(c, true);
    return c;
  }

  var stored = read();
  if (stored) apply(stored, false);

  // 2. UI (built once the DOM exists). Lifted off the page: a lighter surface than the site's panels, an amber
  //    edge, and Reject/Accept/Save drawn alike, so no choice is pushed harder than another.
  var CSS = '' +
    '.bc{--bc-bg:#16313a;--bc-line:rgba(155,214,205,.22);--bc-text:#eaf2ef;--bc-dim:#a9bfba;--bc-paper:#eaf2ef;--bc-ink:#071216;--bc-amber:#ffb547;--bc-mint:#57e3bf;' +
    'position:fixed;left:24px;bottom:24px;z-index:2100;width:min(420px,calc(100vw - 32px));font:400 14px/1.6 Geist,"Segoe UI",system-ui,sans-serif;color:var(--bc-text);' +
    'background:radial-gradient(120% 90% at 0 0,rgba(255,181,71,.10),rgba(255,181,71,0) 60%),var(--bc-bg);' +
    'border:1px solid rgba(255,181,71,.38);border-radius:20px;padding:22px 22px 18px;' +
    'box-shadow:inset 0 3px 0 var(--bc-amber),0 0 0 1px rgba(7,18,22,.7),0 30px 70px -20px rgba(0,6,8,.9),0 18px 50px -22px rgba(255,181,71,.5);' +
    'max-height:calc(100vh - 48px);max-height:calc(100dvh - 48px);overflow-y:auto;overscroll-behavior:contain;' +
    'opacity:0;transform:translateY(16px) scale(.98);transition:opacity .35s ease,transform .5s cubic-bezier(.34,1.56,.64,1);pointer-events:none}' +
    '.bc[hidden]{display:none}' +
    '.bc.is-open{opacity:1;transform:none;pointer-events:auto}' +
    '.bc *{box-sizing:border-box}' +
    '.bc h2{margin:0 0 6px;font:650 19px/1.25 "Bricolage Grotesque","Segoe UI",system-ui,sans-serif;letter-spacing:-.02em;color:var(--bc-text)}' +
    '.bc p{margin:0;color:var(--bc-dim)}' +
    '.bc a{color:var(--bc-text);text-decoration:underline;text-underline-offset:2px}' +
    '.bc a:hover{color:var(--bc-amber)}.bc a:active{opacity:.7}' +
    '.bc-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}' +
    '.bc-btn{appearance:none;border:1px solid transparent;border-radius:999px;padding:12px 18px;font:600 14px/1 Geist,"Segoe UI",system-ui,sans-serif;cursor:pointer;' +
    'background:var(--bc-paper);color:var(--bc-ink);box-shadow:0 6px 16px -10px rgba(0,6,8,.9);transition:transform .3s cubic-bezier(.34,1.56,.64,1)}' +
    '.bc-btn:hover{background:#fff;transform:translateY(-1px)}.bc-btn:active{transform:scale(.97)}' +
    '.bc-btn:focus-visible,.bc a:focus-visible,.bc-link:focus-visible,.bc-sw input:focus-visible+span{outline:2px solid var(--bc-amber);outline-offset:3px}' +
    '.bc-link{appearance:none;background:none;border:0;padding:4px 0;margin-top:10px;font:500 13px/1.2 Geist,system-ui,sans-serif;color:var(--bc-dim);cursor:pointer;text-decoration:underline;text-underline-offset:3px}' +
    '.bc-link:hover{color:var(--bc-amber)}.bc-link:active{opacity:.7}' +
    '.bc-prefs{display:none;margin-top:16px;border-top:1px solid var(--bc-line)}' +
    '.bc.is-custom .bc-prefs{display:block}.bc.is-custom .bc-link{display:none}' +
    '.bc-cat{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--bc-line)}' +
    '.bc-cat strong{display:block;font-weight:600;color:var(--bc-text)}.bc-cat small{display:block;font-size:12.5px;line-height:1.5;color:var(--bc-dim)}' +
    '.bc-sw{position:relative;flex:none;width:42px;height:24px;margin-top:2px}' +
    '.bc-sw input{position:absolute;inset:0;opacity:0;margin:0;cursor:pointer;z-index:1}.bc-sw input:disabled{cursor:not-allowed}' +
    '.bc-sw span{position:absolute;inset:0;border-radius:999px;background:#0b1a1f;border:1px solid var(--bc-line)}' +
    '.bc-sw span::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--bc-dim);transition:transform .35s cubic-bezier(.34,1.56,.64,1)}' +
    '.bc-sw input:hover+span{border-color:rgba(255,181,71,.6)}' +
    '.bc-sw input:checked+span{background:rgba(87,227,191,.25);border-color:rgba(87,227,191,.6)}' +
    '.bc-sw input:checked+span::after{transform:translateX(18px);background:var(--bc-mint)}' +
    '.bc-sw input:disabled+span{opacity:.6}' +
    '.bc-save{width:100%;margin-top:14px}' +
    // Wide screens: a bar centred along the bottom, kept clear of the chat button in the corner
    '@media (min-width:900px){' +
      '.bc{left:0;right:0;margin:0 auto;width:min(880px,calc(100vw - 240px));display:grid;grid-template-columns:1fr auto;column-gap:32px;align-items:center;padding:22px 26px 18px}' +
      '.bc-row{grid-column:2;grid-row:1;margin-top:0;grid-template-columns:repeat(2,minmax(136px,auto))}' +
      '.bc-link{grid-column:1;justify-self:start;margin-top:6px}' +
      '.bc-prefs{grid-column:1/-1}' +
      '.bc-cats{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}' +
      // Switch beside the heading, so the description has the column's full width
      '.bc-cat{display:grid;grid-template-columns:1fr auto;gap:4px 12px;align-items:center;align-content:start;border-bottom:0;padding:14px 0 0}' +
      '.bc-cat>div{display:contents}.bc-cat small{grid-column:1/-1}.bc-sw{grid-column:2;grid-row:1;margin-top:0}' +
      '.bc-save{display:block;width:auto;margin:16px 0 0 auto}' +
    '}' +
    '@media (max-width:560px){.bc{left:12px;right:12px;bottom:12px;width:auto;padding:20px 18px 16px;max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px)}html.bc-shown .chatbot-widget{opacity:0;pointer-events:none}}' +
    '@media (prefers-reduced-motion:reduce){.bc,.bc-btn,.bc-sw span::after{transition:opacity .2s ease}}';

  var HTML = '' +
    '<div class="bc-text">' +
      '<h2 id="bc-title">Your privacy, your call</h2>' +
      '<p id="bc-desc">We use cookies to keep the site working and, with your OK, to measure what helps and show you relevant offers. ' +
      '<a href="/cookie-policy.html">Cookie policy</a></p>' +
    '</div>' +
    '<div class="bc-row">' +
      '<button type="button" class="bc-btn" data-act="reject">Reject all</button>' +
      '<button type="button" class="bc-btn" data-act="accept">Accept all</button>' +
    '</div>' +
    '<button type="button" class="bc-link" data-act="custom" aria-controls="bc-prefs" aria-expanded="false">Customise</button>' +
    '<div class="bc-prefs" id="bc-prefs">' +
      '<div class="bc-cats">' +
        '<div class="bc-cat"><div><strong>Necessary</strong><small>Security, consent and chat. Always on.</small></div>' +
          '<label class="bc-sw"><input type="checkbox" checked disabled aria-label="Necessary cookies (always on)"><span></span></label></div>' +
        '<div class="bc-cat"><div><strong>Analytics</strong><small>Anonymous stats that show us what to improve.</small></div>' +
          '<label class="bc-sw"><input type="checkbox" data-cat="analytics" aria-label="Analytics cookies"><span></span></label></div>' +
        '<div class="bc-cat"><div><strong>Marketing</strong><small>Measures our ads and keeps offers relevant to you.</small></div>' +
          '<label class="bc-sw"><input type="checkbox" data-cat="marketing" aria-label="Marketing cookies"><span></span></label></div>' +
      '</div>' +
      '<button type="button" class="bc-btn bc-save" data-act="save">Save my choices</button>' +
    '</div>';

  var root, lastFocus, hideTimer, byVisitor;

  function build() {
    if (root) return root;
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    root = document.createElement('section');
    root.className = 'bc';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'false');           // non-blocking: the page stays usable
    root.setAttribute('aria-labelledby', 'bc-title');
    root.setAttribute('aria-describedby', 'bc-desc');
    root.hidden = true;
    root.innerHTML = HTML;
    // First in the page, so keyboard and screen-reader users reach it before the content it sits over
    document.body.insertBefore(root, document.body.firstChild);
    root.addEventListener('click', function (e) {
      var act = e.target.closest('[data-act]');
      if (!act) return;
      var kind = act.getAttribute('data-act');
      if (kind === 'accept') close(save(true, true));
      else if (kind === 'reject') close(save(false, false));
      else if (kind === 'save') close(save(box('analytics').checked, box('marketing').checked));
      else if (kind === 'custom') {
        root.classList.add('is-custom');
        act.setAttribute('aria-expanded', 'true');
        box('analytics').focus();
      }
    });
    // Settings the visitor opened close on Escape; a first-visit ask stays until a choice is made
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && byVisitor) close();
    });
    return root;
  }

  function box(cat) { return root.querySelector('[data-cat="' + cat + '"]'); }

  function open(custom) {
    build();
    clearTimeout(hideTimer);                              // a close still fading out must not hide this open
    var c = read();
    // Unticked until the visitor opts in: pre-ticked boxes are not valid consent (CJEU Planet49).
    box('analytics').checked = c ? c.analytics : false;
    box('marketing').checked = c ? c.marketing : false;
    root.classList.toggle('is-custom', !!custom);
    root.querySelector('[data-act="custom"]').setAttribute('aria-expanded', String(!!custom));
    byVisitor = !!custom;
    lastFocus = document.activeElement;
    root.hidden = false;
    document.documentElement.classList.add('bc-shown');
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('is-open'); }); });
    if (custom) setTimeout(function () { box('analytics').focus(); }, 50);
  }

  function close() {
    if (!root) return;
    root.classList.remove('is-open');
    document.documentElement.classList.remove('bc-shown');
    hideTimer = setTimeout(function () { root.hidden = true; }, 350);
    if (lastFocus && root.contains(document.activeElement) && lastFocus.focus) lastFocus.focus();
  }

  window.BytesConsent = {
    open: function () { open(true); },
    get: read,
    reset: function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      document.cookie = KEY + '=; Max-Age=0; Path=/';
      open(false);
    }
  };

  function boot() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-cookie-settings]');
      if (t) { e.preventDefault(); open(true); }
    });
    if (stored || !ASK) return;
    // Show after the first interaction or 2.5s, so it never competes with the hero/LCP.
    var shown = false;
    function show() {
      if (shown) return;
      shown = true;
      ['scroll', 'pointerdown', 'keydown'].forEach(function (ev) { window.removeEventListener(ev, show); });
      open(false);
    }
    ['scroll', 'pointerdown', 'keydown'].forEach(function (ev) { window.addEventListener(ev, show, { passive: true, once: true }); });
    setTimeout(show, 2500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
