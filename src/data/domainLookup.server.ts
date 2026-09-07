import { cache } from 'react';
import {
  findDomainCategory,
  lookupDomain,
  type DomainCategoryLabel,
  type DomainLookup,
} from './domainLookup';

/**
 * The domain lookups, memoised **once per server request**.
 *
 * ## Why this is a separate module
 *
 * Same reason as `categoriesManifest.server.ts`: `react`'s `cache` is only
 * meaningful during a server render, and `domainLookup.ts` is imported by client
 * components — `components/header/Header.tsx` uses `findDomainByName` for the
 * search box, and `app/search/page.tsx` uses `getAllDomains`. Wrapping the
 * functions in place puts a `cache()` call into the browser bundle, where there
 * is no request to scope it to.
 *
 * It was wrapped in place first, with a comment asserting the module was
 * server-only. It was not, and the comment was the only thing claiming
 * otherwise — which is worse than the mistake, because it is what a reader would
 * have trusted instead of checking.
 *
 * ## What it fixes
 *
 * Every profile page ran the same lookup twice: `generateMetadata` needs the
 * domain to build the title, and the page body needs it again to render. Besides
 * doubling the cost, that left a window in which the two could disagree about
 * whether the domain exists — a page rendering normally under a title saying it
 * is unavailable, or the reverse.
 *
 * `cache` memoises the promise, rejection included, which is what we want: the
 * title and the body must agree about what happened.
 */
export const lookupDomainOnce: (name: string) => Promise<DomainLookup> = cache(lookupDomain);

export const findDomainCategoryOnce: (
  name: string
) => Promise<DomainCategoryLabel | undefined> = cache(findDomainCategory);
