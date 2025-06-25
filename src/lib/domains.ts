// lib/domains.ts
import { keccak256, toUtf8Bytes } from "ethers";

// Your off-chain list of registered domains (example)
export const registeredDomains: string[] = [
  "example.kas",
  "cool.kas",
  "kaspa.kas",
  // ... up to ~10,000 domains
];

// Precompute hash map for fast lookup by hash
const domainHashMap = new Map<string, string>();

for (const domain of registeredDomains) {
  const hash = keccak256(toUtf8Bytes(domain));
  domainHashMap.set(hash, domain);
}

/**
 * Get the keccak256 hash of a domain string.
 * Matches Solidity: keccak256(abi.encodePacked(domain))
 * @param domain - domain string (e.g., "example.kas")
 * @returns keccak256 hash as 0x-prefixed hex string
 */
export function getDomainHash(domain: string): string {
  return keccak256(toUtf8Bytes(domain));
}

/**
 * Get the domain string by its hash.
 * @param hash - keccak256 hash (0x-prefixed hex string)
 * @returns domain string or undefined if not found
 */
export function getDomainByHash(hash: string): string | undefined {
  return domainHashMap.get(hash);
}

/**
 * Check if a domain is registered (exists in your off-chain list)
 * @param domain - domain string to check
 * @returns true if registered, false otherwise
 */
export function isDomainRegistered(domain: string): boolean {
  return domainHashMap.has(getDomainHash(domain));
}
