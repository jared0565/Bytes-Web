// Checks the consent logic in public/consent.js in a stubbed browser.
//
// The site sets no analytics or marketing cookies, so the consent file is the only thing that
// could grant a tag permission to store. Two things matter: a visitor's own saved choice is
// honoured, and a cookie that someone else planted is not.
//
// Run by "npm run build", and so by the deploy workflow.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/consent.js', import.meta.url), 'utf8');
let failures = 0;
const ok = (l, c, x = '') => { if (!c) failures++; console.log(c ? 'PASS' : 'FAIL', l, x); };

// A storage that works, and one that is blocked (Safari in private mode, a locked-down browser)
const workingStorage = (data = {}) => ({
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: k => { delete data[k]; },
});
const blockedStorage = () => ({
    getItem: () => { throw new Error('storage blocked'); },
    setItem: () => { throw new Error('storage blocked'); },
    removeItem: () => { throw new Error('storage blocked'); },
});

function loadConsent({ storage, cookie = '', protocol = 'https:' }) {
    let jar = cookie;
    const writes = [];
    const element = () => {
        const el = {
            classList: { add() {}, remove() {}, toggle() {} },
            addEventListener() {}, removeEventListener() {}, appendChild() {}, insertBefore() {},
            querySelector: () => element(), setAttribute() {}, getAttribute: () => null, closest: () => null,
            focus() {}, contains: () => false, hidden: true, textContent: '', innerHTML: '', checked: false,
        };
        return el;
    };
    const document = {
        readyState: 'complete',
        get cookie() { return jar; },
        set cookie(v) { jar = v; writes.push(v); },
        head: { appendChild() {} },
        body: { insertBefore() {}, firstChild: null },
        documentElement: { classList: { add() {}, remove() {}, toggle() {} } },
        createElement: element,
        addEventListener() {},
        querySelector: () => null,
    };
    const window = {
        dataLayer: [],
        gtag() {},
        addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
        setTimeout: () => 0, clearTimeout: () => {}, requestAnimationFrame: () => 0,
        localStorage: storage,
        navigator: { globalPrivacyControl: false },
        location: { protocol, href: 'https://web.bytesfx.com/' },
        document,
        CustomEvent: class { constructor(type, opts) { this.type = type; this.detail = opts && opts.detail; } },
    };
    window.window = window;
    vm.runInContext(source, vm.createContext(window));
    return { window, writes, get cookie() { return jar; } };
}

// 1. A cookie planted by someone else grants nothing while storage works
const planted = loadConsent({ storage: workingStorage(), cookie: '__Host-bfx_consent=am-2' });
ok('a planted cookie grants no consent while storage works', planted.window.BytesConsent.get() === null, JSON.stringify(planted.window.BytesConsent.get()));

// 2. The same cookie is the fallback when storage is blocked
const blocked = loadConsent({ storage: blockedStorage(), cookie: '__Host-bfx_consent=am-2' });
const fallback = blocked.window.BytesConsent.get();
ok('the cookie is the fallback when storage is blocked', !!fallback && fallback.analytics === true && fallback.marketing === true, JSON.stringify(fallback));

// 2b. A cookie under the plain name is ignored even when storage is blocked: only the __Host-
//     name can be set by this host, so another bytesfx.com host cannot plant one
const plain = loadConsent({ storage: blockedStorage(), cookie: 'bfx_consent=am-2' });
ok('a cookie under the plain name is ignored', plain.window.BytesConsent.get() === null, JSON.stringify(plain.window.BytesConsent.get()));

// 3. A visitor's own saved choice is honoured
const saved = loadConsent({ storage: workingStorage({ bfx_consent: JSON.stringify({ v: 2, ts: Date.now(), analytics: true, marketing: false }) }) });
const kept = saved.window.BytesConsent.get();
ok('a saved choice is honoured', !!kept && kept.analytics === true && kept.marketing === false, JSON.stringify(kept));

// 4. On https the fallback cookie carries the __Host- prefix, so only this host can set it
const savedThenReset = loadConsent({ storage: workingStorage({ bfx_consent: JSON.stringify({ v: 2, ts: Date.now(), analytics: true, marketing: false }) }) });
savedThenReset.window.BytesConsent.reset();
ok('the fallback cookie uses the __Host- prefix on https', savedThenReset.writes.some(w => /^__Host-bfx_consent=/.test(w)), savedThenReset.writes.join(' | '));
const onHttp = loadConsent({ storage: workingStorage(), cookie: '', protocol: 'http:' });
onHttp.window.BytesConsent.reset();
ok('on http the cookie keeps its plain name', onHttp.writes.some(w => /^bfx_consent=/.test(w)) && !onHttp.writes.some(w => /__Host-/.test(w)), onHttp.writes.join(' | '));

// 5. The build stops when a check fails
process.exit(failures ? 1 : 0);

