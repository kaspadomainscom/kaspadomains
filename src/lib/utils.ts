// src/lib/utils.ts
import { keccak256, toBytes, toHex } from 'viem';

export function stringToBytes32(str: string): `0x${string}` {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str.toLowerCase());
  if (bytes.length > 32) throw new Error('String too long for bytes32');
  const padded = new Uint8Array(32);
  padded.set(bytes);
  return toHex(padded);
}

export function bytes32ToString(b32: `0x${string}`): string {
  const bytes = toBytes(b32);
  return new TextDecoder().decode(bytes).replace(/\0+$/, '');
}

export function domainToHash(domain: string): `0x${string}` {
  return keccak256(toBytes(domain));
}
