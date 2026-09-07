/**
 * What counts as a usable profile link, decided in one place.
 *
 * ## Why this exists
 *
 * The rule had two implementations that disagreed about what to do. The links
 * API refused anything not starting with `http://` or `https://`; the profile
 * page redeclared the same regex and, when it failed, **rewrote** the value as
 * `https://${url}` and rendered it anyway.
 *
 * That is the shape from `MIND.md` #17: one rule, two owners. It was not
 * exploitable -- a stored `javascript:alert(1)` became
 * `https://javascript:alert(1)`, an https URL with a nonsense host, so the
 * prefixing happened to neutralise it. But the safety was *accidental*, which
 * means nothing was protecting it: change that fallback to render the value
 * unmodified, as anyone reasonably might, and a stored `javascript:` URL on a
 * public profile becomes stored XSS.
 *
 * So the decision is explicit now, and the render path refuses rather than
 * repairs.
 *
 * ## Why the render path checks at all
 *
 * The write path already guarantees the scheme, so in principle every stored row
 * is safe. "In principle" is doing a lot of work there: rows can also arrive
 * from the SQL editor, from a backup taken before the check existed, or from an
 * import written later. A renderer that trusts its input is one unrelated change
 * away from being the vulnerability, and this check costs almost nothing.
 */

/**
 * Is this a URL we are willing to put in an `href`?
 *
 * Only `http` and `https`. Everything else -- `javascript:`, `data:`,
 * `vbscript:`, `file:`, and the schemes that do not exist yet -- is refused by
 * not being on the list, which is the direction that stays correct as browsers
 * add more.
 */
export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

/**
 * Does the value contain a space or a control character?
 *
 * Written as a codepoint scan rather than a regex character class on purpose:
 * the class needs escaped control characters, and an editing slip that writes
 * them literally produces a file that still parses and a check that no longer
 * checks the same thing. This says what it means with nothing to get wrong.
 */
function hasSpaceOrControl(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0);
    if (code !== undefined && code <= 0x20) return true;
  }
  return false;
}

/**
 * The `href` for a stored link, or `null` if it must not be rendered as one.
 *
 * `null` rather than a repaired string. A value that fails this check is not a
 * near-miss to be fixed up, it is something we did not expect, and guessing what
 * the owner meant is exactly how the rewriting fallback came to exist. The
 * caller shows the label without making it clickable.
 */
export function safeLinkHref(value: string): string | null {
  const url = value.trim();
  if (!isHttpUrl(url)) return null;

  // A browser strips tabs, newlines and other control characters while parsing a
  // URL, so a value can resolve to a different address than it reads as. Refuse
  // rather than strip: nothing legitimate contains them, and silently repairing
  // input is what this module exists to stop.
  if (hasSpaceOrControl(url)) return null;

  // A scheme with no host -- "https://" on its own -- passes every check above
  // and renders as a link to nowhere. Not dangerous, but this function's answer
  // is "can this be an href", and that cannot.
  if (!/^https?:\/\/[^/?#]+/i.test(url)) return null;

  return url;
}
