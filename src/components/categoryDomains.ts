/** Return memberships that should be rendered in a category listing. */
export function activeCategoryDomains<T extends { isActive: boolean }>(
  domains: readonly T[]
): T[] {
  return domains.filter((domain) => domain.isActive);
}

/** Count only memberships that are visible as listed domains. */
export function activeCategoryCount(domains: readonly { isActive: boolean }[]): number {
  return activeCategoryDomains(domains).length;
}
