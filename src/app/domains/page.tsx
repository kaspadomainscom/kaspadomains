'use client';

import React, { useEffect, useState } from 'react';
import { Domain } from '@/data/types';
import { loadCategoriesManifest, CategoryManifest } from '@/data/categoriesManifest'; // fix import as needed

const ITEMS_PER_PAGE = 20;

interface DomainWithUI extends Domain {
  category: string;
  price?: number;
  listed?: boolean;
  kaspaLink?: string;
}

// Wrapper to add category & pagination support client-side
async function loadCategoriesManifestForCategory(
  selectedCategory: string,
  currentPage: number,
  pageSize = ITEMS_PER_PAGE
): Promise<CategoryManifest> {
  // Load full manifest once
  const fullManifest = await loadCategoriesManifest();

  // If all categories selected, just paginate all domains across all categories
  if (selectedCategory === 'all') {
    // Flatten all domains with their categories
    const allDomains: DomainWithUI[] = Object.entries(fullManifest).flatMap(([category, { domains }]) =>
      domains.map((domain) => ({ ...domain, category }))
    );

    // Paginate allDomains client-side
    const start = (currentPage - 1) * pageSize;
    const pagedDomains = allDomains.slice(start, start + pageSize);

    return {
      all: {
        title: 'All Categories',
        domains: pagedDomains,
      },
    };
  }

  // Otherwise, paginate just the selected category domains
  const categoryData = fullManifest[selectedCategory];
  if (!categoryData) {
    return {};
  }

  const start = (currentPage - 1) * pageSize;
  const pagedDomains = categoryData.domains.slice(start, start + pageSize);

  return {
    [selectedCategory]: {
      title: categoryData.title,
      domains: pagedDomains,
    },
  };
}

export default function DomainPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categoryMap, setCategoryMap] = useState<CategoryManifest>({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchCategories() {
      setLoading(true);
      try {
        const manifest = await loadCategoriesManifestForCategory(selectedCategory, currentPage, ITEMS_PER_PAGE);

        setCategoryMap(manifest);

        // Calculate total domain count for pagination
        let domainsCount: number;
        if (selectedCategory === 'all') {
          // Sum domains counts from all categories in full manifest (needs fullManifest)
          // To avoid double loading, just estimate total pages from fullManifest loaded once
          const fullManifest = await loadCategoriesManifest();
          domainsCount = Object.values(fullManifest).reduce((acc, val) => acc + val.domains.length, 0);
        } else {
          const fullManifest = await loadCategoriesManifest();
          domainsCount = fullManifest[selectedCategory]?.domains.length ?? 0;
        }

        setTotalPages(Math.max(1, Math.ceil(domainsCount / ITEMS_PER_PAGE)));
      } catch (err) {
        console.error('Failed to load categories manifest:', err);
        setCategoryMap({});
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, [selectedCategory, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  // Removed unused allDomains variable here

  // For 'all', domains are under key 'all', else under selectedCategory key
  const filteredDomains: DomainWithUI[] =
    selectedCategory === 'all'
      ? categoryMap['all']?.domains.map((d) => ({
          ...d,
          category: 'all',
          price: (d as unknown as { price?: number })?.price ?? 0,
          listed: (d as unknown as { listed?: boolean })?.listed ?? false,
          kaspaLink: (d as unknown as { kaspaLink?: string })?.kaspaLink ?? '#',
        })) ?? []
      : categoryMap[selectedCategory]?.domains.map((d) => ({
          ...d,
          category: selectedCategory,
          price: (d as unknown as { price?: number })?.price ?? 0,
          listed: (d as unknown as { listed?: boolean })?.listed ?? false,
          kaspaLink: (d as unknown as { kaspaLink?: string })?.kaspaLink ?? '#',
        })) ?? [];

  const paginatedDomains = filteredDomains;

  // For category buttons, get full categories list from full manifest
  // We load full manifest once and cache in state (optional)
  // Here we use keys from full loaded categories for buttons
  const [allCategories, setAllCategories] = useState<{ key: string; title: string }[]>([]);

  useEffect(() => {
    async function fetchAllCategories() {
      try {
        const fullManifest = await loadCategoriesManifest();
        const cats = Object.entries(fullManifest).map(([key, { title }]) => ({ key, title }));
        setAllCategories(cats);
      } catch {
        setAllCategories([]);
      }
    }
    fetchAllCategories();
  }, []);

  const totalDomainsListed = filteredDomains.length;

  return (
    <section className="max-w-7xl mx-auto px-6 py-12 space-y-16">
      <header className="space-y-6 max-w-3xl mx-auto text-center">
        <h1 className="text-5xl font-extrabold text-kaspaDark tracking-tight">kaspadomains Market</h1>
        <p className="text-lg text-gray-700 leading-relaxed">
          Welcome to the <strong>kaspadomains premium domain marketplace</strong> – a curated platform showcasing only the most unique and valuable domains in the Kaspa ecosystem.
        </p>
        <p className="text-lg text-gray-700 leading-relaxed">
          Each domain listed is carefully categorized — from <strong>Clubs</strong> to <strong>Characters</strong> to <strong>Trending Memes</strong>. A <strong>287 KAS listing fee</strong> ensures only high-quality domains appear here.
        </p>
        <p className="text-lg font-semibold text-kaspaDark">
          {totalDomainsListed.toLocaleString()} domains listed in{' '}
          {selectedCategory === 'all' ? 'all categories' : allCategories.find((c) => c.key === selectedCategory)?.title}
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
          {allCategories.map(({ key, title }) => (
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
        <div className="bg-white rounded-xl shadow-md p-6 w-full md:w-3/5">
          <p className="text-lg text-gray-600 mb-1">Total Domains Listed</p>
          <p className="text-4xl font-extrabold text-kaspaDark">{totalDomainsListed.toLocaleString()}</p>
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
            {allCategories.map(({ key, title }) => (
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
                  <td className="px-6 py-4 text-gray-700">{categoryMap[d.category]?.title || d.category}</td>
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
