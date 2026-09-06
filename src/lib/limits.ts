/**
 * How much of a listing a domain may have — in one place, because both of these
 * limits were previously declared twice and diverged in what enforced them.
 *
 * `MAX_CATEGORIES` was the expensive one: declared in the category edit route
 * and in the editor component, and enforced in neither the listing route, the
 * preflight, nor the listing UI. The rule it exists for could be sidestepped
 * entirely by picking twenty categories when creating a listing rather than
 * editing to them afterwards.
 *
 * `MAX_LINKS` had the same shape without the same consequence — both copies said
 * ten and both sides enforced it — but it is the same drift hazard, and there is
 * no reason to keep two definitions of one rule. See docs/MIND.md #17.
 */

/**
 * Categories are the only navigation this site has, so a listing in every
 * category is in effect a listing on every browse page: spam with extra steps.
 */
export const MAX_CATEGORIES = 6;

/**
 * Profile links. A cap keeps a profile page readable and bounds the bulk-replace
 * payload; ten is generous for an honest listing.
 */
export const MAX_LINKS = 10;
