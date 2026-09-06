// src/lib/domainName.ts

/**
 * The one owner of a `.kas` name's canonical form.
 *
 * ## Why this file exists
 *
 * There were **five** independent implementations of this two-line function —
 * in `domainLookup`, `verifyRequest`, the profile page, the update page and a
 * category page — plus a sixth site in `jsonld.ts` that skipped the
 * `endsWith` guard entirely and appended `.kas` unconditionally. Since the
 * stored name already ends in `.kas`, the structured data published to search
 * engines said **"foo.kas.kas"** on every domain profile and on the homepage.
 *
 * That is `MIND.md` #17 in its purest form: a format two sides must agree on,
 * with no owner, so each caller reimplements it and one of them gets it wrong
 * silently. A wrong form does not throw — it renders, and it matches nothing.
 *
 * Deliberately **dependency-free**, for the same reason `signedMessage.ts` is:
 * the server verifier and client components both need it, so it must not drag
 * the data layer or `kaspa-wasm` into a browser bundle.
 */

/**
 * Canonical form: trimmed, lowercase, exactly one `.kas` suffix.
 *
 * Idempotent — `normalizeDomainName(normalizeDomainName(x)) === normalizeDomainName(x)` —
 * so it is safe to apply at every boundary without having to know whether an
 * earlier one already did.
 *
 * An empty input stays empty rather than becoming `".kas"`, which is not a
 * domain and would be looked up as one.
 */
export function normalizeDomainName(name: string): string {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed.endsWith('.kas') ? trimmed : `${trimmed}.kas`;
}

/**
 * The name without its suffix, for places that render `.kas` themselves as
 * separate markup (the search page badge, for one).
 *
 * Exists so that stripping is owned here too. A caller doing its own
 * `.replace(/\.kas$/, '')` is the same bug waiting to happen in reverse.
 */
export function baseDomainName(name: string): string {
  return normalizeDomainName(name).replace(/\.kas$/, '');
}
