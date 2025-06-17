'use client';

import { Domain } from '@/data/types';
import Link from 'next/link';

export function DomainCard({ domain }: { domain: Domain }) {
  const telegramUsername =
    domain.sellerTelegram?.startsWith('@')
      ? domain.sellerTelegram.slice(1)
      : domain.sellerTelegram ?? null;

  return (
    <Link
      href={`/domain/${domain.name}`}
      className="block bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-purple-400 transition-all duration-200"
    >
      <div className="flex justify-between items-start mb-3">
        <h2 className="text-2xl font-bold text-gray-900 truncate">{domain.name}</h2>
        <span
          className={`text-xs px-3 py-1 rounded-full font-medium ${
            domain.listed
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          {domain.listed ? 'Listed' : 'Unlisted'}
        </span>
      </div>

      <div className="text-gray-800 mb-2">
        <strong className="font-medium">Price:</strong>{' '}
        {domain.price ? `${domain.price} KAS` : 'N/A'}
      </div>

      {telegramUsername && (
        <div className="mb-2">
          <strong className="font-medium">Seller Telegram:</strong>{' '}
          <a
            href={`https://t.me/${telegramUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            @{telegramUsername}
          </a>
        </div>
      )}

      {domain.kaspaLink && (
        <div className="mt-2">
          <a
            href={domain.kaspaLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-purple-600 text-sm underline hover:text-purple-800 cursor-pointer"
          >
            View on Kaspa.com →
          </a>
        </div>
      )}
    </Link>
  );
}
