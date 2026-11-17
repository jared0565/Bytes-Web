// Editorial contract for the project catalogue and the pages built from it: the vocabulary the
// design spec bans, and the system relationships the two cooperative projects have to name
// explicitly. The static case-study shells are scanned too — their title, description and Open
// Graph copy live in the HTML, outside the catalogue, and that is exactly where a term re-typed
// by hand would survive.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projects } from '../src/showcase-content.js';
import { publishedProjects, projectCardHTML, projectCaseHTML, projectIndexHTML } from '../src/showcase-html.js';

const BANNED = ['seamless','cutting-edge','robust','innovative','delve','leverage','elevate','empower','world-class','next-generation','revolutionary','game-changing'];

const here = dirname(fileURLToPath(import.meta.url));
const shells = join(here, '..', 'projects');
const stripTags = html => html
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ');

const textOf = record => [
  record.title, record.summary, record.problem, record.implementation, record.note,
  record.liveActionLabel, record.imageCaption,
  ...(record.capabilities || []), ...(record.deliveryScope || []), ...(record.walkthrough || []),
  ...(record.sections || []).map(s => s.title + ' ' + s.body),
  ...(record.workflow ? [record.workflow.title, record.workflow.description,
    ...record.workflow.lanes.flatMap(l => [l.title, ...l.steps.flatMap(s => [s.title, s.body])])] : [])
].join(' ').toLowerCase();

test('no published project copy uses a banned filler term', () => {
  for (const p of publishedProjects(projects)) {
    for (const term of BANNED) {
      assert.ok(!textOf(p).includes(term), p.id + ' uses the banned term "' + term + '"');
    }
  }
});

test('the rendered cards, index and case studies are free of banned terms', () => {
  for (const p of publishedProjects(projects)) {
    const html = (projectCardHTML(p) + projectCaseHTML(p)).toLowerCase();
    for (const term of BANNED) {
      assert.ok(!html.includes(term), p.id + ' renders the banned term "' + term + '"');
    }
  }
  const index = projectIndexHTML(projects).toLowerCase();
  for (const term of BANNED) {
    assert.ok(!index.includes(term), 'the work index renders the banned term "' + term + '"');
  }
});

test('the static case-study shells carry no banned filler term', () => {
  for (const p of publishedProjects(projects)) {
    const file = join(shells, p.id, 'index.html');
    assert.ok(existsSync(file), 'no case-study shell for ' + p.id);
    const text = stripTags(readFileSync(file, 'utf8')).toLowerCase();
    for (const term of BANNED) {
      assert.ok(!text.includes(term), p.id + ' shell uses the banned term "' + term + '"');
    }
  }
});

test('the work index shell carries no banned filler term', () => {
  const file = join(shells, 'index.html');
  assert.ok(existsSync(file), 'no work index shell');
  const text = stripTags(readFileSync(file, 'utf8')).toLowerCase();
  for (const term of BANNED) {
    assert.ok(!text.includes(term), 'the work index shell uses the banned term "' + term + '"');
  }
});

test('the Active Paw and PawScout relationship is explicit', () => {
  const p = publishedProjects(projects).find(x => x.id === 'active-paw');
  assert.equal(p.title, 'Active Paw + PawScout');
  const text = textOf(p);
  assert.ok(text.includes('pawscout'), 'PawScout must be named');
  assert.ok(text.includes('shopify'), 'the Shopify theme must be named');
  assert.ok(text.includes('theme'), 'the theme must be named as the storefront');
  assert.ok(text.includes('backend'), 'the backend must be named');
});

test('the Pivot Parlor platform relationship is explicit', () => {
  const p = publishedProjects(projects).find(x => x.id === 'pivot-parlor');
  const text = textOf(p);
  assert.ok(text.includes('multi-tenant'), 'the multi-tenant model must be named');
  assert.ok(text.includes('branded'), 'the branded frontends must be named');
});

test('the two new projects state their own boundaries', () => {
  const medication = publishedProjects(projects).find(x => x.id === 'medication-reminder');
  const shikaku = publishedProjects(projects).find(x => x.id === 'shikaku');
  assert.ok(textOf(medication).includes('not a medical device'), 'Medication Reminder must not read as a medical device');
  assert.ok(textOf(shikaku).includes('no puzzle count'), 'Shikaku must not claim a puzzle count');
});
