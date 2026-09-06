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
