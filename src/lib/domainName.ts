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

/**
 * The one owner of the URLs this site publishes about a domain.
 *
 * These live here, beside the canonical form they are built from, rather than in
 * a routes module of their own. The separation would read better; it is not
 * available. The test runner resolves neither `@/` aliases nor extensionless
 * relative imports, so a module is only testable if it imports nothing but Node
 * builtins -- a `routes.ts` importing `normalizeDomainName` cannot be tested,
 * and the alternative is a second copy of the normalisation, which is the exact
 * bug this file exists to prevent. Testable and correct beats tidy.
 *
 * ## Why they need an owner
 *
 * A profile URL was built in **eleven** places, three different ways: six
 * encoded the name, five did not, and only the structured data normalised it
 * first. So the `<link rel="canonical">` on a profile page, the `og:url` beside
 * it, the sitemap entry for it and the links pointing at it could be four
 * different strings for one page.
 *
 * Not cosmetic. `/domain/[name]` redirects anything not already canonical, so
 * non-canonical names in a sitemap make it a sitemap of redirects -- and a
 * canonical tag that disagrees with the URL people land on is the one signal
 * whose entire job is to say "these are the same page".
 */

/**
 * Where this site lives, canonically. No trailing slash, which is what makes
 * concatenation with a path safe.
 *
 * The literal string still appears in ~30 other places, almost all inside static
 * `metadata` blocks. Deliberately left alone: they are correct, they read
 * clearly in context, and one of those files belongs to the other agent. This
 * constant exists for URLs that are *computed* — where a mismatch between two
 * builders is possible and has already happened. A metadata block that spells
 * out its own canonical cannot drift from anything.
 *
 * If the origin ever does change, `grep -rn "https://kaspadomains.com" src` finds
 * every one of them.
 */
export const SITE_ORIGIN = 'https://kaspadomains.com';

/**
 * The path to a domain's profile page: canonical name, percent-encoded.
 *
 * Both steps matter, for different reasons. Normalising means the URL does not
 * redirect. Encoding means a character with meaning in a URL cannot change which
 * page is addressed -- `.kas` names are plain today, but that is a fact about
 * the data rather than a property of the URL builder, and five of the eleven
 * original call sites were relying on it.
 *
 * `null` for an empty name rather than `/domain/`, which is a different route.
 */
export function domainProfilePath(name: string): string | null {
  const canonical = normalizeDomainName(name);
  if (!canonical) return null;
  return `/domain/${encodeURIComponent(canonical)}`;
}

/** The absolute form, for canonical tags, `og:url`, JSON-LD and the sitemap. */
export function domainProfileUrl(name: string): string | null {
  const path = domainProfilePath(name);
  return path === null ? null : `${SITE_ORIGIN}${path}`;
}

/** The path to a domain's edit page. Same rules, different route. */
export function domainUpdatePath(name: string): string | null {
  const canonical = normalizeDomainName(name);
  if (!canonical) return null;
  return `/domain/update/${encodeURIComponent(canonical)}`;
}
