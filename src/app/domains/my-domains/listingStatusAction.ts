export type ListingStatusValue =
  | { votes: number; domain?: { isActive?: boolean } }
  | null
  | undefined;

export type ListingStatusAction = 'unknown' | 'not-listed' | 'listed';

/** Keep unavailable status distinct from a confirmed unlisted domain. */
export function listingStatusAction(status: ListingStatusValue): ListingStatusAction {
  if (status === undefined) return 'unknown';
  if (status === null || status.domain?.isActive !== true) return 'not-listed';
  return 'listed';
}
