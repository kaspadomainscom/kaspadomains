// src/components/DomainCard.tsx
'use client';

import { Domain } from '@/data/types';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export function DomainCard({ domain }: { domain: Domain }) {
  const statusClass = domain.isActive
    ? 'bg-kaspaMint/20 text-kaspaMint'
    : 'bg-gray-700 text-gray-400';

  // Kasplex (the EVM L2 this domain is registered on) explorer, not Kaspa L1.
  const explorerLink = `https://frontend.kasplextest.xyz/address/${domain.owner}`;

  return (
    <Link
      href={`/domain/${domain.name}`}
      className="block group border border-[#1d3b39] rounded-2xl p-5 shadow-md hover:shadow-lg hover:border-kaspaMint/50 transition-all duration-200 bg-[#122c2a]"
    >
      {/* Domain Header */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-2xl font-semibold text-white truncate group-hover:text-kaspaMint transition">
          {domain.name}
        </h2>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusClass}`}>
          {domain.isActive ? 'Listed' : 'Unlisted'}
        </span>
      </div>

      {/* Fee Paid */}
      <div className="text-sm text-gray-300 mb-2">
        <strong className="font-medium text-gray-400">Fee Paid:</strong>{' '}
        {domain.feePaid ? `${domain.feePaid} KAS` : 'N/A'}
      </div>

      {/* Owner */}
      <div className="text-sm text-gray-300 mb-2">
        <strong className="font-medium text-gray-400">Owner:</strong>{' '}
        <span className="font-mono">{domain.owner.slice(0, 6)}...{domain.owner.slice(-4)}</span>
      </div>

      {/* Created At */}
      <div className="text-sm text-gray-500">
        <strong className="font-medium">Created:</strong>{' '}
        {new Date(domain.createdAt * 1000).toLocaleDateString()}
      </div>

      {/* Kasplex Explorer Link */}
      <div className="flex items-center mt-2">
        <a
          href={explorerLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center text-kaspaMint text-sm hover:underline hover:text-[#3DFDAD]"
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          View owner on Kasplex
        </a>
      </div>
    </Link>
  );
}
