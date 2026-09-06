/**
 * Dates and counts, formatted the same way everywhere and by everyone.
 *
 * ## Why not `toLocaleDateString()`
 *
 * Because it produces a different string on the server than in the browser, and
 * this app renders the same components in both. `DomainCard` is a client
 * component rendered from server components (`/domains`,
 * `/domains/top-voted`, `/domains/categories/category/[category]`), so its
 * markup is generated once on the server and then hydrated. Two things make the
 * two disagree:
 *
 * - **Locale.** The server uses whatever locale its Node build resolves; the
 *   browser uses the reader's. `9/7/2026` against `07.09.2026`.
 * - **Time zone.** Even with the locale pinned, a UTC server and a reader east
 *   of it disagree about which *day* a timestamp near midnight falls on.
 *
 * React treats a mismatch as a failed hydration: it discards the server markup
 * for that subtree, re-renders on the client and logs an error. The user sees a
 * flicker, and the thing search engines read is the version that got thrown
 * away.
 *
 * So these format from UTC parts directly. No ICU, no locale, no time zone, no
 * environment — the same input gives the same string in every runtime, which is
 * the only property that matters here. They import nothing, so they are also
 * testable.
 *
 * ## Why UTC rather than the reader's zone
 *
 * A listing date is a fact about a record, not about the reader's afternoon.
 * Showing it in UTC is consistent for everybody and matches what the database
 * stores. Rendering it in local time would be *more* precise and would bring
 * back the mismatch, so it would have to happen after hydration — which is a
 * lot of machinery for a creation date.
 */

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * `7 Sep 2026`, in UTC — or `null` when the timestamp is missing or unusable.
 *
 * Day-month-year with a named month on purpose: `9/7/2026` means two different
 * days depending on who is reading it, and this site has no way to know which.
 *
 * `null` rather than a placeholder string, so the caller decides what an unknown
 * date should look like instead of having "Unknown" baked in here.
 */
export function formatUtcDate(msSinceEpoch: number): string | null {
  if (!Number.isFinite(msSinceEpoch)) return null;

  const date = new Date(msSinceEpoch);
  const time = date.getTime();
  // Rejects NaN, and rejects 0 — which is not a listing date, it is a missing
  // value that survived as a number.
  if (Number.isNaN(time) || time <= 0) return null;

  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** The same, for a Unix timestamp in **seconds** — how listings store it. */
export function formatUtcDateFromSeconds(secondsSinceEpoch: number): string | null {
  if (!Number.isFinite(secondsSinceEpoch)) return null;
  return formatUtcDate(secondsSinceEpoch * 1000);
}

/**
 * `1,234`. Grouped by hand rather than with `toLocaleString()`, which groups
 * differently per locale (`1 234`, `1.234`) and so cannot survive hydration.
 */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '0';

  const rounded = Math.trunc(value);
  const negative = rounded < 0;
  const digits = Math.abs(rounded).toString();

  let grouped = '';
  for (let i = 0; i < digits.length; i += 1) {
    // Separator before every third digit counting from the right, never leading.
    if (i > 0 && (digits.length - i) % 3 === 0) grouped += ',';
    grouped += digits[i];
  }

  return negative ? `-${grouped}` : grouped;
}
