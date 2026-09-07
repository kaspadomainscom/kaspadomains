export type ListingStatusValue = { votes: number } | null | undefined;

export type ListingStatusAction = 'unknown' | 'not-listed' | 'listed';

/** Keep unavailable status distinct from a confirmed unlisted domain. */
export function listingStatusAction(status: ListingStatusValue): ListingStatusAction {
  if (status === undefined) return 'unknown';
  return status === null ? 'not-listed' : 'listed';
}
