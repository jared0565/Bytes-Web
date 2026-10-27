// Runs the crm-api test suites against the current src/ (Node 22.5+ for node:sqlite).
//   node test/run.mjs            all suites
//   node test/run.mjs flow plans just these
// Each suite imports ./src/index.js from a scratch copy in test/.build, where the worker's
// internals are exported and the plans.json import gets the attribute Node needs.
import { cpSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const build = join(here, '.build');
rmSync(build, { recursive: true, force: true });
mkdirSync(join(build, 'src'), { recursive: true });
cpSync(join(here, '..', 'src'), join(build, 'src'), { recursive: true });
const plans = pathToFileURL(join(here, '..', '..', 'public', 'plans.json')).href;
const idx = join(build, 'src', 'index.js');
writeFileSync(idx, readFileSync(idx, 'utf8').replace("from '../../public/plans.json';", `from '${plans}' with { type: 'json' };`)
    + '\nexport { signJWT, app as __app, generateOAuthState };\n'
    // `typeof` on a name the build does not have is safe, so a suite can ask for a helper
    // that only exists in a later commit and report a FAIL rather than crash the module
    + '\nexport const __internals = { enforcePlanLimits: typeof enforcePlanLimits !== "undefined" ? enforcePlanLimits : null };\n');
writeFileSync(join(build, 'package.json'), '{"type":"module"}');

const all = readdirSync(here).filter(f => f.endsWith('.mjs') && f !== 'run.mjs').map(f => f.slice(0, -4));
const want = process.argv.slice(2).length ? process.argv.slice(2) : all;
let failed = 0;
for (const name of want) {
    cpSync(join(here, `${name}.mjs`), join(build, `${name}.mjs`));
    let out = '', crashed = false;
    try { out = execFileSync(process.execPath, [join(build, `${name}.mjs`)], { cwd: build, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { out = (e.stdout || '') + (e.stderr || ''); crashed = true; }
    const pass = (out.match(/^PASS/gm) || []).length, fail = (out.match(/^FAIL/gm) || []).length;
    // A suite that exits with an error, or runs no checks at all, did not pass, even with no FAIL line.
    const why = crashed ? 'crashed' : !pass && !fail ? 'no checks ran' : '';
    const bad = fail || why;
    failed += bad ? 1 : 0;
    console.log(`${bad ? '✗' : '✓'} ${name}: ${pass} passed, ${fail} failed${why ? `, ${why}` : ''}`);
    if (fail) out.split('\n').filter(l => l.startsWith('FAIL')).forEach(l => console.log('   ' + l));
    if (crashed) console.log('   ' + (out.split('\n').find(l => /^\w*Error\b/.test(l)) || out.trim().split('\n').pop() || 'no output'));
}
process.exit(failed ? 1 : 0);
