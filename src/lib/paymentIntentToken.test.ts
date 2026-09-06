import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const tokens = require('./paymentIntentToken.ts') as {
  INTENT_TTL_MS: number;
  issueIntentToken: (
    secret: string,
    claims: Claims,
    now?: number
  ) => { intent: string; expiresAt: number };
  isIntentTokenValid: (
    secret: string,
    token: string,
    expected: Claims,
    now?: number
  ) => boolean;
};

type Claims = {
  action: 'list-domain' | 'vote';
  domain: string;
  signer: string;
  amountSompi: string;
};

const { issueIntentToken, isIntentTokenValid, INTENT_TTL_MS } = tokens;

const SECRET = 'sb_secret_test_value';
const LISTING: Claims = {
  action: 'list-domain',
  domain: 'example.kas',
  signer: 'kaspa:qtest',
  amountSompi: '20000000000',
};

test('accepts a token it just issued, for the same claims', () => {
  const { intent } = issueIntentToken(SECRET, LISTING);
  assert.equal(isIntentTokenValid(SECRET, intent, LISTING), true);
});

test('rejects a token whose claims do not match the request', () => {
  // Every field is load-bearing. A token that survived any one of these
  // substitutions would let a preflight for one action authorise another.
  const { intent } = issueIntentToken(SECRET, LISTING);

  assert.equal(isIntentTokenValid(SECRET, intent, { ...LISTING, domain: 'other.kas' }), false);
  assert.equal(isIntentTokenValid(SECRET, intent, { ...LISTING, signer: 'kaspa:qattacker' }), false);
  assert.equal(isIntentTokenValid(SECRET, intent, { ...LISTING, amountSompi: '1' }), false);
  assert.equal(isIntentTokenValid(SECRET, intent, { ...LISTING, action: 'vote' }), false);
});

test('rejects a forged body carrying cheaper claims', () => {
  // The attack the signature exists to stop: take a real 200 KAS listing token
  // and swap the payload for a 1 KAS vote, keeping the signature.
  const { intent } = issueIntentToken(SECRET, LISTING);
  const signature = intent.slice(intent.lastIndexOf('.') + 1);

  const forgedClaims = {
    action: 'vote',
    domain: LISTING.domain,
    signer: LISTING.signer,
    amountSompi: '100000000',
    expiresAt: Date.now() + 60_000,
  };
  const forgedBody = Buffer.from(JSON.stringify(forgedClaims)).toString('base64url');

  assert.equal(
    isIntentTokenValid(SECRET, `${forgedBody}.${signature}`, {
      ...LISTING,
      action: 'vote',
      amountSompi: '100000000',
    }),
    false
  );
});

test('rejects a tampered signature', () => {
  const { intent } = issueIntentToken(SECRET, LISTING);
  const cut = intent.lastIndexOf('.');
  const tampered = `${intent.slice(0, cut)}.${intent.slice(cut + 1, -2)}xx`;
  assert.equal(isIntentTokenValid(SECRET, tampered, LISTING), false);
});

test('rejects a token signed with a different secret', () => {
  // Guards the key derivation: rotating the secret must invalidate old tokens.
  const { intent } = issueIntentToken('another-secret', LISTING);
  assert.equal(isIntentTokenValid(SECRET, intent, LISTING), false);
});

test('rejects an expired token, and accepts it one millisecond earlier', () => {
  const issuedAt = 1_000_000;
  const { intent, expiresAt } = issueIntentToken(SECRET, LISTING, issuedAt);

  assert.equal(expiresAt, issuedAt + INTENT_TTL_MS);
  assert.equal(isIntentTokenValid(SECRET, intent, LISTING, expiresAt - 1), true);
  assert.equal(isIntentTokenValid(SECRET, intent, LISTING, expiresAt + 1), false);
});

test('rejects malformed input rather than throwing', () => {
  // These reach the server from anyone, so a throw here is a 500 on an
  // unauthenticated request.
  for (const bad of ['', '.', 'no-separator', 'a.b', '....', 'ᚠ.ᚠ']) {
    assert.equal(isIntentTokenValid(SECRET, bad, LISTING), false, `should reject: ${bad}`);
  }
});

test('rejects a well-signed body that is not an intent at all', () => {
  // A body this module signed for some other purpose must not be accepted as a
  // payment intent just because the signature checks out.
  const body = Buffer.from(JSON.stringify({ hello: 'world' })).toString('base64url');
  const { intent } = issueIntentToken(SECRET, LISTING);
  const signature = intent.slice(intent.lastIndexOf('.') + 1);
  assert.equal(isIntentTokenValid(SECRET, `${body}.${signature}`, LISTING), false);
});
