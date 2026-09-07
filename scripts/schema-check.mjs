#!/usr/bin/env node
/**
 * Check the application against `supabase/schema.sql` — without a database.
 *
 * ## Why this exists
 *
 * Everything this checks is invisible to `tsc`, `eslint` and `next build`, and
 * fails only at runtime against a real project:
 *
 *   - a column selected or filtered on that the schema does not have;
 *   - an `.rpc()` name, or a `p_*` parameter name, that no function declares —
 *     PostgREST answers `PGRST202`, and for the paid routes that happens
 *     *after* the user has paid;
 *   - a `KD***` SQLSTATE raised in SQL with no mapping in `rpcError.ts`, which
 *     turns a precise message into a generic 500;
 *   - `kaspadomains_schema_version()` disagreeing with `REQUIRED_SCHEMA_VERSION`,
 *     which makes every preflight refuse.
 *
 * `npm run db:check` covers the complementary half — what is actually deployed —
 * but needs credentials and a live project. This one needs neither, so it can
 * run in CI and on a laptop, and it is the only check that catches drift *before*
 * the schema is applied. The schema has never been applied here, so at the time
 * of writing it is the only check of that SQL at all.
 *
 * ## What it deliberately does not do
 *
 * It does not parse SQL properly. It reads `create table` / `create view` /
 * `create or replace function` blocks with regular expressions, which is enough
 * for this schema and would not be for an arbitrary one. Where it cannot parse
 * something confidently it stays quiet rather than guessing — a checker with
 * false positives gets ignored, and then it is worse than nothing.
 *
 * Run: `node scripts/schema-check.mjs`
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SCHEMA = join(ROOT, 'supabase', 'schema.sql');

const problems = [];
const notes = [];
const fail = (m) => problems.push(m);

const sql = readFileSync(SCHEMA, 'utf8');

/** The balanced group of `open`/`close` starting at or after `from`. */
function balanced(text, from, open, close) {
  const start = text.indexOf(open, from);
  if (start === -1) return '';
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === open) depth += 1;
    else if (text[i] === close) {
      depth -= 1;
      if (depth === 0) return text.slice(start + 1, i);
    }
  }
  return '';
}

const parenBlock = (text, from) => balanced(text, from, '(', ')');
/** RPC arguments are an object literal, so they are brace-delimited, not paren. */
const braceBlock = (text, from) => balanced(text, from, '{', '}');

const NOT_A_COLUMN = new Set([
  'primary', 'unique', 'constraint', 'check', 'foreign', 'exclude', 'like',
]);

// ---------------------------------------------------------------------------
// What the schema defines
// ---------------------------------------------------------------------------

/** table or view name -> Set of column names */
const columns = new Map();

