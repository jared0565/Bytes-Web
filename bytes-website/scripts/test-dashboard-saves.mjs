// A settings form in the dashboard must not save before its saved values have loaded.
//
// Each of these forms posts every field it shows. If the load failed (a dropped connection, a server
// error), the fields are empty, or still hold the values of the client that was open before. A save
// at that point would replace the stored company name, bot instructions, websites and follow-up
// settings with those wrong values, and the API keeps whatever it is sent.
//
// dashboard/main.js is a browser script, not a module, so this test lifts the load functions and the
// save handlers out of the file and runs them against stand-ins for the page and the API.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'dashboard', 'main.js'), 'utf8');
const lift = (re, what) => { const m = source.match(re); assert.ok(m, `${what} was not found in dashboard/main.js`); return m[0]; };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fn = (name) => lift(new RegExp(`^async function ${name}\\([^)]*\\) \\{\\r?\\n[\\s\\S]*?^\\}`, 'm'), name);
const handler = (head) => lift(new RegExp(`^${esc(head)}\\.addEventListener\\('click', async \\(\\) => \\{\\r?\\n[\\s\\S]*?^\\}\\);`, 'm'), `the ${head} click handler`);
// The line that declares a "has this form loaded" flag, if the file has one
const flag = (name) => (source.match(new RegExp(`^(?:let|const) ${name} = .*$`, 'm')) || [''])[0];

function element() {
  return {
    value: '', checked: false, disabled: false, hidden: false, textContent: '', innerHTML: '', href: '',
    style: {}, dataset: {}, options: [], listeners: {},
    classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
    addEventListener(type, f) { this.listeners[type] = f; },
    focus() {}, before() {}, setAttribute() {}, removeAttribute() {}, toggleAttribute() {},
    closest: () => null, querySelector: () => null, querySelectorAll: () => [],
  };
}

// Runs lifted code in a stand-in page. `fail` lists the address fragments whose GET answers 500.
function page(code, locals, extra = {}) {
  const els = new Map();
  const byId = (id) => { if (!els.has(id)) els.set(id, element()); return els.get(id); };
  const posts = [];
  const state = { fail: [] };
  const apiFetch = async (url, opts = {}) => {
    if (opts.method === 'POST') { posts.push({ url: url.replace('API', ''), body: JSON.parse(opts.body) }); return { ok: true, status: 200, json: async () => ({ success: true }) }; }
    if (state.fail.some(f => url.includes(f))) return { ok: false, status: 500, json: async () => ({ error: 'Server error' }) };
    return { ok: true, status: 200, json: async () => (url.includes('/api/installations') ? { clientId: 'acme', allowedDomains: [] } : {}) };
  };
  const known = {
    API_BASE: 'API', apiFetch, document: { getElementById: byId, querySelectorAll: () => [], querySelector: () => null },
    modelCatalog: null, userRole: 'admin', installationData: {},
    ensureModelCatalog: async () => {}, salesFill: async () => {}, loadChatbotStatus: async () => {},
    salesCollect: () => ({ values: { bookingUrl: '', alertEmail: '' } }), servicesOf: () => [], domainListOf: () => [], siteDomainList: () => [],
    cbMode: (m) => m || 'scripted', mcPlanName: () => 'Free', modelCostHtml: () => '',
    mcbEl: byId, ...extra,
  };
  const scope = new Proxy(known, {
    has: (t, k) => typeof k === 'string' && !locals.includes(k),
    get: (t, k) => (k in t ? t[k] : k in globalThis ? globalThis[k] : (t[k] = typeof k === 'string' && /^(config|whiteLabel|saveConfig)/.test(k) ? element() : () => {})),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  const out = new Function('scope', `with (scope) { ${code}\n return { ${locals.join(', ')} }; }`)(scope);
  return { out, known, byId, posts, state };
}

test('Manage Clients: a client whose settings failed to load is not saved with the previous client\'s values', async () => {
  const p = page(`const MCB = { cid: '', plan: 'free', inTrial: false, loaded: false };\n${fn('mcbLoad')}\n${handler('saveConfigBtn')}`, ['MCB', 'mcbLoad']);
  const save = () => p.known.saveConfigBtn.listeners.click();
  // Control: a client that loaded can be saved
  await p.out.mcbLoad('acme');
  p.known.configCompanyName.value = 'Acme Dental';
  await save();
  assert.equal(p.posts.filter(x => x.url === '/api/config').length, 1, 'a loaded client is saved');
  assert.equal(p.posts[0].body.clientId, 'acme');

  // The next client fails to load: the form still shows Acme's values
  p.posts.length = 0; p.state.fail = ['/api/config'];
  await p.out.mcbLoad('other');
  assert.equal(p.known.configCompanyName.value, 'Acme Dental', 'the form still holds the previous client');
  await save();
  assert.deepEqual(p.posts, [], 'nothing is posted for a client that did not load');
});

test('Manage Clients: a failed load of the campaign settings also blocks the save', async () => {
  const p = page(`const MCB = { cid: '', plan: 'free', inTrial: false, loaded: false };\n${fn('mcbLoad')}\n${handler('saveConfigBtn')}`, ['MCB', 'mcbLoad']);
  p.state.fail = ['/api/crm-settings'];
  await p.out.mcbLoad('acme');
  await p.known.saveConfigBtn.listeners.click();
  assert.deepEqual(p.posts, [], 'campaign mode and auto-approve were never loaded, so they are not overwritten');
});

const clientForms = () => page(
  `${flag('cbFormLoaded')}\n${fn('loadChatbotView')}\n${handler("document.getElementById('settings-save-chatbot-btn')")}\n${handler("document.getElementById('settings-save-campaign-btn')")}`,
  ['loadChatbotView']);

test('Chatbot settings (client): saving works after a good load', async () => {
  const p = clientForms();
  await p.out.loadChatbotView();
  await p.byId('settings-save-chatbot-btn').listeners.click();
  await p.byId('settings-save-campaign-btn').listeners.click();
  assert.deepEqual(p.posts.map(x => x.url).sort(), ['/api/config', '/api/config', '/api/crm-settings']);
});

test('Chatbot settings (client): nothing is saved when the settings did not load', async () => {
  const p = clientForms();
  p.state.fail = ['/api/config'];
  await p.out.loadChatbotView();
  await p.byId('settings-save-chatbot-btn').listeners.click();
  assert.deepEqual(p.posts, [], 'an empty company name and empty instructions are not posted');
  await p.byId('settings-save-campaign-btn').listeners.click();
  assert.deepEqual(p.posts, [], 'empty follow-up settings are not posted');
});

test('Campaign settings (client): nothing is saved when the campaign settings did not load', async () => {
  const p = clientForms();
  p.state.fail = ['/api/crm-settings'];
  await p.out.loadChatbotView();
  await p.byId('settings-save-campaign-btn').listeners.click();
  assert.deepEqual(p.posts, []);
});

const siteForm = () => page(`${flag('siteFormLoaded')}\n${fn('loadSiteSettings')}\n${handler("document.getElementById('site-save-btn')?")}`, ['loadSiteSettings']);

test('Bytes website settings: saving works after a good load, and not after a failed one', async () => {
  let p = siteForm();
  await p.out.loadSiteSettings();
  await p.byId('site-save-btn').listeners.click();
  assert.deepEqual(p.posts.map(x => x.url), ['/api/site-settings'], 'a loaded form is saved');

  p = siteForm();
  p.state.fail = ['/api/site-settings'];
  await p.out.loadSiteSettings();
  await p.byId('site-save-btn').listeners.click();
  assert.deepEqual(p.posts, [], 'an empty website form is not posted');
});
