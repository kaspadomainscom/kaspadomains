'use client';

import React, { useEffect, useState } from 'react';
import { Domain } from '@/data/types';
import { loadDynamicCategoryPage } from '@/data/DynamicCategoriesManifest';

const ITEMS_PER_PAGE = 20;

export default function DomainPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categoryMap, setCategoryMap] = useState<Record<string, { title: string; domains: Domain[] }>>({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Load category data on mount and on category or page change
  useEffect(() => {
    async function fetchCategories() {
      setLoading(true);
      try {
        const manifest = await loadDynamicCategoryPage(selectedCategory, currentPage);
        setCategoryMap(manifest);
      } catch (err) {
        console.error('Failed to load dynamic categories:', err);
        setCategoryMap({});
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, [selectedCategory, currentPage]);

  // Reset page when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  // Flatten all domains for "all" filter
  const allDomains: (Domain & { category: string })[] = Object.entries(categoryMap).flatMap(
    ([category, { domains }]) =>
      domains.map((domain) => ({
        ...domain,
        category,
      }))
  );

  // Filtered domains for current category
  const filteredDomains =
    selectedCategory === 'all'
      ? allDomains
      : categoryMap[selectedCategory]?.domains.map((d) => ({ ...d, category: selectedCategory })) ?? [];

  const paginatedDomains = filteredDomains;

  const totalPages = Math.ceil(filteredDomains.length / ITEMS_PER_PAGE);

  const categories = Object.entries(categoryMap).map(([key, { title }]) => ({
    key,
    title,
  }));

  const totalKasSold = filteredDomains
    .filter((d) => !d.listed)
    .reduce((sum, d) => sum + (d.price ?? 0), 0);

  const totalKasTarget = filteredDomains.reduce((sum, d) => sum + (d.price ?? 0), 0);

  return (
    <section className="max-w-7xl mx-auto px-6 py-12 space-y-16">
      <header className="space-y-6 max-w-3xl mx-auto text-center">
        <h1 className="text-5xl font-extrabold text-kaspaDark tracking-tight">kaspadomains Market</h1>
        <p className="text-lg text-gray-700 leading-relaxed">
          Welcome to the <strong>kaspadomains premium domain marketplace</strong> – a curated
          platform showcasing only the most unique and valuable domains in the Kaspa ecosystem.
        </p>
        <p className="text-lg text-gray-700 leading-relaxed">
          Each domain listed is carefully categorized — from <strong>Clubs</strong> to{' '}
          <strong>Characters</strong> to <strong>Trending Memes</strong>. A{' '}
          <strong>287 KAS listing fee</strong> ensures only high-quality domains appear here.
        </p>
      </header>

      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-semibold text-kaspaDark mb-6 text-center">Browse by Category</h2>
        <nav className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-5 py-2 rounded-full font-medium transition ${
              selectedCategory === 'all'
                ? 'bg-kaspaGreen text-white shadow-lg'
                : 'bg-kaspaGreen/30 text-kaspaGreen hover:bg-kaspaGreen/60'
            }`}
          >
            All
          </button>
          {categories.map(({ key, title }) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-5 py-2 rounded-full font-medium transition ${
                selectedCategory === key
                  ? 'bg-kaspaGreen text-white shadow-lg'
                  : 'bg-kaspaGreen/30 text-kaspaGreen hover:bg-kaspaGreen/60'
              }`}
            >
              {title}
            </button>
          ))}
        </nav>
      </div>

      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full md:w-3/5">
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-lg text-gray-600 mb-1">Total KAS Sold</p>
            <p className="text-4xl font-extrabold text-kaspaDark">{totalKasSold.toLocaleString()} KAS</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-lg text-gray-600 mb-1">Total KAS Target</p>
            <p className="text-4xl font-extrabold text-kaspaDark">{totalKasTarget.toLocaleString()} KAS</p>
          </div>
        </div>
        <div className="w-full md:w-2/5">
          <label htmlFor="categoryFilter" className="block mb-2 text-gray-700 font-semibold text-lg">
            Filter by Category
          </label>
          <select
            id="categoryFilter"
            className="w-full px-4 py-2 rounded-xl border border-gray-300"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(({ key, title }) => (
              <option key={key} value={key}>
                {title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl shadow-lg">
        <table className="min-w-full table-auto divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-kaspaGreen/90 to-kaspaGreen/70 text-white">
            <tr>
              {['Domain', 'Category', 'Price', 'Status', 'Action'].map((heading) => (
                <th key={heading} className="px-6 py-3 text-left font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500 italic">
                  Loading domains...
                </td>
              </tr>
            ) : paginatedDomains.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500 italic">
                  No domains found in this category.
                </td>
              </tr>
            ) : (
              paginatedDomains.map((d) => (
                <tr key={d.name} className="hover:bg-kaspaGreen/10 cursor-pointer">
                  <td className="px-6 py-4 font-medium text-kaspaDark">{d.name}</td>
                  <td className="px-6 py-4 text-gray-700">{categoryMap[d.category]?.title}</td>
                  <td className="px-6 py-4 text-gray-900 font-semibold">{(d.price ?? 0).toLocaleString()} KAS</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        d.listed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {d.listed ? 'Available' : 'Sold'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {d.listed ? (
                      <a
                        href={d.kaspaLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-kaspaGreen font-semibold hover:underline"
                      >
                        Buy Now
                      </a>
                    ) : (
                      <span className="text-gray-400 font-medium">Sold Out</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-10">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-4 py-2 rounded-lg font-semibold transition border ${
                currentPage === page ? 'bg-kaspaGreen text-white' : 'bg-white text-kaspaDark hover:bg-kaspaGreen/10'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
