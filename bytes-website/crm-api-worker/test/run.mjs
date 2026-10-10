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
    + '\nexport { signJWT, app as __app, generateOAuthState };\n');
writeFileSync(join(build, 'package.json'), '{"type":"module"}');

const all = readdirSync(here).filter(f => f.endsWith('.mjs') && f !== 'run.mjs').map(f => f.slice(0, -4));
const want = process.argv.slice(2).length ? process.argv.slice(2) : all;
let failed = 0;
for (const name of want) {
    cpSync(join(here, `${name}.mjs`), join(build, `${name}.mjs`));
    let out = '';
    try { out = execFileSync(process.execPath, [join(build, `${name}.mjs`)], { cwd: build, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { out = (e.stdout || '') + (e.stderr || ''); failed++; }
    const pass = (out.match(/^PASS/gm) || []).length, fail = (out.match(/^FAIL/gm) || []).length;
    failed += fail ? 1 : 0;
    console.log(`${fail ? '✗' : '✓'} ${name}: ${pass} passed, ${fail} failed`);
    if (fail) out.split('\n').filter(l => l.startsWith('FAIL')).forEach(l => console.log('   ' + l));
}
process.exit(failed ? 1 : 0);
