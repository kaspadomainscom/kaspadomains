// src/components/DomainCard.tsx
'use client';

import { Domain } from '@/data/types';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { formatKas } from '@/lib/fees';
import { isSupabaseConfigured } from '@/lib/supabase';
import { formatEther } from 'ethers';

/**
 * Where to look an owner up, chosen by the shape of the address.
 *
 * The card used to send every owner to the Kasplex **testnet** explorer. That
 * was right when owners were EVM addresses; since listings moved to Supabase the
 * stored owner is the Kaspa L1 address KNS reports (`kaspa:qz…`), so the link
 * handed a bech32 string to an EVM explorer and produced a dead page.
 *
 * `kas.fyi` is used for L1 rather than `explorer.kaspa.org` because it is the
 * one that actually answered when checked (the latter returns 403 to a plain
 * request, so its URL shape could not be confirmed).
 */
function ownerExplorerUrl(owner: string): { href: string; label: string } | null {
  if (/^0x[a-fA-F0-9]{40}$/.test(owner)) {
    return {
      href: `https://frontend.kasplextest.xyz/address/${owner}`,
      label: 'View owner on Kasplex',
    };
  }
  if (owner.startsWith('kaspa:')) {
    return {
      href: `https://kas.fyi/address/${encodeURIComponent(owner)}`,
      label: 'View owner on kas.fyi',
    };
  }
  // An address in neither form is not something to guess a URL for.
  return null;
}

/**
 * The fee, formatted -- and the unit depends on which store answered.
 *
 * `Domain.feePaid` is a raw integer string from whichever source produced the
 * record, and the two sources do **not** agree on its unit:
 *
 *   * Supabase stores **sompi** (8 decimals) -- the API writes
 *     `payment.paidSompi.toString()`.
 *   * The contracts return **wei** (18 decimals).
 *
 * They differ by a factor of 10^10, so formatting one as the other is not
 * slightly wrong, it is wrong by ten orders of magnitude. The card previously
 * printed the raw value with " KAS" after it, which rendered a 200 KAS listing
 * as "20000000000 KAS" on every browse page, search result and ranking.
 *
 * The right long-term fix is for `Domain` to carry its unit rather than leaving
 * callers to infer it; logged in GAPS.md.
 */
function formatFee(feePaid: string): string {
  if (!feePaid) return 'N/A';
  try {
    return isSupabaseConfigured
      ? formatKas(BigInt(feePaid))
      : `${formatEther(BigInt(feePaid))} KAS`;
  } catch {
    // Never render a malformed stored value as if it were an amount.
    return 'N/A';
  }
}

export function DomainCard({ domain }: { domain: Domain }) {
  const statusClass = domain.isActive
    ? 'bg-kaspaMint/20 text-kaspaMint'
    : 'bg-gray-700 text-gray-400';

  const explorer = ownerExplorerUrl(domain.owner);

  return (
    // A card-wide <Link> used to wrap the explorer <a>, which is a nested
    // anchor: invalid HTML that browsers resolve inconsistently and screen
    // readers announce as one confused control. The link now covers the card
    // body and the explorer anchor is a sibling.
    <div className="group border border-[#1d3b39] rounded-2xl p-5 shadow-md hover:shadow-lg hover:border-kaspaMint/50 transition-all duration-200 bg-[#122c2a]">
      <Link href={`/domain/${encodeURIComponent(domain.name)}`} className="block">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-2xl font-semibold text-white truncate group-hover:text-kaspaMint transition">
            {domain.name}
          </h2>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusClass}`}>
            {domain.isActive ? 'Listed' : 'Unlisted'}
          </span>
        </div>

        <div className="text-sm text-gray-300 mb-2">
          <strong className="font-medium text-gray-400">Fee Paid:</strong>{' '}
          {formatFee(domain.feePaid)}
        </div>

        <div className="text-sm text-gray-300 mb-2">
          <strong className="font-medium text-gray-400">Owner:</strong>{' '}
          <span className="font-mono">
            {domain.owner.slice(0, 8)}…{domain.owner.slice(-4)}
          </span>
        </div>

        <div className="text-sm text-gray-500">
          <strong className="font-medium">Created:</strong>{' '}
          {domain.createdAt
            ? new Date(domain.createdAt * 1000).toLocaleDateString()
            : 'Unknown'}
        </div>
      </Link>

      {explorer && (
        <div className="flex items-center mt-2">
          <a
            href={explorer.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-kaspaMint text-sm hover:underline hover:text-[#3DFDAD]"
          >
            <ExternalLink className="w-4 h-4 mr-1" aria-hidden="true" />
            {explorer.label}
          </a>
        </div>
      )}
    </div>
  );
}
