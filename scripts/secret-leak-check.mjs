#!/usr/bin/env node
/**
 * Prove that no server-only secret reached the browser bundle.
 *
 * ## Why
 *
 * `src/lib/supabase.ts` reads `SUPABASE_SECRET_KEY` at module scope, and that
 * module is imported by client components — `useGetAllowedCategories` needs
 * `isSupabaseConfigured` from it. Next.js only inlines `NEXT_PUBLIC_*` variables
 * into client bundles, so the secret becomes `undefined` there rather than being
 * shipped. That is the theory, and it is correct today.
 *
 * It is also exactly the kind of claim that is true until it isn't: a variable
 * renamed to carry the prefix, a value moved into one that already has it, a
 * config change, a new framework version. The consequence of being wrong is a
 * service-role key published to every visitor, which is the worst single thing
 * that could happen to this project. Reasoning is not the right tool for that;
 * grepping the built output is.
 *
 * ## The self-test
 *
 * A scan that finds nothing looks identical whether the bundle is clean or the
 * scan is broken — pointed at the wrong directory, run before a build, reading
 * an empty env file. So this asserts a **positive control**: at least one known
 * public value must be found. If the controls are missing, the run is reported
 * as inconclusive and exits non-zero rather than passing. A check that cannot see
 * must not report OK (`docs/MIND.md` #14).
 *
 * Run `npm run build` first, then: `node scripts/secret-leak-check.mjs`
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const CLIENT_DIR = join(ROOT, '.next', 'static');

/**
 * Values shorter than this are not searched for. A short or common value would
 * match by coincidence and the finding would be noise rather than a leak.
 */
const MIN_SECRET_LENGTH = 12;

const problems = [];
const notes = [];

// --- environment ------------------------------------------------------------

function readEnv() {
  const found = new Map();
  // Later files win, matching how the app is usually run locally.
  for (const name of ['.env', '.env.local']) {
    const file = join(ROOT, name);
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      // Strip one layer of surrounding quotes, which dotenv also does.
      if (value.length > 1 && /^(".*"|'.*')$/.test(value)) value = value.slice(1, -1);
      if (value) found.set(key, value);
    }
  }
  return found;
}

const env = readEnv();
if (env.size === 0) {
  console.log('\nsecret leak check\n');
  console.log('  INCONCLUSIVE  no .env or .env.local with values — nothing to look for.\n');
  process.exit(1);
}

const secrets = [...env].filter(([k, v]) => !k.startsWith('NEXT_PUBLIC_') && v.length >= MIN_SECRET_LENGTH);
const controls = [...env].filter(([k, v]) => k.startsWith('NEXT_PUBLIC_') && v.length >= MIN_SECRET_LENGTH);

// --- the built client bundle -------------------------------------------------

if (!existsSync(CLIENT_DIR)) {
  console.log('\nsecret leak check\n');
  console.log('  INCONCLUSIVE  .next/static does not exist — run `npm run build` first.\n');
  process.exit(1);
}

function collect(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, out);
    else if (/\.(js|mjs|json|html|txt|map)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = collect(CLIENT_DIR);
if (files.length === 0) {
  console.log('\nsecret leak check\n');
  console.log('  INCONCLUSIVE  .next/static has no readable assets — was the build cut short?\n');
  process.exit(1);
}

/** file -> contents, read once. */
const bundle = files.map((f) => ({ path: relative(ROOT, f), body: readFileSync(f, 'utf8') }));
const totalBytes = bundle.reduce((n, f) => n + f.body.length, 0);

const findIn = (needle) => bundle.filter((f) => f.body.includes(needle)).map((f) => f.path);

// --- the check ---------------------------------------------------------------

for (const [key, value] of secrets) {
  const hits = findIn(value);
  if (hits.length > 0) {
    // The value itself is never printed, for the obvious reason.
    problems.push(`${key} appears in the client bundle: ${hits.slice(0, 3).join(', ')}`);
  }
}

const controlsFound = controls.filter(([, value]) => findIn(value).length > 0);

console.log('\nsecret leak check\n');
console.log(`  scanned  ${bundle.length} client assets (${(totalBytes / 1048576).toFixed(1)} MB)`);
console.log(`  secrets  ${secrets.length} server-only values searched for`);
console.log(`  control  ${controlsFound.length}/${controls.length} public values found in the bundle`);
for (const n of notes) console.log(`  ${n}`);
console.log('');

if (problems.length > 0) {
  for (const p of problems) console.log(`  LEAK  ${p}`);
  console.log('\n  A server-only value is in the browser bundle. Treat the value as compromised');
  console.log('  and rotate it — removing the code does not un-publish what was deployed.\n');
  process.exit(1);
}

// Only now is "no leaks" meaningful.
if (controls.length === 0) {
  console.log('  INCONCLUSIVE  no NEXT_PUBLIC_* values to use as a control, so finding');
  console.log('                nothing proves nothing about whether the scan works.\n');
  process.exit(1);
}
if (controlsFound.length === 0) {
  console.log('  INCONCLUSIVE  none of the public values were found either, so the scan is');
  console.log('                not reading what the browser receives. Rebuild and retry.\n');
  process.exit(1);
}

console.log('  No server-only value appears in the client bundle.\n');
process.exit(0);
