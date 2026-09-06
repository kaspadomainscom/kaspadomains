'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Domain } from '@/data/types';
import { loadCategoriesManifest, CategoryManifest } from '@/data/categoriesManifest';
import { DomainCard } from '@/components/DomainCard';

const ITEMS_PER_PAGE = 20;

interface DomainWithCategory extends Domain {
  category: string;
}

export default function DomainsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [fullManifest, setFullManifest] = useState<CategoryManifest>({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const allCategories = useMemo(
    () => Object.entries(fullManifest).map(([key, { title }]) => ({ key, title })),
    [fullManifest]
  );

  useEffect(() => {
    async function fetchManifest() {
      setLoading(true);
      try {
        const manifest = await loadCategoriesManifest();
        setFullManifest(manifest);
      } catch (err) {
        console.error('Failed to load categories manifest:', err);
        setFullManifest({});
      } finally {
        setLoading(false);
      }
    }
    fetchManifest();
  }, []);

  // Flatten domains (all categories, or just the selected one), deduped by name
  const allDomains: DomainWithCategory[] = useMemo(() => {
    const seen = new Set<string>();
    const entries =
      selectedCategory === 'all'
        ? Object.entries(fullManifest)
        : fullManifest[selectedCategory]
          ? [[selectedCategory, fullManifest[selectedCategory]] as const]
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
  }, [fullManifest, selectedCategory]);

  const filteredDomains = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return allDomains;
    return allDomains.filter((d) => d.name.toLowerCase().includes(term));
  }, [allDomains, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredDomains.length / ITEMS_PER_PAGE));

  const paginatedDomains = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDomains.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDomains, currentPage]);

  return (
    <div className="min-h-screen bg-[#0b1e1d]">
      <section className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        <header className="space-y-6 max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-extrabold text-white tracking-tight">Browse .kas Domains</h1>
          <p className="text-lg text-gray-400 leading-relaxed">
            Every domain here is registered on Kaspa L1 through KNS and owned directly by its
            holder. The listing itself lives in our index — KaspaDomains is a registry and
            discovery layer, not a marketplace. Browse by category or search by name.
          </p>
          <p className="text-lg font-semibold text-kaspaMint">
            {filteredDomains.length.toLocaleString()} domains listed
            {selectedCategory !== 'all'
              ? ` in ${allCategories.find((c) => c.key === selectedCategory)?.title ?? selectedCategory}`
              : ''}
          </p>
        </header>

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

        {loading ? (
          <p className="text-center text-gray-400 py-10">Loading domains…</p>
        ) : paginatedDomains.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No domains found matching your search.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {paginatedDomains.map((domain) => (
              <DomainCard key={domain.name} domain={domain} />
            ))}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex justify-center flex-wrap gap-2 pt-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded-lg font-semibold transition border ${
                  currentPage === page
                    ? 'bg-kaspaMint text-[#0F2F2E] border-kaspaMint'
                    : 'bg-[#122c2a] text-gray-300 border-[#1d3b39] hover:bg-[#1d3b39]'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
