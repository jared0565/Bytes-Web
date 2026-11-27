// The chat widget must start on a customer's site however the site loads its scripts.
//
// Some sites run scripts late (a script-delaying loader such as Cloudflare's Rocket Loader, a tag
// manager) and still report the page as "loading" when the widget runs, although the page is built
// and the event the widget waited for has already gone by. The widget then never appeared.
// The widget only needs the page's <body>, so it starts as soon as there is one.
//
// Also checked: the send button's icon has a size and colour of its own. Without them it took its
// size from the host page and was drawn black on the accent colour.
//
// widget.js is a browser script, so it is run here against a small stand-in for a page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/widget.js', import.meta.url), 'utf8');

// Runs the widget in a page. Reports whether it began building itself, and lets the test fire the
// "page is ready" event. The config request never answers, so the run stops there.
function load({ readyState, body }) {
  const started = { count: 0 };
  const listeners = [];
  const el = () => ({ style: {}, setAttribute() {}, appendChild() {} });
  const document = {
    readyState,
    currentScript: { getAttribute: () => 'acme' },
    head: { appendChild() { started.count++; } },
    body: body ? { appendChild() {} } : null,
    createElement: el,
    addEventListener(type, f) { if (type === 'DOMContentLoaded') listeners.push(f); },
  };
  const window = { addEventListener(type, f) { if (type === 'DOMContentLoaded') listeners.push(f); } };
  const sandbox = { document, window, URL, console, sessionStorage: { getItem: () => null, setItem() {} }, fetch: () => new Promise(() => {}), setTimeout, clearTimeout };
  vm.runInNewContext(source, sandbox);
  return { started, ready() { document.body = document.body || { appendChild() {} }; document.readyState = 'interactive'; listeners.forEach(f => f()); } };
}

test('starts at once on a finished page', () => {
  assert.equal(load({ readyState: 'complete', body: true }).started.count, 1);
});

test('starts at once when the page is built but still reports "loading" (scripts run late)', () => {
  assert.equal(load({ readyState: 'loading', body: true }).started.count, 1);
});

test('waits for the page when there is no <body> yet, then starts once', () => {
  const page = load({ readyState: 'loading', body: false });
  assert.equal(page.started.count, 0, 'nothing is built before the page has a body');
  page.ready();
  assert.equal(page.started.count, 1);
  page.ready();
  assert.equal(page.started.count, 1, 'a second ready event does not build a second widget');
});

test('the send icon has its own size and colour', () => {
  const rule = source.match(/\.btn-send-chat svg\s*\{([^}]*)\}/);
  assert.ok(rule, 'no style rule for the send icon');
  assert.match(rule[1], /width:\s*20px/);
  assert.match(rule[1], /height:\s*20px/);
  assert.match(rule[1], /fill:\s*currentColor/);
});
