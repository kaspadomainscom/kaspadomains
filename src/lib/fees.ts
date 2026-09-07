// src/lib/fees.ts
import { KASPA_L1_ADDRESS_PREFIX } from './kaspaDomainRuntime';
import { SOMPI_PER_KAS, formatKas } from './feeDisplay';
export { SOMPI_PER_KAS, formatKas } from './feeDisplay';

/**
 * Fee schedule, in one place so the client (which asks the wallet for the
 * payment) and the server (which verifies it) can never disagree about the
 * amount.
 *
 * Set by the owner on 2026-09-05: listing 200 KAS, voting 1 KAS. These replace
 * the old on-chain fees, which stopped being collected when
 * `KaspaDomainsRegistry` and `DomainVotesManager` went dead.
 */

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

/**
 * Shape check on the configured address: current L1 prefix followed by bech32 characters
 * (no 1, b, i or o). This cannot catch a valid-but-wrong address -- nothing
 * can, which is why the value is verified against the SDK before being set --
 * but it does stop a truncated or mangled env var from being handed to a wallet
 * as a payment destination.
 *
 * Deliberately a regex rather than the Kaspa SDK: this module is imported by
 * client code, and the SDK is server-only.
 */
const KASPA_ADDRESS_PATTERN = new RegExp(
  `^${KASPA_L1_ADDRESS_PREFIX}:[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{50,}$`
);

export const isTreasuryAddressValid = KASPA_ADDRESS_PATTERN.test(TREASURY_ADDRESS);

/**
 * Fees can only be charged when there is somewhere real to send them. A
 * misconfigured address disables paid actions rather than pointing a wallet at
 * a destination nobody controls.
 */
export const isFeeCollectionConfigured = isTreasuryAddressValid;

/** Human-readable labels for UI and metadata copy. Keep these derived from the amounts above. */
export const LISTING_FEE_LABEL = formatKas(LISTING_FEE_SOMPI);
export const VOTE_FEE_LABEL = formatKas(VOTE_FEE_SOMPI);
