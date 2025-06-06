// src/app/search/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllDomains } from '@/data/domainLookup';
import type { Domain } from '@/data/types';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const rawQuery = (searchParams.get('q') || '').trim().toLowerCase();

  // Strip `.kas` suffix if present
  const query = rawQuery.endsWith('.kas') ? rawQuery.slice(0, -4) : rawQuery;
  const [results, setResults] = useState<Domain[] | null>(null);

  useEffect(() => {
    if (!query) return;

    const allDomains = getAllDomains();
    const filtered = allDomains.filter((d) =>
      d.name.toLowerCase().includes(query)
    );

    setResults(filtered.length > 0 ? filtered : null);
  }, [query]);

  if (!query) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10 text-center text-gray-500">
        Please enter a search term.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-semibold mb-6 text-gray-900 tracking-tight">
        Search results for{' '}
        <span className="text-[#3DFDAD]">&quot;{query}.kas&quot;</span>
      </h1>

      {results ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((domain) => {
            const baseName = domain.name.replace(/\.kas$/, '');

            return (
              <li key={domain.name}>
                <Link
                  href={`/domain/${encodeURIComponent(baseName)}.kas`}
                  className="group block rounded-xl border border-gray-200 bg-white hover:shadow-lg transition-all duration-200 p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold text-gray-800 group-hover:text-[#3DFDAD] transition">
                        {baseName}
                        <span className="text-sm ml-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full border border-gray-200">
                          .kas
                        </span>
                      </div>
                    </div>
                    {domain.price && (
                      <div className="text-sm text-green-600 font-semibold bg-green-100 px-3 py-1 rounded-full">
                        {domain.price} KAS
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="text-center text-gray-600 mt-10">
          <p className="text-lg mb-2">No matching domains found.</p>
          <p className="text-sm text-gray-400">
            Try a different keyword or check back later.
          </p>
        </div>
      )}
    </div>
  );
}
