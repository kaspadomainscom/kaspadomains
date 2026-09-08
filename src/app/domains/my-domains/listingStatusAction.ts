export type ListingStatusValue =
  | { votes: number; domain?: { isActive?: boolean } }
  | null
  | undefined;

export type ListingStatusAction = 'unknown' | 'not-listed' | 'listed';

/** Keep unavailable, withdrawn, and incomplete status distinct from active listings. */
export function listingStatusAction(status: ListingStatusValue): ListingStatusAction {
  if (status === undefined) return 'unknown';
  if (status === null || status.domain?.isActive !== true) return 'not-listed';
  return 'listed';
}
