'use client';

import { Domain } from '@/data/types';
import Link from 'next/link';
import { ExternalLink, MessageSquareText } from 'lucide-react';

export function DomainCard({ domain }: { domain: Domain }) {
  const telegramUsername = domain.sellerTelegram?.startsWith('@')
    ? domain.sellerTelegram.slice(1)
    : domain.sellerTelegram ?? null;

  const statusClass = domain.listed
    ? 'bg-green-100 text-green-700'
    : 'bg-gray-200 text-gray-600';

  return (
    <Link
      href={`/domain/${domain.name}`}
      className="block group border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-purple-400 transition-all duration-200 bg-white"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-2xl font-semibold text-gray-900 truncate group-hover:text-purple-700 transition">
          {domain.name}
        </h2>
        <span
          className={`text-xs px-3 py-1 rounded-full font-medium ${statusClass}`}
        >
          {domain.listed ? 'Listed' : 'Unlisted'}
        </span>
      </div>

      {/* Price */}
      <div className="text-sm text-gray-700 mb-2">
        <strong className="font-medium">Price:</strong>{' '}
        {domain.price ? `${domain.price} KAS` : 'N/A'}
      </div>

      {/* Telegram Contact */}
      {telegramUsername && (
        <div className="flex items-center text-sm text-gray-700 mb-2">
          <MessageSquareText className="w-4 h-4 mr-1 text-blue-500" />
          <span className="font-medium mr-1">Seller:</span>
          <a
            href={`https://t.me/${telegramUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-600 hover:underline"
          >
            @{telegramUsername}
          </a>
        </div>
      )}

      {/* Kaspa Link */}
      {domain.kaspaLink && (
        <div className="flex items-center mt-2">
          <a
            href={domain.kaspaLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center text-purple-600 text-sm hover:underline hover:text-purple-800"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            View on Kaspa.com
          </a>
        </div>
      )}
    </Link>
  );
}
