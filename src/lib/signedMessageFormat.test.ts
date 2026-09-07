import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const format = require('./signedMessageFormat.ts') as {
  digestPayload: (payload: unknown) => Promise<string>;
  buildSignedMessageWithScope: (input: Record<string, unknown>) => string;
  extractPayload: (body: Record<string, unknown>) => Record<string, unknown>;
  ENVELOPE_FIELDS: readonly string[];
};

const { digestPayload, buildSignedMessageWithScope, extractPayload, ENVELOPE_FIELDS } = format;

const SCOPE = 'knsNetwork: mainnet';
const BASE = {
  action: 'list-domain',
  domain: 'example.kas',
  publicKey: 'ABCDEF',
  issuedAt: 1_700_000_000_000,
  payloadDigest: 'deadbeef',
  knsScope: SCOPE,
};

test('builds the exact message both sides must agree on', () => {
  // Pinned deliberately. The browser signs this string and the server rebuilds
  // it; any difference at all fails every request with no obvious cause, so the
  // format is the contract and a change to it should have to change this test.
  assert.equal(
    buildSignedMessageWithScope(BASE),
    [
      'KaspaDomains request',
      'action: list-domain',
      'domain: example.kas',
      'publicKey: abcdef',
      'issuedAt: 1700000000000',
      'knsNetwork: mainnet',
      'payload: deadbeef',
    ].join('\n')
  );
});

test('lowercases the domain and the public key, and nothing else', () => {
  // Both sides normalise these, so a wallet returning an uppercase key must not
  // produce a different message than the server rebuilds.
  const mixed = buildSignedMessageWithScope({
    ...BASE,
    domain: 'ExAmPle.KAS',
    publicKey: 'AbCdEf',
  });
  assert.ok(mixed.includes('domain: example.kas'));
  assert.ok(mixed.includes('publicKey: abcdef'));
  assert.equal(mixed, buildSignedMessageWithScope(BASE));

  // The digest is hex from our own code; lowercasing it would be harmless but
  // the action must stay verbatim, since it is matched exactly server-side.
  assert.ok(buildSignedMessageWithScope({ ...BASE, action: 'preflight' }).includes('action: preflight'));
});

test('the KNS scope is part of the signed message', () => {
  // Domain separation: a signature made for one KNS network must not verify
  // against another.
  const other = buildSignedMessageWithScope({ ...BASE, knsScope: 'knsNetwork: testnet-10' });
  assert.notEqual(other, buildSignedMessageWithScope(BASE));
  assert.ok(other.includes('knsNetwork: testnet-10'));
});

test('every field changes the message', () => {
  // If any of these did not, two different requests would share a signature.
  const base = buildSignedMessageWithScope(BASE);
  const variants = [
    { action: 'vote' },
    { domain: 'other.kas' },
    { publicKey: 'ffff' },
    { issuedAt: 1_700_000_000_001 },
    { payloadDigest: 'cafebabe' },
  ];
  for (const change of variants) {
    assert.notEqual(
      buildSignedMessageWithScope({ ...BASE, ...change }),
      base,
      `changing ${Object.keys(change)[0]} must change the message`
    );
  }
});

test('the payload digest is independent of object key order', () => {
  // Canonical JSON sorts keys. Two engines serialising the same body in a
  // different order must produce the same digest, or the signature check fails
  // for reasons nobody can reproduce.
  return Promise.all([
    digestPayload({ a: 1, b: 2, c: { d: 3, e: 4 } }),
    digestPayload({ c: { e: 4, d: 3 }, b: 2, a: 1 }),
  ]).then(([first, second]) => assert.equal(first, second));
});

test('the payload digest depends on array order', async () => {
  // Link order is meaningful -- it is the order the owner chose -- so reordering
  // is a different request and must not reuse a signature.
  const one = await digestPayload({ links: [{ n: 'a' }, { n: 'b' }] });
  const two = await digestPayload({ links: [{ n: 'b' }, { n: 'a' }] });
  assert.notEqual(one, two);
});

test('undefined fields are dropped, so absent and undefined agree', async () => {
  // JSON.stringify drops undefined but the two sides may build the object
  // differently; this pins that they hash the same.
  assert.equal(await digestPayload({ a: 1, b: undefined }), await digestPayload({ a: 1 }));
});

test('an absent payload hashes like an empty object', async () => {
  const empty = await digestPayload({});
  assert.equal(await digestPayload(undefined), empty);
  assert.equal(await digestPayload(null), empty);
});

test('different payloads produce different digests', async () => {
  const a = await digestPayload({ categories: ['defi'] });
  const b = await digestPayload({ categories: ['gaming'] });
  assert.notEqual(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
});

test('the signature covers every field except the envelope', () => {
  // The bug this exists for: the links array used to sit outside the signed
  // payload, so a captured signature could be replayed with someone else's
  // links on an owner's public profile.
  const body = {
    domain: 'example.kas',
    publicKey: 'abc',
    issuedAt: 1,
    signature: 'sig',
    links: [{ name: 'X', url: 'https://x.com/a' }],
    categories: ['defi'],
    paymentTxId: 'a'.repeat(64),
    intent: 'token',
  };
  const payload = extractPayload(body);

  for (const field of ENVELOPE_FIELDS) {
    assert.ok(!(field in payload), `${field} is envelope, must not be in the payload`);
  }
  for (const field of ['links', 'categories', 'paymentTxId', 'intent']) {
    assert.ok(field in payload, `${field} must be covered by the signature`);
  }
});

test('a field nobody anticipated is covered rather than skipped', () => {
  // extractPayload is a deny-list on purpose. An allow-list would leave every
  // future field unauthenticated until somebody remembered to add it.
  const payload = extractPayload({
    domain: 'example.kas',
    publicKey: 'abc',
    issuedAt: 1,
    signature: 'sig',
    somethingAddedLater: 'value',
  });
  assert.equal(payload.somethingAddedLater, 'value');
});

test('extractPayload does not mutate the body it was given', () => {
  const body = { domain: 'example.kas', signature: 'sig', categories: ['defi'] };
  const before = JSON.stringify(body);
  extractPayload(body);
  assert.equal(JSON.stringify(body), before);
});
