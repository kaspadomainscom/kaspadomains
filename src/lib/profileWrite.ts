/**
 * Shared contract for one-time profile writes.
 *
 * The browser uses these action names when it asks for a write token, the API
 * validates them before issuing one, and the database binds every token to one
 * of them. Keeping the finite set in one dependency-free module prevents a
 * valid token for one bulk replacement from becoming usable for the other.
 */
export const PROFILE_WRITE_ACTIONS = ['update-links', 'update-categories'] as const;

export type ProfileWriteAction = (typeof PROFILE_WRITE_ACTIONS)[number];

/** A token may never outlive the signed request that obtained it. */
export const PROFILE_WRITE_NONCE_TTL_MS = 5 * 60 * 1000;

export function isProfileWriteAction(value: unknown): value is ProfileWriteAction {
  return (
    typeof value === 'string' &&
    (PROFILE_WRITE_ACTIONS as readonly string[]).includes(value)
  );
}

/**
 * A profile revision crosses JSON and Postgres's bigint boundary. Refuse values
 * JavaScript cannot represent exactly rather than turning a stale-write guard
 * into a rounded comparison.
 */
export function parseProfileRevision(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

/**
 * The category list from a server response, or `null` if the response did not
 * contain one.
 *
 * `null`, never `[]`. The two mean different things and the difference is
 * load-bearing: the categories editor is a **bulk replace**, so a response that
 * merely *omitted* the list would unlock the editor showing zero categories, and
 * the owner's next save would delete the ones they actually had. That is the
 * same shape as the resources editor's data-loss bug, arriving through a
 * malformed response rather than a failed read.
 *
 * `parseProfileRevision` above is already strict about exactly this. This exists
 * because the field beside it was not, which is the asymmetry that hid it: one
 * value verified, its neighbour guessed.
 */
export function parseCategoryList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((entry) => typeof entry === 'string' && entry.length > 0)) return null;
  return value as string[];
}

export type ProfileLink = { name: string; url: string };

/**
 * The link list from a server response, or `null` if the response did not
 * contain one. Same reasoning as `parseCategoryList`.
 *
 * The shape is declared here rather than imported so this module stays
 * dependency-free and therefore testable.
 */
export function parseLinkList(value: unknown): ProfileLink[] | null {
  if (!Array.isArray(value)) return null;

  const links: ProfileLink[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) return null;
    const { name, url } = entry as Record<string, unknown>;
    if (typeof name !== 'string' || typeof url !== 'string') return null;
    links.push({ name, url });
  }
  return links;
}
