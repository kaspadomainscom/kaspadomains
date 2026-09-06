/**
 * How many categories one listing may sit in.
 *
 * A cap exists because categories are the only navigation this site has: a
 * listing in every category is in effect a listing on every browse page, which
 * is spam with extra steps.
 *
 * It lives here because it was previously declared twice — in the category
 * edit route and in the editor component — and enforced in neither the listing
 * route nor the preflight. So the rule applied to *editing* a listing but not to
 * *creating* one, and the whole point of the cap could be sidestepped by simply
 * picking twenty categories at listing time. One owner, checked everywhere; see
 * docs/MIND.md #17.
 */
export const MAX_CATEGORIES = 6;
