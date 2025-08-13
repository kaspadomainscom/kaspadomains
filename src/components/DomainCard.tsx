// src/components/DomainCard.tsx
'use client';

import { Domain } from '@/data/types';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export function DomainCard({ domain }: { domain: Domain }) {
  const statusClass = domain.isActive
    ? 'bg-green-100 text-green-700'
    : 'bg-gray-200 text-gray-600';

  // Optional: Generate Kaspa Explorer link for the domainHash
  const explorerLink = `https://kaspascan.io/tx/${domain.domainHash.toString()}`;

  return (
    <Link
      href={`/domain/${domain.name}`}
      className="block group border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-purple-400 transition-all duration-200 bg-white"
    >
      {/* Domain Header */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-2xl font-semibold text-gray-900 truncate group-hover:text-purple-700 transition">
          {domain.name}
        </h2>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusClass}`}>
          {domain.isActive ? 'Listed' : 'Unlisted'}
        </span>
      </div>

      {/* Fee Paid */}
      <div className="text-sm text-gray-700 mb-2">
        <strong className="font-medium">Fee Paid:</strong>{' '}
        {domain.feePaid ? `${domain.feePaid} KAS` : 'N/A'}
      </div>

      {/* Owner */}
      <div className="text-sm text-gray-700 mb-2">
        <strong className="font-medium">Owner:</strong>{' '}
        <span className="font-mono">{domain.owner.slice(0, 6)}...{domain.owner.slice(-4)}</span>
      </div>

      {/* Created At */}
      <div className="text-sm text-gray-500">
        <strong className="font-medium">Created:</strong>{' '}
        {new Date(domain.createdAt * 1000).toLocaleDateString()}
      </div>

      {/* Kaspa Explorer Link */}
      <div className="flex items-center mt-2">
        <a
          href={explorerLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center text-purple-600 text-sm hover:underline hover:text-purple-800"
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          View on Kaspascan
        </a>
      </div>
    </Link>
  );
}
