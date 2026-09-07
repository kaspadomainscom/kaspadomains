/** Whether a user-visible KNS name can be sent to the listing flow. */
export function isListableDomain(value: string): boolean {
  const domain = value.trim().toLowerCase();
  return domain.endsWith('.kas') && domain.length >= 5;
}
