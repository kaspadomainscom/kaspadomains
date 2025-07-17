import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { keccak256 } from "viem";

/**
 * Merge Tailwind class names with conditional logic
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert bytes32 (0x-prefixed hex) to UTF-8 string, trimming trailing zero bytes
 */
export function bytes32ToString(bytes: `0x${string}`): string {
  const hex = bytes.slice(2);
  const bytesArray = new Uint8Array(
    hex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
  );
  const decoded = new TextDecoder().decode(bytesArray);
  return decoded.replace(/\0+$/, '');
}

/**
 * Convert a UTF-8 string to bytes32 format (0x-prefixed hex), padded or truncated to 32 bytes
 */
export function stringToBytes32(str: string): `0x${string}` {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(str);
  const bytes = new Uint8Array(32);
  bytes.set(encoded.slice(0, 32));
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
}

/**
 * Hash a domain string to a bytes32 hash (keccak256)
 */
export function domainToHash(domain: string): `0x${string}` {
  const encoder = new TextEncoder();
  return keccak256(encoder.encode(domain)) as `0x${string}`;
}
