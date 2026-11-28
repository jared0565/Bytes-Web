// The lines the dashboard shows under a model picker about a price: where it came from, whether it
// is due a check, an announced change, a long-prompt price, and a difference from OpenRouter.
//
// dashboard/main.js is a browser script, not a module, so this test lifts modelPriceNotes out of the
// file and runs it on its own.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'dashboard', 'main.js'), 'utf8');
const match = source.match(/^function modelPriceNotes\(m\) \{\r?\n[\s\S]*?^\}/m);
assert.ok(match, 'modelPriceNotes was not found in dashboard/main.js');
const priceLine = source.match(/^const formatPrice = .*$/m);
assert.ok(priceLine, 'formatPrice was not found in dashboard/main.js');
const { notes, formatPrice } = new Function(`${priceLine[0]}\n${match[0]}; return { notes: modelPriceNotes, formatPrice };`)();
const texts = (m) => notes(m).map(n => n.text);

const base = { id: 'gemini-4-carbon', provider: 'google', providerName: 'Google', inputPrice: 2, outputPrice: 10, premium: false, priceRead: '2026-11-28', priceStale: false };

test('no model gives no notes', () => {
  assert.deepEqual(notes(undefined), []);
});

test('an OpenRouter model says its price is live', () => {
  assert.deepEqual(texts({ id: 'openrouter:x/y', provider: 'openrouter', providerName: 'OpenRouter', inputPrice: 1, outputPrice: 2 }), ['Live OpenRouter price.']);
});

test('a direct model says whose pricing page the price is from and the day it was read', () => {
  const n = notes(base);
  assert.equal(n.length, 1);
  assert.equal(n[0].text, "Price from Google's pricing page, read 28 November 2026.");
  assert.ok(!n[0].warn);
});

test('a price read too long ago is a warning that names the day', () => {
  const n = notes({ ...base, priceStale: true });
  assert.equal(n[0].text, "Price not checked since 28 November 2026. It may have changed on Google's pricing page.");
  assert.equal(n[0].warn, true);
});

test('an announced rise shows the new price and its date, as a warning', () => {
  const n = notes({ ...base, priceChange: { from: '2026-12-01', inputPrice: 4, outputPrice: 20, premium: true } });
  assert.equal(n[1].text, 'Rises to $4.00 in / $20.00 out on 1 December 2026, and becomes an AI Plus model.');
  assert.equal(n[1].warn, true);
});

test('a rise that stays below premium does not mention AI Plus', () => {
  const t = texts({ ...base, inputPrice: 0.75, outputPrice: 3.75, priceChange: { from: '2027-01-01', inputPrice: 1.5, outputPrice: 7.5, premium: false } });
  assert.equal(t[1], 'Rises to $1.50 in / $7.50 out on 1 January 2027.');
});

test('a model that is already premium does not say it becomes one', () => {
  const t = texts({ ...base, premium: true, priceChange: { from: '2026-12-01', inputPrice: 4, outputPrice: 20, premium: true } });
  assert.equal(t[1], 'Rises to $4.00 in / $20.00 out on 1 December 2026.');
});

test('an announced cut is not called a rise', () => {
  const t = texts({ ...base, priceChange: { from: '2026-12-01', inputPrice: 1, outputPrice: 5, premium: false } });
  assert.equal(t[1], 'Changes to $1.00 in / $5.00 out on 1 December 2026.');
});

test('a long-prompt price is shown with its threshold', () => {
  const t = texts({ ...base, longPrompt: { over: 100000, inputPrice: 0.5, outputPrice: 2.5 } });
  assert.equal(t[1], 'Prompts over 100,000 tokens cost $0.50 in / $2.50 out.');
});

test("a difference from OpenRouter shows OpenRouter's price", () => {
  const t = texts({ ...base, routedPrice: { inputPrice: 0.825, outputPrice: 4.125 } });
  assert.equal(t[1], 'OpenRouter lists $0.825 in / $4.125 out for this model.');
});

test('a price is shown to the cent, or to a third decimal where it has one', () => {
  assert.deepEqual([2, 0.75, 0.1, 0.3, 12, 0.825, 4.125, 0.05, 0.075].map(formatPrice), ['$2.00', '$0.75', '$0.10', '$0.30', '$12.00', '$0.825', '$4.125', '$0.050', '$0.075']);
});

test('the notes come in a fixed order: source, change, long prompts, OpenRouter', () => {
  const t = texts({ ...base, priceChange: { from: '2026-12-01', inputPrice: 4, outputPrice: 20, premium: false }, longPrompt: { over: 200000, inputPrice: 4, outputPrice: 18 }, routedPrice: { inputPrice: 3, outputPrice: 15 } });
  assert.equal(t.length, 4);
  assert.match(t[0], /^Price from/); assert.match(t[1], /^Rises to/); assert.match(t[2], /^Prompts over 200,000/); assert.match(t[3], /^OpenRouter lists/);
});

test('no note carries an em dash', () => {
  const all = texts({ ...base, priceStale: true, priceChange: { from: '2026-12-01', inputPrice: 4, outputPrice: 20, premium: true }, longPrompt: { over: 200000, inputPrice: 4, outputPrice: 18 }, routedPrice: { inputPrice: 3, outputPrice: 15 } }).join(' ');
  assert.ok(!all.includes('—'));
});

// A model that listed itself has OpenRouter's price, which nobody has checked on the supplier's page
const unverified = { id: 'gpt-7-nova', provider: 'openai', providerName: 'OpenAI', inputPrice: 3, outputPrice: 9, premium: false, priceStale: false, priceUnverified: true };

test('an unverified price says where it came from and that it is not checked, as a warning', () => {
  const n = notes(unverified);
  assert.equal(n.length, 1);
  assert.equal(n[0].text, "Price from OpenRouter. Not yet checked on OpenAI's pricing page.");
  assert.equal(n[0].warn, true);
});

test('a verified price is not called unverified', () => {
  assert.doesNotMatch(texts(base).join(' '), /Not yet checked/);
});
