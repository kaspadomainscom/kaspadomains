/**
 * The single source of truth for KaspaDomains' chain boundaries.
 *
 * There are deliberately two different facts here:
 *
 * - Current directory writes prove KNS ownership and verify fees on Kaspa
 *   **mainnet**.
 * - The future L1 covenant is a **testnet-10 target**, not an application
 *   authority. It has no source, artifact, transaction builder, or broadcast
 *   path in this repository yet.
 *
 * Keeping those facts together prevents a testnet label from silently changing
 * the network that proves ownership or receives a real payment.
 */

export type DirectorySource = 'supabase' | 'unavailable';
export type KaspaL1Network = 'mainnet' | 'testnet-10';
export type L1CovenantDeployment = 'not-built';

/** Network used by the live KNS ownership and fee-verification integrations. */
export const KNS_NETWORK = 'mainnet' as const;

/** Public endpoints used by the current mainnet integrations. */
export const KNS_API_BASE_URL = 'https://api.knsdomains.org/mainnet/api/v1';
export const KASPA_TRANSACTION_API_BASE_URL = 'https://api.kaspa.org/transactions';
export const KASPA_L1_ADDRESS_PREFIX = 'kaspa' as const;

/**
 * Kasplex is a legacy EVM fallback. Its testnet is not Kaspa L1 testnet-10 and
 * must never be used as evidence that the L1 covenant exists.
 */
export const LEGACY_KASPLEX_TESTNET = {
  chainId: 167012,
  chainHexId: '0x28d84',
  chainName: 'Kasplex Testnet',
  rpcUrl: 'https://rpc.kasplextest.xyz',
  explorerUrl: 'https://frontend.kasplextest.xyz',
  nativeCurrency: {
    name: 'Kaspa',
    symbol: 'KAS',
    decimals: 18,
  },
} as const;

const L1_COVENANT_STATUS = {
  network: 'testnet-10' as const,
  deployment: 'not-built' as const satisfies L1CovenantDeployment,
  broadcastEnabled: false,
  authoritative: false,
} as const;

/**
 * Returns only public, already-known deployment facts. It intentionally has no
 * address, RPC endpoint, bytecode, or transaction template to prevent the UI
 * from implying that a covenant can be called or broadcast.
 */
export function getL1CovenantStatus(): Readonly<typeof L1_COVENANT_STATUS> {
  return L1_COVENANT_STATUS;
}

/** A covenant is operational only after a reviewed implementation changes this contract. */
export function isL1CovenantOperational(): boolean {
  return L1_COVENANT_STATUS.broadcastEnabled && L1_COVENANT_STATUS.authoritative;
}

/**
 * Stable, human-readable domain-separation line for signed requests. Kept in
 * the runtime contract so the browser and server cannot drift onto different
 * KNS networks while continuing to accept the same signature.
 */
export function getKnsSignatureScope(): string {
  return `knsNetwork: ${KNS_NETWORK}`;
}

/**
 * Select the existing directory implementation without mistaking it for L1
 * covenant authority. A future covenant source gets a new explicit branch;
 * it must not be smuggled into the old Supabase boolean.
 */
export function resolveDirectorySource(isSupabaseConfigured: boolean): DirectorySource {
  return isSupabaseConfigured ? 'supabase' : 'unavailable';
}

function pathAt(baseUrl: string, path: string): URL {
  const relative = path.replace(/^\/+/, '');
  if (!relative || /(^|:)\/\//.test(relative)) {
    throw new Error('Kaspa API paths must be non-empty relative paths.');
  }
  return new URL(relative, `${baseUrl}/`);
}

/** Build a URL for the current KNS mainnet API without duplicating its network. */
export function knsApiUrl(path: string): URL {
  return pathAt(KNS_API_BASE_URL, path);
}

/** Build a fee-verification URL with the transaction id kept to one path segment. */
export function kaspaTransactionUrl(transactionId: string): URL {
  return pathAt(KASPA_TRANSACTION_API_BASE_URL, encodeURIComponent(transactionId));
}