for (const m of sql.matchAll(/create table if not exists\s+(?:public\.)?(\w+)\s*\(/gi)) {
  const set = new Set();
  for (const raw of parenBlock(sql, m.index + m[0].length - 1).split('\n')) {
    const line = raw.trim().replace(/,$/, '');
    if (!line || line.startsWith('--')) continue;
    const first = line.split(/\s+/)[0];
    if (NOT_A_COLUMN.has(first.toLowerCase())) continue;
    set.add(first);
  }
  columns.set(m[1], set);
}

for (const m of sql.matchAll(/create or replace view\s+(?:public\.)?(\w+)[\s\S]*?\bas\b([\s\S]*?);/gi)) {
  const select = /select([\s\S]*?)\bfrom\b/i.exec(m[2]);
  const set = new Set();
  if (select) {
    for (const raw of select[1].split(',')) {
      const part = raw.trim();
      if (!part) continue;
      const alias = /\bas\s+(\w+)\s*$/i.exec(part);
      set.add(alias ? alias[1] : part.split('.').pop().split(/\s+/)[0]);
    }
  }
  columns.set(m[1], set);
}

/** function name -> declared parameter names, in order */
const functions = new Map();
for (const m of sql.matchAll(/create or replace function\s+(?:public\.)?(\w+)\s*\(/gi)) {
  const params = parenBlock(sql, m.index + m[0].length - 1)
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.split(/\s+/)[0]);
  functions.set(m[1], params);
}

if (columns.size === 0 || functions.size === 0) {
  fail('parsed nothing out of supabase/schema.sql — the checker is broken, not the schema');
}

// ---------------------------------------------------------------------------
// Source files
// ---------------------------------------------------------------------------

function sources(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sources(full, out);
    else if (/\.tsx?$/.test(entry) && !entry.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

const files = sources(join(ROOT, 'src'));

// --- columns ---------------------------------------------------------------

const FILTERS = 'eq|neq|gt|gte|lt|lte|in|like|ilike|is|order|contains';
let checkedColumns = 0;

/**
 * String constants declared in a file, so `.select(DOMAIN_COLUMNS)` can be
 * checked rather than skipped.
 *
 * Without this the checker silently ignored the case that matters most: six of
 * the eight reads select through that one constant, so a typo in it would reach
 * every query in the app while the run still reported dozens of column
 * references checked and exited zero. Verified by introducing exactly that typo
 * — the checker missed it. A check that cannot see has to say so (`MIND.md` #14);
 * here it can see instead.
 */
function stringConstants(src) {
  const found = new Map();
  for (const m of src.matchAll(/\bconst\s+(\w+)\s*=\s*'([^'\\]*)'\s*;/g)) found.set(m[1], m[2]);
  for (const m of src.matchAll(/\bconst\s+(\w+)\s*=\s*"([^"\\]*)"\s*;/g)) found.set(m[1], m[2]);
  return found;
}

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const where = relative(ROOT, file).replace(/\\/g, '/');
  const constants = stringConstants(src);

  for (const m of src.matchAll(/\.from\('(\w+)'\)([\s\S]{0,600}?)(?=\n\s*(?:const|let|return|\}|if)\b|\.from\(')/g)) {
    const [, table, chain] = m;
    if (!columns.has(table)) {
      fail(`${where}: .from('${table}') — no such table or view in schema.sql`);
      continue;
    }
    const known = columns.get(table);

    for (const f of chain.matchAll(new RegExp(`\\.(?:${FILTERS})\\(\\s*'(\\w+)'`, 'g'))) {
      checkedColumns += 1;
      if (!known.has(f[1])) fail(`${where}: ${table}.${f[1]} filtered on, but not a column of ${table}`);
    }

    // Three forms reach `.select`: a literal, a template, and a bare identifier
    // naming a constant. The last is the one that was being skipped.
    const literal = /\.select\(\s*[`'"]([\s\S]*?)[`'"]\s*[,)]/.exec(chain);
    const named = /\.select\(\s*([A-Za-z_$][\w$]*)\s*[,)]/.exec(chain);

    let spec;
    if (literal) {
      spec = literal[1];
    } else if (named && constants.has(named[1])) {
      spec = constants.get(named[1]);
    } else if (named) {
      // Never pass silently on something unread: an unresolvable select is
      // unchecked, and saying so is the whole difference between "no problems"
      // and "nothing was looked at".
      notes.push(`SKIPPED ${where}: .select(${named[1]}) — not a resolvable string constant`);
      continue;
    } else {
      continue;
    }

    spec = spec
      // A template hole naming a known constant is substituted; anything else is
      // dropped, because its contents genuinely cannot be known from here.
      .replace(/\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g, (_whole, id) =>
        constants.has(id) ? constants.get(id) : ''
      )
      .replace(/\w+!\w+\s*\([^)]*\)/g, '') // embedded resources belong to another table
      .replace(/\w+\s*\([^)]*\)/g, '');
    for (const raw of spec.split(',')) {
      const col = raw.trim();
      if (!col || col === '*' || !/^\w+$/.test(col)) continue;
      checkedColumns += 1;
      if (!known.has(col)) fail(`${where}: ${table}.${col} selected, but not a column of ${table}`);
    }
  }
}
notes.push(`${checkedColumns} column references against ${columns.size} tables and views`);

// --- rpc names and parameters ---------------------------------------------

let checkedRpcs = 0;
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const where = relative(ROOT, file).replace(/\\/g, '/');

  for (const m of src.matchAll(/\.rpc\(\s*'(\w+)'\s*(,)?/g)) {
    const name = m[1];
    checkedRpcs += 1;
    if (!functions.has(name)) {
      fail(`${where}: .rpc('${name}') — no such function in schema.sql`);
      continue;
    }
    const declared = new Set(functions.get(name));
    if (!m[2]) {
      if (declared.size > 0) {
        fail(`${where}: .rpc('${name}') passes no arguments, but it declares ${[...declared].join(', ')}`);
      }
      continue;
    }
    const sent = new Set(
      [...braceBlock(src, m.index + m[0].length - 1).matchAll(/^\s*(p_\w+)\s*:/gm)].map((k) => k[1])
    );
    for (const k of sent) if (!declared.has(k)) fail(`${where}: ${name}(${k}) sent, but not declared`);
    for (const k of declared) if (!sent.has(k)) fail(`${where}: ${name}(${k}) declared, but not sent`);
  }
}
notes.push(`${checkedRpcs} rpc call sites against ${functions.size} functions`);

// --- error codes -----------------------------------------------------------

const raised = new Set([...sql.matchAll(/\bKD\d{3}\b/g)].map((m) => m[0]));
const rpcErrorSrc = readFileSync(join(ROOT, 'src', 'lib', 'server', 'rpcError.ts'), 'utf8');
const handled = new Set([...rpcErrorSrc.matchAll(/\bKD\d{3}\b/g)].map((m) => m[0]));

for (const code of raised) {
  if (!handled.has(code)) fail(`${code} is raised in schema.sql but not mapped in src/lib/server/rpcError.ts`);
}
for (const code of handled) {
  if (!raised.has(code)) fail(`${code} is mapped in rpcError.ts but never raised in schema.sql`);
}
notes.push(`${raised.size} KD error codes`);

// --- schema version --------------------------------------------------------

const declaredVersion = /create or replace function public\.kaspadomains_schema_version\(\)[\s\S]*?select\s+(\d+)/i.exec(sql);
const requiredVersion = /REQUIRED_SCHEMA_VERSION\s*=\s*(\d+)/.exec(
  readFileSync(join(ROOT, 'src', 'lib', 'database.types.ts'), 'utf8')
);

if (!declaredVersion) fail('could not read the version out of kaspadomains_schema_version()');
else if (!requiredVersion) fail('could not read REQUIRED_SCHEMA_VERSION from src/lib/database.types.ts');
else if (declaredVersion[1] !== requiredVersion[1]) {
  fail(
    `schema version mismatch: schema.sql returns ${declaredVersion[1]}, ` +
      `the app requires ${requiredVersion[1]} — every preflight would refuse`
  );
} else {
  notes.push(`schema version ${declaredVersion[1]} on both sides`);
}

// ---------------------------------------------------------------------------

console.log('\nschema check\n');
for (const n of notes) console.log(`  checked  ${n}`);
console.log('');

if (problems.length === 0) {
  console.log('  No mismatches between the app and supabase/schema.sql.\n');
  process.exit(0);
}

for (const p of problems) console.log(`  PROBLEM  ${p}`);
console.log(`\n  ${problems.length} problem${problems.length === 1 ? '' : 's'}.\n`);
process.exit(1);
