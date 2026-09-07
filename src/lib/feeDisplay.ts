/** Kaspa has 8 decimal places; the base unit is the sompi. */
export const SOMPI_PER_KAS = BigInt(100_000_000);

/** Format a sompi amount for user-facing copy without floating-point rounding. */
export function formatKas(sompi: bigint): string {
  const whole = sompi / SOMPI_PER_KAS;
  const fraction = sompi % SOMPI_PER_KAS;
  if (fraction === BigInt(0)) return `${whole} KAS`;
  return `${whole}.${fraction.toString().padStart(8, '0').replace(/0+$/, '')} KAS`;
}
