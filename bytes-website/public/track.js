/* Bytes website visit statistics — cookieless.
 * Sends one small beacon per page view: the page path, where the visit came from (on the
 * first page of a visit) and any utm_source / utm_campaign. Nothing is stored in the browser,
 * and visitors who send Do Not Track or Global Privacy Control are not counted. */
(function () {
  'use strict';
  try {
    var qs = new URLSearchParams(location.search);
    count(qs);
    untag(qs);
  } catch (e) { /* statistics must never break the page */ }

  function count(qs) {
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
    if (/^\/dashboard/.test(location.pathname) || location.protocol !== 'https:') return;
    if (navigator.webdriver) return;

    var ref = document.referrer || '';
    var refHost = '';
    try { refHost = ref ? new URL(ref).hostname : ''; } catch (e) { refHost = ''; }
    var entry = !refHost || refHost !== location.hostname; // first page of this visit
    var body = JSON.stringify({
      p: location.pathname,
      e: entry ? 1 : 0,
      r: entry && refHost ? 'https://' + refHost + '/' : '', // host only, never the full referring URL
      us: entry ? (qs.get('utm_source') || qs.get('ref') || '') : '',
      uc: entry ? (qs.get('utm_campaign') || '') : ''
    });
    var url = 'https://crm-api.bmorris0565.workers.dev/api/public/pageview';
    var send = function () {
      if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }))) return;
      fetch(url, { method: 'POST', body: body, keepalive: true, mode: 'no-cors', headers: { 'Content-Type': 'text/plain' } }).catch(function () {});
    };
    // Pages opened in a background tab count when first shown (prerendered pages never seen don't count)
    if (document.visibilityState === 'visible') send();
    else document.addEventListener('visibilitychange', function once() {
      if (document.visibilityState === 'visible') { document.removeEventListener('visibilitychange', once); send(); }
    });
  }

  // Shared links carry utm_* tags. Once the beacon is built, take them out of the address bar, so an
  // address copied from there doesn't credit the next visitors to the same platform. Other parameters
  // (?upgrade=, ?client=, ?ref=) and the #section stay.
  function untag(qs) {
    var keys = [];
    qs.forEach(function (v, k) { if (/^utm_/i.test(k)) keys.push(k); });
    if (!keys.length || !window.history || !history.replaceState) return;
    keys.forEach(function (k) { qs.delete(k); });
    var q = qs.toString();
    history.replaceState(history.state, '', location.pathname + (q ? '?' + q : '') + location.hash);
  }
})();
