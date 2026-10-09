/* BytesFX cookie consent: Google Consent Mode v2 + granular choices.
   Load synchronously in <head>, before any analytics/ads tag, so the "default" call runs first.
   Public API: window.BytesConsent.open(), .get(), .reset(). Any [data-cookie-settings] element reopens the panel.
   Emits a dataLayer event "consent_update" and a window "bytes:consent" event on every choice. */
(function () {
  'use strict';

  var KEY = 'bfx_consent';
  var VERSION = 2;                         // bump to re-ask everyone (e.g. new vendor)
  var MAX_AGE_DAYS = 180;                  // ICO/CNIL guidance: re-ask at most every 6–13 months
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
      if (!c && legacy) return { v: VERSION, ts: Date.now(), analytics: legacy === 'accepted', marketing: legacy === 'accepted' };
    } catch (e) { /* storage blocked: ask again */ }
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

  function save(analytics, marketing) {
    var c = { v: VERSION, ts: Date.now(), analytics: !!analytics, marketing: !!marketing };
    try {
      localStorage.setItem(KEY, JSON.stringify(c));
      localStorage.removeItem('cookieConsent');
    } catch (e) {}
    document.cookie = KEY + '=' + (c.analytics ? 'a' : '') + (c.marketing ? 'm' : '') + '-' + VERSION +
      '; Max-Age=' + MAX_AGE_DAYS * 86400 + '; Path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
    apply(c, true);
    return c;
  }

  var stored = read();
  if (stored) apply(stored, false);

  // 2. UI (built once the DOM exists).
  var CSS = '' +
    '.bc{--bc-bg:#0b1a1f;--bc-bg2:#102429;--bc-line:rgba(155,214,205,.2);--bc-text:#eaf2ef;--bc-dim:#9db3ae;--bc-amber:#ffb547;--bc-mint:#57e3bf;' +
    'position:fixed;left:24px;bottom:24px;z-index:2100;width:min(420px,calc(100vw - 32px));font:400 14px/1.55 Geist,"Segoe UI",system-ui,sans-serif;color:var(--bc-text);' +
    'background:var(--bc-bg);border:1px solid var(--bc-line);border-radius:20px;padding:20px;' +
    'box-shadow:0 1px 0 rgba(255,255,255,.05) inset,0 24px 60px -24px rgba(0,8,10,.85),0 0 60px -30px rgba(255,181,71,.35);' +
    'opacity:0;transform:translateY(16px) scale(.98);transition:opacity .35s ease,transform .5s cubic-bezier(.34,1.56,.64,1);pointer-events:none}' +
    '.bc.is-open{opacity:1;transform:none;pointer-events:auto}' +
    '.bc *{box-sizing:border-box}' +
    '.bc h2{margin:0 0 6px;font:650 17px/1.25 "Bricolage Grotesque","Segoe UI",system-ui,sans-serif;letter-spacing:-.02em;color:var(--bc-text)}' +
    '.bc p{margin:0;color:var(--bc-dim)}' +
    '.bc a{color:var(--bc-text);text-decoration:underline;text-underline-offset:2px}' +
    '.bc a:hover{color:var(--bc-amber)}' +
    '.bc-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}' +
    '.bc-btn{appearance:none;border:1px solid transparent;border-radius:999px;padding:11px 16px;font:600 14px/1 Geist,"Segoe UI",system-ui,sans-serif;cursor:pointer;' +
    'transition:transform .3s cubic-bezier(.34,1.56,.64,1),background-color .2s ease,border-color .2s ease,color .2s ease}' +
    '.bc-btn:hover{transform:translateY(-1px)}.bc-btn:active{transform:scale(.97)}' +
    '.bc-btn:focus-visible,.bc-link:focus-visible,.bc-sw input:focus-visible+span{outline:2px solid var(--bc-amber);outline-offset:3px}' +
    '.bc-accept{background:var(--bc-amber);color:#1f1203}.bc-accept:hover{background:#ffc365}' +
    '.bc-reject{background:var(--bc-bg2);color:var(--bc-text);border-color:var(--bc-line)}.bc-reject:hover{border-color:rgba(255,181,71,.5)}' +
    '.bc-link{appearance:none;background:none;border:0;padding:4px 0;margin-top:10px;font:500 13px/1.2 Geist,system-ui,sans-serif;color:var(--bc-dim);cursor:pointer;text-decoration:underline;text-underline-offset:3px}' +
    '.bc-link:hover{color:var(--bc-amber)}.bc-link:active{opacity:.7}' +
    '.bc-prefs{display:none;margin-top:14px;border-top:1px solid var(--bc-line)}' +
    '.bc.is-custom .bc-prefs{display:block}.bc.is-custom .bc-link{display:none}' +
    '.bc-cat{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--bc-line)}' +
    '.bc-cat strong{display:block;font-weight:600;color:var(--bc-text)}.bc-cat small{display:block;font-size:12.5px;color:var(--bc-dim)}' +
    '.bc-sw{position:relative;flex:none;width:42px;height:24px;margin-top:2px}' +
    '.bc-sw input{position:absolute;inset:0;opacity:0;margin:0;cursor:pointer;z-index:1}.bc-sw input:disabled{cursor:not-allowed}' +
    '.bc-sw span{position:absolute;inset:0;border-radius:999px;background:#16313a;border:1px solid var(--bc-line);transition:background-color .2s ease}' +
    '.bc-sw span::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--bc-dim);transition:transform .35s cubic-bezier(.34,1.56,.64,1),background-color .2s ease}' +
    '.bc-sw input:checked+span{background:rgba(87,227,191,.25);border-color:rgba(87,227,191,.6)}' +
    '.bc-sw input:checked+span::after{transform:translateX(18px);background:var(--bc-mint)}' +
    '.bc-sw input:disabled+span{opacity:.6}' +
    '.bc-save{width:100%;margin-top:14px}' +
    '@media (max-width:560px){.bc{left:12px;right:12px;bottom:12px;width:auto;padding:18px}html.bc-shown .chatbot-widget{opacity:0;pointer-events:none}}' +
    '@media (prefers-reduced-motion:reduce){.bc,.bc-btn,.bc-sw span::after{transition:opacity .2s ease}}';

  var HTML = '' +
    '<h2 id="bc-title">Your privacy, your call</h2>' +
    '<p id="bc-desc">We use cookies to keep the site working and, with your OK, to measure what helps and show you relevant offers. ' +
    '<a href="/cookie-policy.html">Cookie policy</a></p>' +
    '<div class="bc-prefs" id="bc-prefs">' +
      '<div class="bc-cat"><div><strong>Necessary</strong><small>Security, consent and chat. Always on.</small></div>' +
        '<label class="bc-sw"><input type="checkbox" checked disabled aria-label="Necessary cookies (always on)"><span></span></label></div>' +
      '<div class="bc-cat"><div><strong>Analytics</strong><small>Anonymous stats that show us what to improve.</small></div>' +
        '<label class="bc-sw"><input type="checkbox" data-cat="analytics" aria-label="Analytics cookies"><span></span></label></div>' +
      '<div class="bc-cat"><div><strong>Marketing</strong><small>Measures our ads and keeps offers relevant to you.</small></div>' +
        '<label class="bc-sw"><input type="checkbox" data-cat="marketing" aria-label="Marketing cookies"><span></span></label></div>' +
      '<button type="button" class="bc-btn bc-reject bc-save" data-act="save">Save my choices</button>' +
    '</div>' +
    '<div class="bc-row">' +
      '<button type="button" class="bc-btn bc-reject" data-act="reject">Reject all</button>' +
      '<button type="button" class="bc-btn bc-accept" data-act="accept">Accept all</button>' +
    '</div>' +
    '<button type="button" class="bc-link" data-act="custom" aria-controls="bc-prefs" aria-expanded="false">Customise</button>';

  var root, lastFocus;

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
    document.body.appendChild(root);
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
    return root;
  }

  function box(cat) { return root.querySelector('[data-cat="' + cat + '"]'); }

  function open(custom) {
    build();
    var c = read();
    // Unticked until the visitor opts in: pre-ticked boxes are not valid consent (CJEU Planet49).
    box('analytics').checked = c ? c.analytics : false;
    box('marketing').checked = c ? c.marketing : false;
    root.classList.toggle('is-custom', !!custom);
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
    setTimeout(function () { root.hidden = true; }, 350);
    if (lastFocus && root.contains(document.activeElement) && lastFocus.focus) lastFocus.focus();
  }

  window.BytesConsent = {
    open: function () { open(true); },
    get: read,
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} open(false); }
  };

  function boot() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-cookie-settings]');
      if (t) { e.preventDefault(); open(true); }
    });
    if (stored) return;
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
