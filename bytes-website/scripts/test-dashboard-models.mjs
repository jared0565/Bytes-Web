// The dashboard's model pickers must never lose a saved choice.
//
// The model list is live and only offers each vendor's newest model, so a saved model drops out of it
// over time. The Manage Clients form saves every field it shows: if the picker fell back to "Default"
// for a model that is no longer listed, the next save of that form, for any reason, would silently
// replace the saved model with the default.
//
// dashboard/main.js is a browser script, not a module, so this test lifts populateModelSelect out of
// the file and runs it against a small stand-in for a <select>.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'dashboard', 'main.js'), 'utf8');
const match = source.match(/^function populateModelSelect\(select, savedValue[^)]*\) \{\r?\n[\s\S]*?^\}/m);
assert.ok(match, 'populateModelSelect was not found in dashboard/main.js');
const fallbackMatch = source.match(/^function pmFillFallback\(select, saved, builtIn\) \{\r?\n[\s\S]*?^\}/m);
assert.ok(fallbackMatch, 'pmFillFallback was not found in dashboard/main.js');

class FakeOption { constructor(text, value) { this.text = text; this.value = value; this.disabled = false; } get textContent() { return this.text; } set textContent(t) { this.text = t; } }
class FakeGroup { constructor() { this.label = ''; this.children = []; } appendChild(o) { this.children.push(o); } }
class FakeSelect {
  constructor() { this.children = []; this.dataset = {}; this.selected = null; }
  set innerHTML(_) { this.children = []; this.selected = null; }
  appendChild(node) { this.children.push(node); if (!this.selected && node instanceof FakeOption) this.selected = node; }
  get options() { return this.children.flatMap(n => n instanceof FakeGroup ? n.children : [n]); }
  // Like a real <select>: a value no option carries selects nothing, and reads back as ''
  set value(v) { this.selected = this.options.find(o => o.value === v) || null; }
  get value() { return this.selected ? this.selected.value : ''; }
}

const catalog = {
  defaultModel: 'house-default',
  models: [
    { id: 'house-default', name: 'House Default', providerName: 'House', inputPrice: 1, outputPrice: 2, available: true },
    { id: 'route:vendor/newest', name: 'Vendor Newest', providerName: 'Route', inputPrice: 3, outputPrice: 4, available: true },
    { id: 'route:other/no-key', name: 'Other', providerName: 'Route', inputPrice: 3, outputPrice: 4, available: false },
  ],
};

function lift() {
  return new Function('modelCatalog', 'document', 'Option', 'formatPrice', `${match[0]}\n${fallbackMatch[0]}; return { populate: populateModelSelect, fillFallback: pmFillFallback };`)(
    catalog, { createElement: () => new FakeGroup() }, FakeOption, (n) => `$${n}`);
}
function fill(savedValue, ...rest) {
  const select = new FakeSelect();
  lift().populate(select, savedValue, ...rest);
  return select;
}
function fillFallback(saved) {
  const select = new FakeSelect();
  lift().fillFallback(select, saved, 'Built-in: House Backup');
  return select;
}

test('a listed saved model is selected', () => {
  const select = fill('route:vendor/newest');
  assert.equal(select.value, 'route:vendor/newest');
  assert.equal(select.dataset.filled, '1');
});

test('no saved model selects the default entry', () => {
  for (const saved of ['', undefined, null]) assert.equal(fill(saved).value, '');
});

test('a saved model that is no longer listed stays selected, so a save keeps it', () => {
  const select = fill('route:vendor/older');
  assert.equal(select.value, 'route:vendor/older');
  const kept = select.options.filter(o => o.value === 'route:vendor/older');
  assert.equal(kept.length, 1);
  assert.match(kept[0].text, /no longer listed/);
  assert.equal(kept[0].disabled, false);
});

test('the default entry stays first, whatever is saved', () => {
  for (const saved of ['', 'route:vendor/newest', 'route:vendor/older']) assert.equal(fill(saved).options[0].value, '');
});

