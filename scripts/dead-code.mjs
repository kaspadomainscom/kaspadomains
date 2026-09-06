// npm run dead:check
//
// Lists source files no entry point can reach.
//
// ## Why this exists as a script rather than a number in a document
//
// The dead-file count in docs/FILES.md was hand-counted with a bare-name grep
// and was wrong twice, in both directions. `grep -rl walletClient` matches a
// *local variable* called `walletClient`; `grep -rl useVerifiedDomains` matches
// the line that *defines* it. Both read as "this file is used" and neither is.
// The first count said 18; the real number was 27.
//
// Two rules make the answer correct, and the naive version breaks both:
//
//   1. **Resolve module specifiers, not names.** A file is used when something
//      imports its *path*, not when its basename appears somewhere.
//   2. **Reachability is transitive.** A file imported only by a dead file is
//      dead. Ten of the twenty-seven here are only reachable through two barrel
//      files that nothing imports -- a single "does anything import me?" pass
//      calls all ten live.
//
// Entry points are the files Next loads by path (routes, layouts, proxy,
// ambient types), because nothing imports those either.
//
// Exits non-zero when anything is unreachable, so CI can hold the line once the
// current backlog is dealt with. Until then, run it and read it.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Files loaded by path rather than imported: Next's route conventions, the
// proxy, ambient types -- and test files, which a runner discovers by glob.
// Without the last one a module's only test looks like dead code, which would
// punish exactly the thing this repo needs more of.
const CONVENTION =
  /src\/app\/.*(page|layout|route|loading|not-found|error|template|default)\.tsx?$|src\/proxy\.ts$|src\/types\/.*\.d\.ts$|\.test\.tsx?$|\.spec\.tsx?$/;

const tracked = execSync('git ls-files', { encoding: 'utf8' }).split('\n');
const src = tracked.filter((f) => f.startsWith('src/') && /\.tsx?$/.test(f));

// `git ls-files` lists tracked paths, including ones deleted from disk but not
// yet staged. Reading those as empty made the report list deleted files as dead
// ones -- technically true and completely unhelpful. Skip them instead.
const bodies = new Map();
for (const f of src) {
  try {
    bodies.set(f, readFileSync(f, 'utf8'));
  } catch {
    // Deleted on disk; not part of the tree being analysed.
  }
}
const present = src.filter((f) => bodies.has(f));

// Every specifier a file can be imported by -> the file.
const byAlias = new Map();
for (const f of present) {
  const stem = f.replace(/\.(ts|tsx)$/, '');
  const withoutSrc = stem.slice('src/'.length);
  if (!byAlias.has(`@/${withoutSrc}`)) byAlias.set(`@/${withoutSrc}`, f);
  if (path.basename(stem) === 'index') {
    const dir = path.dirname(withoutSrc).replaceAll('\\', '/');
    if (!byAlias.has(`@/${dir}`)) byAlias.set(`@/${dir}`, f);
  }
}

const SPEC = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;

function resolve(importer, spec) {
  if (spec.startsWith('@/')) return byAlias.get(spec) ?? null;
  if (!spec.startsWith('.')) return null;
  const base = path
    .normalize(path.join(path.dirname(importer), spec))
    .replaceAll('\\', '/');
  for (const cand of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (bodies.has(cand)) return cand;
  }
  return null;
}

const imports = new Map();
for (const f of present) {
  const out = new Set();
  for (const [, spec] of bodies.get(f).matchAll(SPEC)) {
    const target = resolve(f, spec);
    if (target) out.add(target);
  }
  imports.set(f, out);
}

const entries = present.filter((f) => CONVENTION.test(f));
const reachable = new Set(entries);
const stack = [...entries];
while (stack.length) {
  for (const next of imports.get(stack.pop()) ?? []) {
    if (!reachable.has(next)) {
      reachable.add(next);
      stack.push(next);
    }
  }
}

const dead = present.filter((f) => !reachable.has(f)).sort();

console.log(`\n  source files      ${src.length}`);
console.log(`  entry points      ${entries.length}  (loaded by path, not imported)`);
console.log(`  reachable         ${reachable.size}`);
console.log(`  unreachable       ${dead.length}\n`);

if (dead.length === 0) {
  console.log('  No dead files.\n');
  process.exit(0);
}

for (const f of dead) {
  const empty = bodies.get(f).trim() === '' ? '  [EMPTY FILE]' : '';
  const via = present.filter((g) => imports.get(g)?.has(f));
  const note = via.length ? `  <- reachable only via ${via.length} dead file(s)` : '';
  console.log(`  ${f}${empty}${note}`);
}

console.log(
  '\n  These are unreachable from every route. Most read contracts with no' +
    '\n  deployed code, so wiring one up would fail rather than work.' +
    '\n  See docs/FILES.md before deleting — some are plausibly wanted later.\n'
);

process.exit(1);
