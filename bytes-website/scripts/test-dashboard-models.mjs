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
const match = source.match(/^function populateModelSelect\(select, savedValue\) \{\r?\n[\s\S]*?^\}/m);
assert.ok(match, 'populateModelSelect was not found in dashboard/main.js');

class FakeOption { constructor(text, value) { this.text = text; this.value = value; this.disabled = false; } }
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

function fill(savedValue) {
  const populate = new Function('modelCatalog', 'document', 'Option', 'formatPrice', `${match[0]}; return populateModelSelect;`)(
    catalog, { createElement: () => new FakeGroup() }, FakeOption, (n) => `$${n}`);
  const select = new FakeSelect();
  populate(select, savedValue);
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

test('a listed model is never added twice', () => {
  const select = fill('route:other/no-key');
  assert.equal(select.options.filter(o => o.value === 'route:other/no-key').length, 1);
  assert.equal(select.value, 'route:other/no-key');
});
