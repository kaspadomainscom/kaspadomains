// src/lib/fees.ts
/**
 * Fee schedule, in one place so the client (which asks the wallet for the
 * payment) and the server (which verifies it) can never disagree about the
 * amount.
 *
 * Set by the owner on 2026-09-05: listing 200 KAS, voting 1 KAS. These replace
 * the old on-chain fees, which stopped being collected when
 * `KaspaDomainsRegistry` and `DomainVotesManager` went dead.
 */

// Written as BigInt(...) rather than `100n` literals: tsconfig targets below
// ES2020, where BigInt literals are a syntax error.

/** Kaspa has 8 decimal places; the base unit is the sompi. */
export const SOMPI_PER_KAS = BigInt(100_000_000);

export const LISTING_FEE_KAS = BigInt(200);
export const VOTE_FEE_KAS = BigInt(1);

export const LISTING_FEE_SOMPI = LISTING_FEE_KAS * SOMPI_PER_KAS;
export const VOTE_FEE_SOMPI = VOTE_FEE_KAS * SOMPI_PER_KAS;

/**
 * The address fees are paid to. Public by necessity -- the browser needs it to
 * build the payment -- and independently re-read server-side, so a tampered
 * client value just means the payment goes elsewhere and verification fails.
 */
export const TREASURY_ADDRESS =
  process.env.NEXT_PUBLIC_KASPADOMAINS_TREASURY_ADDRESS?.trim() || '';

/** Fees can only be charged when there is somewhere to send them. */
export const isFeeCollectionConfigured = TREASURY_ADDRESS.length > 0;

export function formatKas(sompi: bigint): string {
  const whole = sompi / SOMPI_PER_KAS;
  const fraction = sompi % SOMPI_PER_KAS;
  if (fraction === BigInt(0)) return `${whole} KAS`;
  return `${whole}.${fraction.toString().padStart(8, '0').replace(/0+$/, '')} KAS`;
}
