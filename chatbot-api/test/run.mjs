// Bundles src/index.ts with esbuild (comes with wrangler) and runs the chatbot-api checks.
//   node test/run.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const build = join(here, '.build');
mkdirSync(build, { recursive: true });
const out = join(build, 'bundle.mjs');
// Paths relative to cwd (chatbot-api/): on Windows the arguments reach a shell unquoted, so a space in the repo path would split them.
execFileSync('npx', ['esbuild', 'src/index.ts', '--bundle', '--format=esm', '--platform=node',
    '--external:cloudflare:workers', '--outfile=test/.build/bundle.mjs', '--log-level=error'], { cwd: join(here, '..'), stdio: 'inherit', shell: process.platform === 'win32' });
writeFileSync(out, readFileSync(out, 'utf8').replace(/from "cloudflare:workers"/g, 'from "./cfw.mjs"'));
writeFileSync(join(build, 'cfw.mjs'), 'export class WorkerEntrypoint {}\n');
let bad = 0;
for (const f of readdirSync(here).filter(f => f.endsWith('.mjs') && f !== 'run.mjs')) {
    writeFileSync(join(build, f), readFileSync(join(here, f), 'utf8'));
    const res = execFileSync(process.execPath, [join(build, f)], { cwd: build, encoding: 'utf8' });
    const fails = (res.match(/^FAIL/gm) || []).length; bad += fails;
    console.log(`${fails ? '✗' : '✓'} ${f}: ${(res.match(/^PASS/gm) || []).length} passed, ${fails} failed`);
}
process.exit(bad ? 1 : 0);
