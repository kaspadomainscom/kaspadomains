#!/usr/bin/env node
/**
 * Refuse a commit that mixes Claude's files with Codex's.
 *
 * ## Why
 *
 * Two agents work in this repository, often in the same working tree at the same
 * time. Twice now a `git add -A` has swept the other one's half-finished files
 * into a commit -- once actually shipping them, once caught only because the
 * file list was read back afterwards. Nothing about that is visible in a diff
 * review: the commit builds, the gates pass, and the work simply belongs to
 * somebody else.
 *
 * The rule is that each agent commits and pushes only its own changes. This is
 * the mechanism for it, because a rule that only lives in a document is a
 * request (`MIND.md` #19).
 *
 * ## How it decides
 *
 * The ownership table in `docs/CODEX-TODO.md` is the source of record, and this
 * parses it rather than keeping a second copy that could drift from it. Only the
 * backticked path patterns are machine-readable; rows like "UI pages and
 * components not listed above" are prose, so files they cover come back as
 * **unassigned** and are listed rather than guessed at. An unassigned file is
 * not an error -- it is a prompt to look.
 *
 * Exit code 1 means the staged set spans both columns. That is agent-agnostic on
 * purpose: mixing is the problem regardless of who did it, so neither agent has
 * to identify itself.
 *
 * Run: `node scripts/check-staged.mjs`
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const TABLE = join(ROOT, 'docs', 'CODEX-TODO.md');

/** Turn a table glob into a regular expression anchored at both ends. */
function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        out += '.*';
        i += 1;
        // A trailing slash after ** should also match zero directories.
        if (glob[i + 1] === '/') i += 1;
      } else {
        out += '[^/]*';
      }
    } else if ('.+?^${}()|[]\\'.includes(c)) {
      out += `\\${c}`;
    } else {
      out += c;
    }
  }
  return new RegExp(`^${out}$`);
}

/** [{ owner, glob, re }] from the markdown table. */
function readOwnership() {
  const md = readFileSync(TABLE, 'utf8');
  const section = md.split('## Who owns what')[1];
  if (!section) throw new Error('no "Who owns what" section in docs/CODEX-TODO.md');

  const rules = [];
  for (const line of section.split('\n')) {
    if (!line.startsWith('|')) continue;
    const owner = /\*\*(Codex|Claude)\*\*/.exec(line);
    if (!owner) continue;

    // Only backticked tokens containing a slash or a dot are paths; the rest of
    // a row ("wallet connect/reconnect UX") is prose about intent.
    for (const m of line.matchAll(/`([^`]+)`/g)) {
      const glob = m[1].trim();
      if (!/[/.]/.test(glob) || glob.includes(' ')) continue;
      rules.push({ owner: owner[1], glob, re: globToRegExp(glob) });
    }
  }
  if (rules.length === 0) throw new Error('parsed no path patterns out of the ownership table');
  return rules;
}

function ownerOf(file, rules) {
  // Longest pattern wins, so `src/app/api/status/route.ts` beats `src/app/api/**`.
  let best = null;
  for (const rule of rules) {
    if (!rule.re.test(file)) continue;
    if (best === null || rule.glob.length > best.glob.length) best = rule;
  }
  return best;
}

const rules = readOwnership();

/**
 * With no argument, the staged set — the pre-commit check.
 *
 * With a revision range, everything a branch changed — the pre-merge check.
 * `node scripts/check-staged.mjs main...HEAD` answers "does this branch touch
 * the other agent's files", which is the question worth asking before merging a
 * task branch back, and the one a diff review is worst at.
 */
const range = process.argv[2];
const args = range ? ['diff', '--name-only', range] : ['diff', '--cached', '--name-only'];
const label = range ? `changed in ${range}` : 'staged';

const staged = execFileSync('git', args, { encoding: 'utf8' })
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean);

if (staged.length === 0) {
  console.log(`\nnothing ${label}.\n`);
  process.exit(0);
}

const byOwner = { Claude: [], Codex: [], unassigned: [] };
for (const file of staged) {
  const rule = ownerOf(file, rules);
  if (rule) byOwner[rule.owner].push(`${file}  (${rule.glob})`);
  else byOwner.unassigned.push(file);
}

console.log(`\nownership of files ${label}\n`);
for (const owner of ['Claude', 'Codex', 'unassigned']) {
  if (byOwner[owner].length === 0) continue;
  console.log(`  ${owner}:`);
  for (const f of byOwner[owner]) console.log(`    ${f}`);
}
console.log('');

if (byOwner.Claude.length > 0 && byOwner.Codex.length > 0) {
  console.log('  PROBLEM  this commit spans both columns.');
  console.log('           Split it: stage explicit paths, never `git add -A` or `git add .`.\n');
  process.exit(1);
}

if (byOwner.unassigned.length > 0) {
  console.log('  Some files match no path pattern in the table. That is not an error —');
  console.log('  several rows are prose ("UI pages and components not listed above") —');
  console.log('  but check they are yours before committing.\n');
}

console.log('  No cross-column mixing.\n');
process.exit(0);
