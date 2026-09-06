// src/components/DomainCard.tsx
'use client';

import { Domain } from '@/data/types';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { formatKas } from '@/lib/fees';

/**
 * Where to look an owner up.
 *
 * The card used to send every owner to the Kasplex **testnet** explorer, which
 * was right when owners were EVM addresses. Owners are Kaspa L1 addresses
 * (`kaspa:qz…`) now -- the EVM path was removed on 2026-09-06 -- so that link
 * handed a bech32 string to an EVM explorer and produced a dead page.
 *
 * `kas.fyi` rather than `explorer.kaspa.org` because it is the one that actually
 * answered when checked; the latter returns 403 to a plain request, so its URL
 * shape could not be confirmed, and a link built from an unverified guess is the
 * same mistake as a fabricated fallback.
 */
function ownerExplorerUrl(owner: string): { href: string; label: string } | null {
  if (owner.startsWith('kaspa:')) {
    return {
      href: `https://kas.fyi/address/${encodeURIComponent(owner)}`,
      label: 'View owner on kas.fyi',
    };
  }
  // Anything else is not an address we can guess a URL for.
  return null;
}

/**
 * The fee, formatted -- and the unit depends on which store answered.
 *
 * `fee_paid` stores **sompi** (8 decimals) -- the API writes
 * `payment.paidSompi.toString()`. The card used to print that raw with " KAS"
 * after it, so a 200 KAS listing rendered as "20000000000 KAS" on every browse
 * page, search result and ranking.
 *
 * There used to be a second unit to worry about: the contracts returned **wei**
 * (18 decimals), so the same field meant two things 10^10 apart depending on
 * which source produced the record. That ambiguity went away with the contract
 * path on 2026-09-06 -- there is one source now, and one unit.
 */
function formatFee(feePaid: string): string {
  if (!feePaid) return 'N/A';
  try {
    return formatKas(BigInt(feePaid));
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