test('a price that is due a check is marked in the list', () => {
  catalog.models.push({ id: 'house-old-price', name: 'Old Price', providerName: 'House', inputPrice: 1, outputPrice: 2, available: true, priceStale: true });
  const options = fill('').options;
  catalog.models.pop();
  assert.match(options.find(o => o.value === 'house-old-price').text, /price not checked recently/);
  assert.doesNotMatch(options.find(o => o.value === 'house-default').text, /not checked/);
});

test('a listed model is never added twice', () => {
  const select = fill('route:other/no-key');
  assert.equal(select.options.filter(o => o.value === 'route:other/no-key').length, 1);
  assert.equal(select.value, 'route:other/no-key');
});

// One format for every picker. A fallback picker lists fewer models (direct supplier models that are
// not premium), and nothing else about it differs.
test('a picker given its own list shows only those models, in the same format', () => {
  const select = fill('', [catalog.models[0]]);
  assert.deepEqual(select.options.map(o => o.value), ['', 'house-default']);
  assert.equal(select.options[1].text, 'House Default: $1 in / $2 out per 1M tokens');
});

test('a fallback picker lists only the fallback models, grouped and priced like every other picker', () => {
  catalog.fallbackModels = [{ id: 'house-default', name: 'House Default', providerName: 'House', inputPrice: 1, outputPrice: 2, available: true }];
  const select = fillFallback('');
  assert.deepEqual(select.options.map(o => o.value), ['', 'house-default']);
  assert.equal(select.options[0].text, 'Built-in: House Backup');
  assert.equal(select.options[1].text, 'House Default: $1 in / $2 out per 1M tokens');
  assert.deepEqual(select.children.filter(n => n instanceof FakeGroup).map(g => g.label), ['House']);
  assert.equal(select.value, '');
});

test('a fallback picker carries the same marks as the main list', () => {
  catalog.models.push({ id: 'house-old-price', name: 'Old Price', providerName: 'House', inputPrice: 1, outputPrice: 2, available: false, priceStale: true });
  catalog.fallbackModels = [{ id: 'house-old-price', name: 'Old Price', providerName: 'House', inputPrice: 1, outputPrice: 2, available: false }];
  const opt = fillFallback('').options[1];
  catalog.models.pop();
  assert.match(opt.text, /price not checked recently/);
  assert.match(opt.text, /no API key/);
  assert.equal(opt.disabled, true);
});

test('a saved fallback that has left the list stays selected, worded like every other picker', () => {
  catalog.fallbackModels = [{ id: 'house-default', name: 'House Default', providerName: 'House', inputPrice: 1, outputPrice: 2, available: true }];
  const select = fillFallback('house-gone');
  assert.equal(select.value, 'house-gone');
  assert.match(select.options.find(o => o.value === 'house-gone').text, /no longer listed/);
  assert.equal(select.dataset.saved, 'house-gone');
});

test('every model picker has a cost line under it', () => {
  const page = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'dashboard', 'index.html'), 'utf8');
  for (const id of ['config-llm-model', 'settings-llm-model', 'site-llm-model', 'pm-chat-default', 'pm-chat-fallback', 'pm-email-default', 'pm-email-fallback']) {
    assert.ok(page.includes(`id="${id.replace(/-model$/, '')}-cost"`) || page.includes(`id="${id}-cost"`), `${id} has no cost line`);
  }
  for (const id of ['draft-model', 'read-model']) assert.ok(source.includes('id="${p}-' + id + '-cost"'), `the ${id} picker has no cost line`);
});

test('a price nobody has verified is marked in the list', () => {
  catalog.models.push({ id: 'house-new', name: 'New One', providerName: 'House', inputPrice: 1, outputPrice: 2, available: true, priceUnverified: true });
  const options = fill('').options;
  catalog.models.pop();
  assert.match(options.find(o => o.value === 'house-new').text, /price not verified/);
  assert.doesNotMatch(options.find(o => o.value === 'house-default').text, /not verified/);
});
