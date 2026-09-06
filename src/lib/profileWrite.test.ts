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
