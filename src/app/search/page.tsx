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

  // Four distinct states, deliberately not collapsed into one nullable list:
  // "still searching", "searched and found nothing", and "couldn't load the
  // domain list at all" are different answers and must not look alike.
  type SearchState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ready'; results: Domain[] }
    | { status: 'error' };

  const [state, setState] = useState<SearchState>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      if (!query) {
        if (!cancelled) setState({ status: 'idle' });
        return;
      }

      if (!cancelled) setState({ status: 'loading' });

      try {
        const allDomains = await getAllDomains();
        if (cancelled) return;
        const filtered = allDomains.filter((d) =>
          d.name.toLowerCase().includes(query)
        );
        setState({ status: 'ready', results: filtered });
      } catch (err) {
        // getAllDomains rejects when the on-chain manifest can't be read.
        console.error('Failed to load domains for search:', err);
        if (!cancelled) setState({ status: 'error' });
      }
    }

    void runSearch();

    // Without this, a slower fetch for an earlier query can resolve last and
    // overwrite the results with ones for a query the user has moved on from.
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (!query) {
    return (
      <div className="min-h-screen bg-[#0b1e1d]">
        <div className="max-w-2xl mx-auto px-6 py-10 text-center text-gray-400">
          Please enter a search term.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1e1d]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-semibold mb-6 text-white tracking-tight">
          Search results for{' '}
          <span className="text-kaspaMint">&quot;{query}.kas&quot;</span>
        </h1>

        {state.status === 'loading' ? (
          <div className="text-center text-gray-400 mt-10">
            <p className="text-lg">Searching…</p>
          </div>
        ) : state.status === 'error' ? (
          <div className="text-center text-yellow-400 mt-10">
            <p className="text-lg mb-2">Couldn&apos;t load the domain list.</p>
            <p className="text-sm text-gray-400">
              This is a problem on our side, not with your search — please try again later.
            </p>
          </div>
        ) : state.status === 'ready' && state.results.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {state.results.map((domain) => {
              const baseName = domain.name.replace(/\.kas$/, '');

              return (
                <li key={domain.name}>
                  <Link
                    href={`/domain/${encodeURIComponent(baseName)}.kas`}
                    className="group block rounded-xl border border-[#1d3b39] bg-[#122c2a] hover:border-kaspaMint/50 hover:shadow-lg transition-all duration-200 p-5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold text-white group-hover:text-kaspaMint transition">
                          {baseName}
                          <span className="text-sm ml-1 px-2 py-0.5 bg-[#1d3b39] text-gray-300 rounded-full border border-[#2a4a47]">
                            .kas
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center text-gray-400 mt-10">
            <p className="text-lg mb-2">No matching domains found.</p>
            <p className="text-sm text-gray-500">
              Try a different keyword or check back later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
