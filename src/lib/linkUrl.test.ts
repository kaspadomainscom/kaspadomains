import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const linkUrl = require('./linkUrl.ts') as {
  isHttpUrl: (v: string) => boolean;
  safeLinkHref: (v: string) => string | null;
};

const { isHttpUrl, safeLinkHref } = linkUrl;

test('accepts the http(s) URLs an owner actually saves', () => {
  for (const url of [
    'https://example.com',
    'http://example.com',
    'HTTPS://EXAMPLE.COM',
    'https://x.com/someone',
    'https://example.com/a?b=c#d',
    'https://sub.domain.example.co.uk:8443/path',
  ]) {
    assert.equal(isHttpUrl(url), true, url);
    assert.equal(safeLinkHref(url), url.trim(), url);
  }
});

test('refuses every scheme that can execute', () => {
  // The reason this module exists. These are rendered into an href on a public
  // profile page, so anything that runs is stored XSS.
  for (const url of [
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'about:blank',
  ]) {
    assert.equal(isHttpUrl(url), false, url);
    assert.equal(safeLinkHref(url), null, url);
  }
});

test('refuses a scheme smuggled past a naive prefix check', () => {
  // The old renderer prefixed anything that failed its check with `https://`,
  // which neutralised these by accident rather than by decision. Refusing is
  // the property being locked in.
  for (const url of ['//evil.com', '/\\evil.com', 'mailto:a@b.c', 'tel:+123', 'ftp://x/y']) {
    assert.equal(safeLinkHref(url), null, url);
  }
});

test('refuses whitespace and control characters inside the URL', () => {
  // A browser strips these while parsing, so the address it resolves is not the
  // one a reviewer reads.
  const smuggled = [
    'https://exa\tmple.com',
    'https://exa\nmple.com',
    'https://exa\rmple.com',
    'https://example.com/a b',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
  ];
  for (const url of smuggled) {
    assert.equal(safeLinkHref(url), null, JSON.stringify(url));
  }
});

test('tolerates surrounding whitespace, since a paste usually has some', () => {
  assert.equal(safeLinkHref('  https://example.com  '), 'https://example.com');
  assert.equal(isHttpUrl('  https://example.com  '), true);
  // But leading whitespace must not smuggle a scheme past the check.
  assert.equal(safeLinkHref('   javascript:alert(1)'), null);
});

test('refuses a scheme with nothing after it', () => {
  // "https://" passes the scheme test and renders as a link to nowhere. Not
  // dangerous, but the question this function answers is "can this be an href",
  // and it cannot.
  for (const url of ['', '   ', 'https://', 'http://', 'https:///path', 'https://?q=1']) {
    assert.equal(safeLinkHref(url), null, JSON.stringify(url));
  }
});
