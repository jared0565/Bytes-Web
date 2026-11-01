/* Bytes website visit statistics — cookieless.
 * Sends one small beacon per page view: the page path, where the visit came from (on the
 * first page of a visit) and any utm_source / utm_campaign. A tag the visitor arrived with goes
 * along on the links they follow here, so a sign-up can say where it came from. Nothing is stored
 * in the browser, and visitors who send Do Not Track or Global Privacy Control are not counted. */
(function () {
  'use strict';
  var qs;
  try { qs = new URLSearchParams(location.search); } catch (e) { return; }
  // Each part on its own, so one failing never stops the others (statistics must never break the page)
  [count, carry, untag].forEach(function (f) { try { f(qs); } catch (e) {} });

  function optedOut() {
    return navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  }

  function count(qs) {
    if (optedOut()) return;
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

  // A visitor who arrived from a tagged link (an ad's utm_source / utm_campaign, or a badge's ?ref=)
  // keeps the tag on each link to another page of this site they open, up to the sign-up page, which
  // sends it with the sign-up. The tag is read now, before untag() clears the address bar, and lives
  // only in this page. Links that already carry a tag, the dashboard, downloads and other sites are
  // left alone, and so are links within this page (a tag would turn a jump to #pricing into a reload).
  function carry(qs) {
    if (optedOut()) return;
    var tags = [];
    ['utm_source', 'utm_campaign', 'ref'].forEach(function (k) { var v = qs.get(k); if (v) tags.push([k, v]); });
    if (!tags.length) return;
    var tag = function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || a.hasAttribute('download')) return;
      var u;
      try { u = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
      if (u.origin !== location.origin || u.pathname === location.pathname || /^\/dashboard/.test(u.pathname)) return;
      if (tags.some(function (t) { return u.searchParams.has(t[0]); })) return;
      tags.forEach(function (t) { u.searchParams.set(t[0], t[1]); });
      a.href = u.href;
    };
    document.addEventListener('click', tag, true);
    document.addEventListener('auxclick', tag, true);
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
