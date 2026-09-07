#!/usr/bin/env node
/**
 * Find server-only APIs that a client component can reach.
 *
 * ## Why this exists
 *
 * I wrapped two functions in React's `cache()` and wrote, in the comment
 * justifying it, that the module was server-only. It was not: a client component
 * imported it through a differently-named wrapper. The check I had done was a
 * grep for the function's own name, which could not have found that.
 *
 * The general shape is that `'use client'` marks a boundary, and what crosses it
 * is decided by the whole import graph rather than by any one file. `cache()`,
 * `next/headers` and `node:` builtins all mean "server", and a chain of three
 * innocuous-looking imports is enough to pull one into a browser bundle. Some of
 * those failures are loud; the interesting ones are quiet, like a `cache()` that
 * silently stops memoising.
 *
 * So this walks the graph instead of grepping: for each module using a
 * server-only API, it follows *importers* transitively and reports any client
 * component that reaches it.
 *
 * ## What counts as server-only
 *
 * - `cache` imported from `react` — a server API with no request to scope to in
 *   a browser.
 * - `next/headers` — throws outside a server render.
 * - `node:` builtins — no browser equivalent.
 *
 * `next/server` is deliberately not on the list: route handlers use it and are
 * never reachable from a client component by construction.
 *
 * Run: `node scripts/client-boundary-check.mjs`
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve as resolvePath, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

const posix = (p) => p.split(sep).join('/');

function collect(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, out);
    else if (/\.tsx?$/.test(entry) && !entry.endsWith('.test.ts')) out.push(posix(relative(ROOT, full)));
  }
  return out;
}

const files = collect(SRC);
const known = new Set(files);

/** Resolve an import specifier to a file in this project, or null. */
function resolveSpecifier(spec, from) {
  let base;
  if (spec.startsWith('@/')) base = `src/${spec.slice(2)}`;
  else if (spec.startsWith('.')) base = posix(relative(ROOT, resolvePath(dirname(join(ROOT, from)), spec)));
  else return null;

  for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`, base]) {
    if (known.has(candidate)) return candidate;
  }
  return null;
}

const source = new Map(files.map((f) => [f, readFileSync(join(ROOT, f), 'utf8')]));

/** `'use client'` must be the first statement, so only a leading match counts. */
const CLIENT_DIRECTIVE = /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/;
const isClient = new Map(files.map((f) => [f, CLIENT_DIRECTIVE.test(source.get(f))]));

const importers = new Map(files.map((f) => [f, new Set()]));
for (const file of files) {
  const src = source.get(file);
  const specs = [
    ...src.matchAll(/from\s+['"]([^'"]+)['"]/g),
    ...src.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g),
  ].map((m) => m[1]);

  for (const spec of specs) {
    const target = resolveSpecifier(spec, file);
    if (target && target !== file) importers.get(target).add(file);
  }
}

/** Why a module is server-only, or an empty array. */
function serverOnlyReasons(src) {
  const reasons = [];
  if (/\{[^}]*\bcache\b[^}]*\}\s*from\s*['"]react['"]/.test(src)) reasons.push('react cache()');
  if (/from\s*['"]next\/headers['"]/.test(src)) reasons.push('next/headers');
  if (/from\s*['"]node:/.test(src)) reasons.push('node: builtin');
  return reasons;
}

const problems = [];
let checked = 0;

for (const file of files) {
  const reasons = serverOnlyReasons(source.get(file));
  if (reasons.length === 0) continue;
  checked += 1;

  // Walk importers transitively. A client component anywhere up the chain pulls
  // this module into a browser bundle.
  const seen = new Set([file]);
  const stack = [file];
  const reached = new Set();

  while (stack.length > 0) {
    for (const importer of importers.get(stack.pop())) {
      if (seen.has(importer)) continue;
      seen.add(importer);
      if (isClient.get(importer)) reached.add(importer);
      else stack.push(importer);
    }
  }

  for (const client of [...reached].sort()) {
    problems.push(`${file} [${reasons.join(', ')}] is reachable from the client component ${client}`);
  }
}

const clientCount = [...isClient.values()].filter(Boolean).length;

console.log('\nclient boundary check\n');
console.log(`  checked  ${checked} server-only modules against ${clientCount} client components`);
console.log(`  graph    ${files.length} files\n`);

if (problems.length === 0) {
  console.log('  No server-only module is reachable from a client component.\n');
  process.exit(0);
}

for (const p of problems) console.log(`  PROBLEM  ${p}`);
console.log(`\n  ${problems.length} problem${problems.length === 1 ? '' : 's'}.\n`);
process.exit(1);
