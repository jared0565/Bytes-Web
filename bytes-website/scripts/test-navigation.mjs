// Regression checks for the disclosure navigation shared by both marketing pages.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8').replace(/^export /gm, '');

function setup({ mobile = true, missing = false } = {}) {
  const events = () => {
    const listeners = new Map();
    return {
      addEventListener(type, fn) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(fn);
      },
      emit(type, event = {}) { for (const fn of listeners.get(type) || []) fn(event); },
    };
  };
  const element = () => {
    const classes = new Set(), attrs = new Map();
    return {
      ...events(), inert: false,
      classList: {
        contains: name => classes.has(name),
        remove: name => classes.delete(name),
        toggle(name, force) {
          const on = force ?? !classes.has(name);
          if (on) classes.add(name); else classes.delete(name);
          return on;
        },
      },
      setAttribute: (name, value) => attrs.set(name, String(value)),
      getAttribute: name => attrs.get(name) ?? null,
    };
  };
  const button = element(), nav = element();
  nav.id = 'navLinks';
  const link = { closest: selector => selector === 'a' ? link : null };
  const outside = {};
  button.contains = el => el === button;
  nav.contains = el => el === nav || el === link;
  const document = {
    ...events(), activeElement: outside,
    getElementById: id => missing ? null : id === 'mobileMenuBtn' ? button : nav,
  };
  button.focus = () => { document.activeElement = button; };
  const media = { ...events(), matches: mobile };
  const window = { ...events(), matchMedia: () => media };
  vm.runInNewContext(`${source}\ninitMobileMenu();`, { document, window });
  return { button, nav, link, outside, document, window, media };
}

test('closed mobile navigation is inert and announces its relationship and state', () => {
  const { button, nav } = setup();
  assert.equal(button.getAttribute('aria-controls'), 'navLinks');
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.equal(nav.inert, true);
  button.emit('click');
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.equal(nav.inert, false);
  assert.equal(nav.classList.contains('active'), true);
});

test('Escape closes an open menu and returns focus to its trigger', () => {
  const { button, nav, link, document } = setup();
  button.emit('click');
  document.activeElement = link;
  let prevented = false;
  document.emit('keydown', { key: 'Escape', preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(document.activeElement, button);
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.equal(nav.inert, true);
  assert.equal(nav.classList.contains('active'), false);
});

test('link, outside-click, outside-focus and hash navigation synchronize the closed state', () => {
  for (const action of ['link', 'outside-click', 'outside-focus', 'hash']) {
    const { button, nav, link, outside, document, window } = setup();
    button.emit('click');
    if (action === 'link') nav.emit('click', { target: link });
    if (action === 'outside-click') document.emit('click', { target: outside });
    if (action === 'outside-focus') document.emit('focusin', { target: outside });
    if (action === 'hash') window.emit('hashchange');
    assert.equal(button.getAttribute('aria-expanded'), 'false', action);
    assert.equal(nav.inert, true, action);
    assert.equal(nav.classList.contains('active'), false, action);
  }
});

test('desktop navigation stays usable, including after a mobile breakpoint change', () => {
  const { button, nav, media } = setup({ mobile: false });
  assert.equal(nav.inert, false);
  media.matches = true;
  media.emit('change');
  assert.equal(nav.inert, true);
  button.emit('click');
  media.matches = false;
  media.emit('change');
  assert.equal(nav.inert, false);
  assert.equal(nav.classList.contains('active'), false);
  assert.equal(button.getAttribute('aria-expanded'), 'false');
});

test('a page without these navigation elements can initialize safely', () => {
  assert.doesNotThrow(() => setup({ missing: true }));
});
