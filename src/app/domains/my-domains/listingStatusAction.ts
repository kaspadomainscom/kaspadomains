export type ListingStatusValue =
  | { votes: number; domain?: { isActive?: boolean } }
  | null
  | undefined;

export type ListingStatusAction = 'unknown' | 'not-listed' | 'listed';

/** Keep unavailable status distinct from a confirmed unlisted domain. */
export function listingStatusAction(status: ListingStatusValue): ListingStatusAction {
  if (status === undefined) return 'unknown';
  if (status?.domain?.isActive === false) return 'not-listed';
  return status === null ? 'not-listed' : 'listed';
}
