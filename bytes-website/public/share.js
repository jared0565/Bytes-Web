/* BytesFX share dialog + footer social links. Self-contained: injects its own CSS.
   - Any [data-share] element opens the dialog: QR code for the page, copy link, share targets,
     native share sheet where supported, and a PNG download of the QR.
   - Any [data-social-links] element is filled with the profile links below (empty URLs are skipped).
   Shared links carry UTM tags so analytics can tell which channel (or a QR scan) brought the visit. */
(function () {
  'use strict';

  // Company profiles shown in the footer. Leave a URL empty to hide that icon.
  var SOCIALS = [
    { id: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/fbmacagba/' },
    { id: 'facebook', label: 'Facebook', url: '' },
    { id: 'instagram', label: 'Instagram', url: '' },
    { id: 'pinterest', label: 'Pinterest', url: '' },
  ];

  var SITE_NAME = 'BytesFX';
  var SHARE_TEXT = 'BytesFX builds websites, apps and AI chatbots that turn visitors into customers.';

  var ICONS = {
    share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/>',
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 10.5V17M8 7.25v.01M12 17v-6.5M12 13.5a2.5 2.5 0 0 1 5 0V17"/>',
    facebook: '<path d="M15 3.5h-2a4 4 0 0 0-4 4V10H7v3.5h2V21h3.5v-7.5h2.5l.5-3.5h-3V8a1 1 0 0 1 1-1h1.5z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5v.01"/>',
    pinterest: '<circle cx="12" cy="12" r="9"/><path d="M10.5 20.5l1.8-7.4"/><path d="M9.2 13.4c-.5-.6-.7-1.3-.7-2.1 0-2.4 2-4.3 4.4-4.3 2.3 0 3.8 1.5 3.8 3.6 0 2.4-1.3 4.2-3.1 4.2-.9 0-1.6-.7-1.4-1.6.3-1 .8-2.1.8-2.9"/>',
    x: '<path d="M4 4l16 16M20 4L4 20"/>',
    whatsapp: '<path d="M3.5 20.5l1.3-4A8.5 8.5 0 1 1 8 19.6z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
  };

  function icon(name) {
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
  }

  function pageUrl(source, medium) {
    var u = new URL(location.origin + location.pathname);
    u.searchParams.set('utm_source', source);
    u.searchParams.set('utm_medium', medium || 'social');
    u.searchParams.set('utm_campaign', 'share');
    return u.toString();
  }
  function cleanUrl() { return location.origin + location.pathname; }
  function pageTitle() { return (document.title || SITE_NAME).split('|')[0].trim() || SITE_NAME; }

  function track(method) {
    // GA4 "share" event when analytics is present (Consent Mode decides what is stored)
    try { if (typeof window.gtag === 'function') window.gtag('event', 'share', { method: method, content_type: 'page', item_id: location.pathname }); } catch (e) {}
  }

  var TARGETS = [
    { id: 'linkedin', label: 'LinkedIn', href: function () { return 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(pageUrl('linkedin')); } },
    { id: 'facebook', label: 'Facebook', href: function () { return 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(pageUrl('facebook')); } },
    { id: 'x', label: 'X', href: function () { return 'https://x.com/intent/post?url=' + encodeURIComponent(pageUrl('x')) + '&text=' + encodeURIComponent(SHARE_TEXT); } },
    { id: 'whatsapp', label: 'WhatsApp', href: function () { return 'https://wa.me/?text=' + encodeURIComponent(SHARE_TEXT + ' ' + pageUrl('whatsapp')); } },
    { id: 'email', label: 'Email', href: function () { return 'mailto:?subject=' + encodeURIComponent(pageTitle()) + '&body=' + encodeURIComponent(SHARE_TEXT + '\n\n' + pageUrl('email', 'email')); } },
  ];

  var CSS = '' +
    '.bs-dialog{--bs-bg:#0b1a1f;--bs-bg2:#102429;--bs-line:rgba(155,214,205,.2);--bs-text:#eaf2ef;--bs-dim:#9db3ae;--bs-amber:#ffb547;' +
    'position:fixed;inset:0;margin:auto;height:fit-content;width:min(560px,calc(100vw - 24px));max-height:calc(100dvh - 24px);padding:0;border:1px solid var(--bs-line);border-radius:22px;color:var(--bs-text);background:var(--bs-bg);' +
    'font:400 15px/1.55 Geist,"Segoe UI",system-ui,sans-serif;box-shadow:0 1px 0 rgba(255,255,255,.05) inset,0 40px 80px -30px rgba(0,8,10,.9),0 0 80px -40px rgba(255,181,71,.4);overflow:auto}' +
    '.bs-dialog::backdrop{background:rgba(4,10,12,.7);backdrop-filter:blur(4px)}' +
    '.bs-dialog[open]{animation:bs-in .45s cubic-bezier(.34,1.56,.64,1)}' +
    '@keyframes bs-in{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}' +
    '.bs-dialog *{box-sizing:border-box}' +
    '.bs-inner{padding:24px}' +
    '.bs-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:18px}' +
    '.bs-head h2{margin:0;font:650 22px/1.2 "Bricolage Grotesque","Segoe UI",system-ui,sans-serif;letter-spacing:-.02em;color:var(--bs-text)}' +
    '.bs-head p{margin:4px 0 0;color:var(--bs-dim);font-size:14px}' +
    '.bs-icon-btn{appearance:none;display:grid;place-items:center;width:38px;height:38px;flex:none;border-radius:12px;border:1px solid var(--bs-line);background:var(--bs-bg2);color:var(--bs-text);cursor:pointer;' +
    'transition:transform .3s cubic-bezier(.34,1.56,.64,1),border-color .2s ease,color .2s ease}' +
    '.bs-icon-btn:hover{border-color:rgba(255,181,71,.5);color:var(--bs-amber)}.bs-icon-btn:active{transform:scale(.94)}' +
    '.bs-body{display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:start}' +
    '.bs-qr{display:grid;justify-items:center;gap:10px}' +
    '.bs-qr-box{width:172px;height:172px;padding:10px;border-radius:16px;background:#fff;box-shadow:0 12px 30px -16px rgba(255,181,71,.5)}' +
    '.bs-qr-box svg{display:block;width:100%;height:100%}' +
    '.bs-qr small{color:var(--bs-dim);font-size:12.5px;text-align:center;max-width:172px}' +
    '.bs-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:999px;padding:9px 14px;font:600 13.5px/1 Geist,"Segoe UI",system-ui,sans-serif;cursor:pointer;' +
    'border:1px solid var(--bs-line);background:var(--bs-bg2);color:var(--bs-text);text-decoration:none;' +
    'transition:transform .3s cubic-bezier(.34,1.56,.64,1),border-color .2s ease,background-color .2s ease,color .2s ease}' +
    '.bs-btn:hover{border-color:rgba(255,181,71,.5);color:var(--bs-amber)}.bs-btn:active{transform:scale(.97)}' +
    '.bs-btn svg{width:16px;height:16px}' +
    '.bs-btn-primary{background:var(--bs-amber);border-color:var(--bs-amber);color:#1f1203}.bs-btn-primary:hover{background:#ffc365;color:#1f1203}' +
    '.bs-label{display:block;font:500 12px/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.04em;color:var(--bs-dim);margin-bottom:8px}' +
    '.bs-copy{display:flex;gap:8px;margin-bottom:18px}' +
    '.bs-copy input{flex:1;min-width:0;padding:10px 12px;border-radius:12px;border:1px solid var(--bs-line);background:#071216;color:var(--bs-text);font:400 13.5px/1.2 Geist,system-ui,sans-serif}' +
    '.bs-copy input:focus{outline:none;border-color:var(--bs-amber)}' +
    '.bs-targets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}' +
    '.bs-target{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;border-radius:14px;border:1px solid var(--bs-line);background:var(--bs-bg2);color:var(--bs-text);' +
    'font:500 12.5px/1.1 Geist,system-ui,sans-serif;text-decoration:none;cursor:pointer;transition:transform .3s cubic-bezier(.34,1.56,.64,1),border-color .2s ease,color .2s ease}' +
    '.bs-target:hover{border-color:rgba(255,181,71,.5);color:var(--bs-amber);transform:translateY(-2px)}.bs-target:active{transform:scale(.96)}' +
    '.bs-dialog :focus-visible{outline:2px solid var(--bs-amber);outline-offset:2px}' +
    '.bs-status{min-height:1.2em;margin:12px 0 0;font-size:13px;color:#57e3bf}' +
    '@media (max-width:520px){.bs-body{grid-template-columns:1fr}.bs-qr{order:2}.bs-inner{padding:18px}}' +
    '@media (prefers-reduced-motion:reduce){.bs-dialog[open]{animation:none}.bs-btn,.bs-target,.bs-icon-btn{transition:none}}' +
    /* trigger + footer socials (inherit the host page's colours) */
    '.bs-trigger{display:inline-flex;align-items:center;gap:7px;cursor:pointer}' +
    '.bs-trigger svg{width:18px;height:18px}' +
    '.bs-socials{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}' +
    '.bs-socials a,.bs-socials button{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;border:1px solid rgba(155,214,205,.2);background:rgba(16,36,41,.6);color:inherit;' +
    'cursor:pointer;transition:transform .3s cubic-bezier(.34,1.56,.64,1),border-color .2s ease,color .2s ease}' +
    '.bs-socials a:hover,.bs-socials button:hover{border-color:rgba(255,181,71,.55);color:#ffb547;transform:translateY(-2px)}' +
    '.bs-socials a:active,.bs-socials button:active{transform:scale(.94)}' +
    '.bs-socials a:focus-visible,.bs-socials button:focus-visible{outline:2px solid #ffb547;outline-offset:3px}';

  var dialog, qrLib;

  function loadQr() {
    if (!qrLib) qrLib = import('/vendor/qrcode.mjs').then(function (m) { return m.default || m.qrcode; });
    return qrLib;
  }

  // QR as an SVG path (one rect per dark module), dark ink on white for reliable scanning
  function qrSvg(qrcode, text) {
    var qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    var n = qr.getModuleCount(), quiet = 2, size = n + quiet * 2, d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) d += 'M' + (c + quiet) + ' ' + (r + quiet) + 'h1v1h-1z';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" shape-rendering="crispEdges" role="img" aria-label="QR code linking to this page">' +
      '<rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#071216"/></svg>';
  }

  function downloadPng(svg) {
    var img = new Image();
    img.onload = function () {
      var px = 1024, canvas = document.createElement('canvas');
      canvas.width = canvas.height = px;
      var ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, px, px);
      var a = document.createElement('a');
      a.download = 'bytesfx-qr' + (location.pathname.replace(/[^a-z0-9]+/gi, '-').replace(/-html$|-$/g, '') || '') + '.png';
      a.href = canvas.toDataURL('image/png');
      document.body.appendChild(a); a.click(); a.remove();
      track('qr_download');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function build() {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'bs-dialog';
    dialog.setAttribute('aria-labelledby', 'bs-title');
    var canNative = typeof navigator.share === 'function';
    dialog.innerHTML =
      '<div class="bs-inner">' +
        '<div class="bs-head"><div><h2 id="bs-title">Share ' + SITE_NAME + '</h2><p>Send this page to someone who needs a site that sells.</p></div>' +
          '<button type="button" class="bs-icon-btn" data-bs="close" aria-label="Close">' + icon('close') + '</button></div>' +
        '<div class="bs-body">' +
          '<div class="bs-qr"><div class="bs-qr-box" id="bs-qr"></div><small>Scan with a phone camera to open this page</small>' +
            '<button type="button" class="bs-btn" data-bs="download">' + icon('download') + 'Download QR</button></div>' +
          '<div>' +
            '<label class="bs-label" for="bs-url">Page link</label>' +
            '<div class="bs-copy"><input id="bs-url" type="text" readonly><button type="button" class="bs-btn bs-btn-primary" data-bs="copy">' + icon('link') + 'Copy</button></div>' +
            '<span class="bs-label">Share to</span>' +
            '<div class="bs-targets">' +
              TARGETS.map(function (t) { return '<a class="bs-target" data-target="' + t.id + '" target="_blank" rel="noopener">' + icon(t.id) + t.label + '</a>'; }).join('') +
              (canNative ? '<button type="button" class="bs-target" data-bs="native">' + icon('more') + 'More…</button>' : '') +
            '</div>' +
            '<p class="bs-status" id="bs-status" role="status"></p>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dialog);

    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) return dialog.close(); // backdrop click
      var t = e.target.closest('[data-target]');
      if (t) { track(t.getAttribute('data-target')); return; }
      var act = e.target.closest('[data-bs]');
      if (!act) return;
      var kind = act.getAttribute('data-bs');
      var status = dialog.querySelector('#bs-status');
      if (kind === 'close') dialog.close();
      else if (kind === 'copy') {
        var input = dialog.querySelector('#bs-url');
        var done = function () { status.textContent = 'Link copied.'; track('copy_link'); };
        try { navigator.clipboard.writeText(input.value).then(done, function () { input.select(); status.textContent = 'Press Ctrl+C to copy.'; }); }
        catch (err) { input.select(); status.textContent = 'Press Ctrl+C to copy.'; }
      } else if (kind === 'native') {
        navigator.share({ title: pageTitle(), text: SHARE_TEXT, url: pageUrl('native_share') }).then(function () { track('native'); }, function () {});
      } else if (kind === 'download') {
        var svg = dialog.querySelector('#bs-qr').innerHTML;
        if (svg) downloadPng(svg);
      }
    });
    return dialog;
  }

  function open() {
    build();
    dialog.querySelector('#bs-url').value = cleanUrl();
    dialog.querySelector('#bs-status').textContent = '';
    TARGETS.forEach(function (t) { dialog.querySelector('[data-target="' + t.id + '"]').href = t.href(); });
    var box = dialog.querySelector('#bs-qr');
    box.innerHTML = '';
    loadQr().then(function (qrcode) { box.innerHTML = qrSvg(qrcode, pageUrl('qr', 'offline')); })
      .catch(function () { box.innerHTML = '<p style="color:#071216;font-size:12px;text-align:center;margin:60px 0 0">QR unavailable</p>'; });
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    track('open');
  }

  function renderSocials() {
    var html = SOCIALS.filter(function (s) { return s.url; }).map(function (s) {
      return '<a href="' + s.url + '" target="_blank" rel="noopener me" aria-label="' + SITE_NAME + ' on ' + s.label + '" title="' + s.label + '">' + icon(s.id) + '</a>';
    }).join('') + '<button type="button" data-share aria-label="Share this page" title="Share">' + icon('share') + '</button>';
    document.querySelectorAll('[data-social-links]').forEach(function (el) { el.classList.add('bs-socials'); el.innerHTML = html; });
  }

  function boot() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    document.querySelectorAll('[data-share]').forEach(function (el) {
      el.classList.add('bs-trigger');
      if (!el.querySelector('svg')) el.insertAdjacentHTML('afterbegin', icon('share'));
    });
    renderSocials();
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-share]');
      if (t) { e.preventDefault(); open(); }
    });
  }

  window.BytesShare = { open: open, socials: SOCIALS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
