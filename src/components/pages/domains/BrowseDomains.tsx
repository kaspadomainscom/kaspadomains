'use client';

import React, { useMemo, useState } from 'react';
import { Domain } from '@/data/types';
import type { CategoryManifest } from '@/data/categoriesManifest';
import { DomainCard } from '@/components/DomainCard';
import { formatCount } from '@/lib/format';

const ITEMS_PER_PAGE = 20;

interface DomainWithCategory extends Domain {
  category: string;
}

/**
 * The interactive half of /domains: category filter, name search, pagination.
 *
 * The manifest arrives as a prop rather than being fetched here. This page used
 * to be a client component that loaded the whole directory in the browser, so
 * the listings existed only after hydration -- the HTML served for the main
 * browse page of a *directory* contained no domains at all, and a crawler that
 * does not run JavaScript saw an empty page. The data is read on the server now
 * and is present in the first response.
 *
 * `manifest` is never null: whether the read failed is the server component's
 * question, and it answers that before rendering this.
 */
export function BrowseDomains({ manifest }: { manifest: CategoryManifest }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const allCategories = useMemo(
    () => Object.entries(manifest).map(([key, { title }]) => ({ key, title })),
    [manifest]
  );

  // Flatten domains (all categories, or just the selected one), deduped by name
  const allDomains: DomainWithCategory[] = useMemo(() => {
    const seen = new Set<string>();
    const entries =
      selectedCategory === 'all'
        ? Object.entries(manifest)
        : manifest[selectedCategory]
          ? [[selectedCategory, manifest[selectedCategory]] as const]
          : [];

    const result: DomainWithCategory[] = [];
    for (const [category, { domains }] of entries) {
      for (const domain of domains) {
        if (!domain.isActive || seen.has(domain.name)) continue;
        seen.add(domain.name);
        result.push({ ...domain, category });
      }
    }
    return result;
  }, [manifest, selectedCategory]);

  const filteredDomains = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return allDomains;
    return allDomains.filter((d) => d.name.toLowerCase().includes(term));
  }, [allDomains, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredDomains.length / ITEMS_PER_PAGE));

  /**
   * The page numbers to actually render: first, last, and a window around the
   * current page, with `null` marking an elision.
   *
   * This used to render one button per page. At 20 per page a directory of
   * 10,000 listings is **500 buttons** -- a wall of numbers nobody can use, and
   * a lot of DOM for no benefit. There is no cap on listings, so the count is
   * unbounded and windowing is the only correct answer.
   */
  const pageWindow = useMemo<(number | null)[]>(() => {
    const pages: (number | null)[] = [];
    for (let page = 1; page <= totalPages; page += 1) {
      const near = Math.abs(page - currentPage) <= 1;
      if (page === 1 || page === totalPages || near) {
        if (pages[pages.length - 1] !== page) pages.push(page);
      } else if (pages[pages.length - 1] !== null) {
        pages.push(null);
      }
    }
    return pages;
  }, [totalPages, currentPage]);

  const paginatedDomains = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDomains.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDomains, currentPage]);

  return (
    <>
      <p className="text-lg font-semibold text-kaspaMint">
        {formatCount(filteredDomains.length)} domains listed
        {selectedCategory !== 'all'
          ? ` in ${allCategories.find((c) => c.key === selectedCategory)?.title ?? selectedCategory}`
          : ''}
      </p>

      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold text-white mb-6 text-center">Browse by Category</h2>
        <nav className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              setSelectedCategory('all');
              setCurrentPage(1);
            }}
            className={`px-5 py-2 rounded-full font-medium transition ${
              selectedCategory === 'all'
                ? 'bg-kaspaMint text-[#0F2F2E] shadow-lg'
                : 'bg-[#1d3b39] text-gray-300 hover:bg-[#26504c]'
            }`}
          >
            All
          </button>
          {allCategories.map(({ key, title }) => (
            <button
              key={key}
              onClick={() => {
                setSelectedCategory(key);
                setCurrentPage(1);
              }}
              className={`px-5 py-2 rounded-full font-medium transition ${
                selectedCategory === key
                  ? 'bg-kaspaMint text-[#0F2F2E] shadow-lg'
                  : 'bg-[#1d3b39] text-gray-300 hover:bg-[#26504c]'
              }`}
            >
              {title}
            </button>
          ))}
        </nav>
      </div>

      <div className="max-w-md mx-auto">
        <label htmlFor="search" className="block font-semibold text-gray-400 mb-2 text-center">
          Search by name
        </label>
        <input
          id="search"
          type="text"
          placeholder="e.g. cooldomain"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full border border-[#1d3b39] bg-[#122c2a] text-gray-100 placeholder-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-kaspaMint"
        />
      </div>

      {paginatedDomains.length === 0 ? (
        <p className="text-center text-gray-400 py-10">No domains found matching your search.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {paginatedDomains.map((domain) => (
            <DomainCard key={domain.name} domain={domain} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center flex-wrap items-center gap-2 pt-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-lg font-semibold border bg-[#122c2a] text-gray-300 border-[#1d3b39] hover:bg-[#1d3b39] disabled:opacity-40"
          >
            Prev
          </button>

          {pageWindow.map((page, i) =>
            page === null ? (
              <span key={`gap-${i}`} className="px-2 text-gray-500">
                &hellip;
              </span>
            ) : (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                aria-current={currentPage === page ? 'page' : undefined}
                className={`px-4 py-2 rounded-lg font-semibold transition border ${
                  currentPage === page
                    ? 'bg-kaspaMint text-[#0F2F2E] border-kaspaMint'
                    : 'bg-[#122c2a] text-gray-300 border-[#1d3b39] hover:bg-[#1d3b39]'
                }`}
              >
                {page}
              </button>
            )
          )}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-lg font-semibold border bg-[#122c2a] text-gray-300 border-[#1d3b39] hover:bg-[#1d3b39] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
