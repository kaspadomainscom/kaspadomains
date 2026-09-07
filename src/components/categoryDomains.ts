/** Return memberships that should be rendered in a category listing. */
export function activeCategoryDomains<T extends { isActive: boolean }>(
  domains: readonly T[]
): T[] {
  return domains.filter((domain) => domain.isActive);
}
