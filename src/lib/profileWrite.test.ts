import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const profileWrite = require('./profileWrite.ts') as {
  isProfileWriteAction?: (value: unknown) => boolean;
  parseProfileRevision?: (value: unknown) => number | null;
};

test('profile-write actions are an explicit, closed set', () => {
  assert.equal(profileWrite.isProfileWriteAction?.('update-links'), true);
  assert.equal(profileWrite.isProfileWriteAction?.('update-categories'), true);
  assert.equal(profileWrite.isProfileWriteAction?.('list-domain'), false);
  assert.equal(profileWrite.isProfileWriteAction?.('update-owner'), false);
  assert.equal(profileWrite.isProfileWriteAction?.(null), false);
});

test('profile revisions must be non-negative safe integers', () => {
  assert.equal(profileWrite.parseProfileRevision?.(0), 0);
  assert.equal(profileWrite.parseProfileRevision?.(42), 42);
  assert.equal(profileWrite.parseProfileRevision?.(-1), null);
  assert.equal(profileWrite.parseProfileRevision?.(1.5), null);
  assert.equal(profileWrite.parseProfileRevision?.(Number.MAX_SAFE_INTEGER + 1), null);
  assert.equal(profileWrite.parseProfileRevision?.('4'), null);
  assert.equal(profileWrite.parseProfileRevision?.(null), null);
});

test('a category list is validated, never defaulted to empty', () => {
  const profile2 = require('./profileWrite.ts') as {
    parseCategoryList: (v: unknown) => string[] | null;
  };
  const { parseCategoryList } = profile2;

  assert.deepEqual(parseCategoryList(['defi', 'gaming']), ['defi', 'gaming']);
  // An empty list is a real answer -- the domain has no categories -- and must
  // stay distinct from "the response did not contain a list".
  assert.deepEqual(parseCategoryList([]), []);

  // Every one of these used to become `[]` via `?? []`. Saving is a bulk
  // replace, so an editor unlocked on a fabricated empty list deletes whatever
  // the owner actually had.
  for (const bad of [undefined, null, {}, 'defi', 42, [1, 2], ['ok', 3], ['ok', ''], [null]]) {
    assert.equal(parseCategoryList(bad), null, JSON.stringify(bad) ?? String(bad));
  }
});

test('a link list is validated the same way', () => {
  const profile3 = require('./profileWrite.ts') as {
    parseLinkList: (v: unknown) => { name: string; url: string }[] | null;
  };
  const { parseLinkList } = profile3;

  assert.deepEqual(parseLinkList([{ name: 'X', url: 'https://x.com/a' }]), [
    { name: 'X', url: 'https://x.com/a' },
  ]);
  assert.deepEqual(parseLinkList([]), []);

  for (const bad of [
    undefined,
    null,
    {},
    'links',
    [{ name: 'X' }],
    [{ url: 'https://x.com' }],
    [{ name: 1, url: 'https://x.com' }],
    [{ name: 'X', url: 2 }],
    [null],
    ['x'],
  ]) {
    assert.equal(parseLinkList(bad), null, JSON.stringify(bad) ?? String(bad));
  }
});

test('extra fields on a link are dropped rather than carried through', () => {
  const profile4 = require('./profileWrite.ts') as {
    parseLinkList: (v: unknown) => { name: string; url: string }[] | null;
  };
  // The editor re-submits whatever it holds, so anything not part of the shape
  // would travel back to the server on the next save.
  const parsed = profile4.parseLinkList([
    { name: 'X', url: 'https://x.com/a', position: 3, injected: true },
  ]);
  assert.deepEqual(parsed, [{ name: 'X', url: 'https://x.com/a' }]);
});
