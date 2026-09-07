/**
 * A paid listing that still needs its signed write submitted.
 *
 * Payment is irreversible, while the final signing prompt can still fail.
 * Keeping this small record in browser storage lets an explicit retry reuse
 * the same payment instead of starting the fee flow again.
 */
export type PendingListing = {
  domain: string;
  categories: string[];
  intent: string;
  paymentTxId: string;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const STORAGE_PREFIX = 'kaspadomains:pending-listing:';

function storageKey(domain: string): string {
  return `${STORAGE_PREFIX}${domain.trim().toLowerCase()}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Compare category membership without treating selection order as meaningful. */
export function sameCategorySelection(left: string[], right: string[]): boolean {
  const canonical = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()))).sort();
  const leftCanonical = canonical(left);
  const rightCanonical = canonical(right);
  return (
    leftCanonical.length === rightCanonical.length &&
    leftCanonical.every((value, index) => value === rightCanonical[index])
  );
}

function matches(pending: unknown, domain: string, categories: string[]): pending is PendingListing {
  return (
    isRecord(pending) &&
    typeof pending.domain === 'string' &&
    pending.domain.trim().toLowerCase() === domain.trim().toLowerCase() &&
    Array.isArray(pending.categories) &&
    pending.categories.every((category) => typeof category === 'string') &&
    sameCategorySelection(pending.categories as string[], categories) &&
    typeof pending.intent === 'string' &&
    pending.intent.length > 0 &&
    typeof pending.paymentTxId === 'string' &&
    pending.paymentTxId.length > 0
  );
}

function parsePending(raw: string | null): PendingListing | null {
  if (!raw) return null;
  try {
    const pending: unknown = JSON.parse(raw);
    if (!isRecord(pending)) return null;
    if (
      typeof pending.domain !== 'string' ||
      !Array.isArray(pending.categories) ||
      !pending.categories.every((category) => typeof category === 'string') ||
      typeof pending.intent !== 'string' ||
      pending.intent.length === 0 ||
      typeof pending.paymentTxId !== 'string' ||
      pending.paymentTxId.length === 0
    ) {
      return null;
    }
    return pending as PendingListing;
  } catch {
    return null;
  }
}

/** Return false when browser storage is unavailable or full. */
export function savePendingListing(storage: StorageLike, pending: PendingListing): boolean {
  try {
    storage.setItem(storageKey(pending.domain), JSON.stringify(pending));
    return true;
  } catch {
    return false;
  }
}

/** Read only a record that belongs to this domain and exact category choice. */
export function loadPendingListing(
  storage: StorageLike,
  domain: string,
  categories: string[]
): PendingListing | null {
  try {
    const pending = parsePending(storage.getItem(storageKey(domain)));
    return matches(pending, domain, categories) ? pending : null;
  } catch {
    return null;
  }
}

/** Read a pending payment without requiring the caller to guess its categories. */
export function findPendingListing(storage: StorageLike, domain: string): PendingListing | null {
  try {
    const pending = parsePending(storage.getItem(storageKey(domain)));
    return pending && pending.domain.trim().toLowerCase() === domain.trim().toLowerCase()
      ? pending
      : null;
  } catch {
    return null;
  }
}

export function clearPendingListing(storage: StorageLike, domain: string): void {
  try {
    storage.removeItem(storageKey(domain));
  } catch {
    // Storage can be disabled in private browsing; completion does not fail
    // merely because cleanup could not be recorded.
  }
}
