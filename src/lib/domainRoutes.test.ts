import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const routes = require('./domainName.ts') as {
  SITE_ORIGIN: string;
  domainProfilePath: (n: string) => string | null;
  domainProfileUrl: (n: string) => string | null;
  domainUpdatePath: (n: string) => string | null;
};

const { SITE_ORIGIN, domainProfilePath, domainProfileUrl, domainUpdatePath } = routes;

test('builds the canonical profile path', () => {
  assert.equal(domainProfilePath('example.kas'), '/domain/example.kas');
  assert.equal(domainProfileUrl('example.kas'), `${SITE_ORIGIN}/domain/example.kas`);
  assert.equal(domainUpdatePath('example.kas'), '/domain/update/example.kas');
});

test('every input form for one domain produces one URL', () => {
  // The point of the module. These were the variations actually in the codebase:
  // some callers passed a bare name, some the suffixed one, some whatever the
  // database returned. If they can disagree, the canonical tag disagrees with
  // the links pointing at it.
  const expected = '/domain/example.kas';
  for (const input of ['example', 'example.kas', 'Example.KAS', '  example.kas  ', 'EXAMPLE']) {
    assert.equal(domainProfilePath(input), expected, JSON.stringify(input));
  }
});

test('does not produce a URL that the profile page would redirect away from', () => {
  // /domain/[name] redirects anything not already canonical. A sitemap or a
  // canonical tag containing one of those is a self-inflicted redirect.
  for (const input of ['Example.kas', 'EXAMPLE.KAS', 'example']) {
    const path = domainProfilePath(input);
    assert.ok(path);
    const name = decodeURIComponent(path.replace('/domain/', ''));
    assert.equal(name, name.trim().toLowerCase(), 'must already be canonical');
    assert.ok(name.endsWith('.kas'), 'must already carry the suffix');
  }
});

test('percent-encodes a name rather than letting it change the URL', () => {
  // .kas names are plain today. That is a fact about the data, not a property of
  // the URL builder, and five of the eleven original call sites relied on it.
  const path = domainProfilePath('a/b.kas');
  assert.equal(path, '/domain/a%2Fb.kas');
  assert.ok(!path.includes('/domain/a/b'), 'a slash must not add a path segment');

  assert.equal(domainProfilePath('a?b.kas'), '/domain/a%3Fb.kas');
  assert.equal(domainProfilePath('a#b.kas'), '/domain/a%23b.kas');
});

test('an empty name is not a page', () => {
  // `/domain/` is a different route, and a link to it from an empty value is a
  // 404 the visitor cannot explain.
  for (const empty of ['', '   ']) {
    assert.equal(domainProfilePath(empty), null, JSON.stringify(empty));
    assert.equal(domainProfileUrl(empty), null, JSON.stringify(empty));
    assert.equal(domainUpdatePath(empty), null, JSON.stringify(empty));
  }
});

test('the absolute URL is the origin plus the path, with no doubled slash', () => {
  const url = domainProfileUrl('example.kas');
  assert.ok(url);
  assert.ok(url.startsWith(`${SITE_ORIGIN}/`));
  assert.ok(!url.includes('//domain'), url);
  assert.equal(url, `${SITE_ORIGIN}${domainProfilePath('example.kas')}`);
});

test('the origin has no trailing slash, which is what makes concatenation safe', () => {
  assert.ok(!SITE_ORIGIN.endsWith('/'), SITE_ORIGIN);
  assert.ok(SITE_ORIGIN.startsWith('https://'), SITE_ORIGIN);
});
