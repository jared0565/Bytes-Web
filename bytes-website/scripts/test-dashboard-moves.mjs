// The line the dashboard shows under a model picker when the chatbot server answers a saved model
// with the newer version of its line (the catalog's `moves`).
//
// dashboard/main.js is a browser script, not a module, so this test copies modelMoveNote and
// formatPrice into a module file of its own and imports that.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'dashboard', 'main.js'), 'utf8');
const fn = source.match(/^function modelMoveNote\(moves, id\) \{\r?\n[\s\S]*?^\}/m);
assert.ok(fn, 'modelMoveNote was not found in dashboard/main.js');
const priceLine = source.match(/^const formatPrice = .*$/m);
assert.ok(priceLine, 'formatPrice was not found in dashboard/main.js');
const dir = mkdtempSync(join(tmpdir(), 'dashboard-moves-'));
const file = join(dir, 'lifted.mjs');
writeFileSync(file, `${priceLine[0]}\nexport ${fn[0]}\n`);
const { modelMoveNote } = await import(pathToFileURL(file).href);
rmSync(dir, { recursive: true, force: true });

const moves = [
  { from: 'gpt-6.1-sol', to: 'gpt-6.2-sol', name: 'GPT-6.2 Sol', inputPrice: 2, outputPrice: 10 },
  { from: 'claude-haiku-5-5', to: 'claude-haiku-5-6', name: 'Claude Haiku 5.6', inputPrice: 0.12, outputPrice: 0.6 },
];

test('a saved model that has moved names the newer version and its price', () => {
  assert.equal(modelMoveNote(moves, 'gpt-6.1-sol').text, 'The newer version of this model, GPT-6.2 Sol, now answers in its place: $2.00 in / $10.00 out per 1M tokens.');
});

test('a model that has not moved gets no line', () => {
  assert.equal(modelMoveNote(moves, 'gpt-6-luna'), null);
});

test('the empty choice (the default) gets no line', () => {
  assert.equal(modelMoveNote(moves, ''), null);
});

test('a catalog with no moves gets no line', () => {
  assert.equal(modelMoveNote(undefined, 'gpt-6.1-sol'), null);
  assert.equal(modelMoveNote([], 'gpt-6.1-sol'), null);
});

test('the line carries no em dash', () => {
  assert.ok(!modelMoveNote(moves, 'claude-haiku-5-5').text.includes('—'));
});

test('the cost line under a picker shows it, also for a saved model the list no longer holds', () => {
  const html = source.match(/^function modelCostHtml\(id\) \{\r?\n[\s\S]*?^\}/m);
  assert.ok(html, 'modelCostHtml was not found in dashboard/main.js');
  assert.match(html[0], /modelMoveNote\(modelCatalog\.moves, id\)/);
  assert.match(html[0], /if \(!m\) return moved;/);
});
