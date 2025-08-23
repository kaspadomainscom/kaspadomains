'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Domain } from '@/data/types';
import { loadCategoriesManifest, CategoryManifest } from '@/data/categoriesManifest';

const ITEMS_PER_PAGE = 20;

interface DomainWithUI extends Domain {
  category: string;
  price?: number;
  listed?: boolean;
  kaspaLink?: string;
}

async function loadCategoriesManifestForCategory(
  selectedCategory: string,
  currentPage: number,
  pageSize = ITEMS_PER_PAGE,
  fullManifest?: CategoryManifest
): Promise<CategoryManifest> {
  const manifest = fullManifest ?? (await loadCategoriesManifest());

  if (selectedCategory === 'all') {
    const allDomains: DomainWithUI[] = Object.entries(manifest).flatMap(([category, { domains }]) =>
      domains.map((domain) => ({ ...domain, category }))
    );

    const start = (currentPage - 1) * pageSize;
    const pagedDomains = allDomains.slice(start, start + pageSize);

    return {
      all: {
        title: 'All Categories',
        domains: pagedDomains,
      },
    };
  }

  const categoryData = manifest[selectedCategory];
  if (!categoryData) return {};

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
  const [allCategories, setAllCategories] = useState<{ key: string; title: string }[]>([]);

  // Advanced filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [priceMin, setPriceMin] = useState<string>(''); // string for controlled input
  const [priceMax, setPriceMax] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'sold'>('all');

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

  useEffect(() => {
    async function fetchCategories() {
      setLoading(true);
      try {
        const fullManifest = await loadCategoriesManifest();

        const manifest = await loadCategoriesManifestForCategory(selectedCategory, currentPage, ITEMS_PER_PAGE, fullManifest);
        setCategoryMap(manifest);

        let domainsCount: number;
        if (selectedCategory === 'all') {
          domainsCount = Object.values(fullManifest).reduce((acc, val) => acc + val.domains.length, 0);
        } else {
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
  }, [selectedCategory, searchTerm, priceMin, priceMax, statusFilter]);

  // Flatten domains to apply client-side filters
  const allLoadedDomains: DomainWithUI[] = useMemo(() => {
    if (selectedCategory === 'all') {
      return categoryMap['all']?.domains.map((d) => ({
        ...d,
        category: 'all',
        price: (d as Partial<DomainWithUI>).price ?? 0,
        listed: (d as Partial<DomainWithUI>).listed ?? false,
        kaspaLink: (d as Partial<DomainWithUI>).kaspaLink ?? '#',
      })) ?? [];
    }
    return categoryMap[selectedCategory]?.domains.map((d) => ({
      ...d,
      category: selectedCategory,
      price: (d as Partial<DomainWithUI>).price ?? 0,
      listed: (d as Partial<DomainWithUI>).listed ?? false,
      kaspaLink: (d as Partial<DomainWithUI>).kaspaLink ?? '#',
    })) ?? [];
  }, [categoryMap, selectedCategory]);

  // Apply advanced filters
  const filteredDomains = useMemo(() => {
    return allLoadedDomains.filter((domain) => {
      // Search filter (case-insensitive substring)
      if (searchTerm.trim()) {
        if (!domain.name.toLowerCase().includes(searchTerm.trim().toLowerCase())) {
          return false;
        }
      }

      // Price filter
      const price = domain.price ?? 0;
      if (priceMin !== '') {
        const min = Number(priceMin);
        if (!isNaN(min) && price < min) return false;
      }
      if (priceMax !== '') {
        const max = Number(priceMax);
        if (!isNaN(max) && price > max) return false;
      }

      // Status filter
      if (statusFilter === 'available' && domain.listed !== true) return false;
      if (statusFilter === 'sold' && domain.listed !== false) return false;

      return true;
    });
  }, [allLoadedDomains, searchTerm, priceMin, priceMax, statusFilter]);

  // Paginate filtered results
  const paginatedDomains = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDomains.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDomains, currentPage]);

  // Update total pages based on filteredDomains length
  useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(filteredDomains.length / ITEMS_PER_PAGE)));
  }, [filteredDomains]);

  return (
    <section className="max-w-7xl mx-auto px-6 py-12 space-y-16">
      <header className="space-y-6 max-w-3xl mx-auto text-center">
        <h1 className="text-5xl font-extrabold text-kaspaDark tracking-tight">kaspadomains Market</h1>
        <p className="text-lg text-gray-700 leading-relaxed">
          Welcome to the <strong>kaspadomains premium domain marketplace</strong> – a curated platform showcasing only the most unique and valuable domains in the Kaspa ecosystem.
        </p>
        <p className="text-lg text-gray-700 leading-relaxed">
          Each domain listed is carefully categorized — from <strong>Clubs</strong> to <strong>Characters</strong> to <strong>Trending Memes</strong>. A <strong>420 KAS listing fee</strong> ensures only high-quality domains appear here.
        </p>
        <p className="text-lg font-semibold text-kaspaDark">
          {filteredDomains.length.toLocaleString()} domains listed in{' '}
          {selectedCategory === 'all' ? 'all categories' : allCategories.find((c) => c.key === selectedCategory)?.title}
        </p>
      </header>

      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-semibold text-kaspaDark mb-6 text-center">Browse by Category</h2>
        <nav className="flex flex-wrap justify-center gap-4 mb-8">
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

      {/* Advanced Filters */}
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-md p-6 mb-10 flex flex-wrap gap-6 justify-center">
        <div className="flex flex-col w-64">
          <label htmlFor="search" className="font-semibold text-gray-700 mb-1">
            Search Domain
          </label>
          <input
            id="search"
            type="text"
            placeholder="e.g. cooldomain"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div className="flex flex-col w-40">
          <label htmlFor="priceMin" className="font-semibold text-gray-700 mb-1">
            Min Price (KAS)
          </label>
          <input
            id="priceMin"
            type="number"
            min="0"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
            placeholder="0"
          />
        </div>

        <div className="flex flex-col w-40">
          <label htmlFor="priceMax" className="font-semibold text-gray-700 mb-1">
            Max Price (KAS)
          </label>
          <input
            id="priceMax"
            type="number"
            min="0"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
            placeholder="No limit"
          />
        </div>

        <div className="flex flex-col w-40">
          <label htmlFor="statusFilter" className="font-semibold text-gray-700 mb-1">
            Status
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'available' | 'sold')}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="all">All</option>
            <option value="available">Available</option>
            <option value="sold">Sold</option>
          </select>
        </div>
      </div>

      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6 w-full md:w-3/5">
          <p className="text-lg text-gray-600 mb-1">Total Domains Listed</p>
          <p className="text-4xl font-extrabold text-kaspaDark">{filteredDomains.length.toLocaleString()}</p>
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
                  No domains found matching the filters.
                </td>
              </tr>
            ) : (
              paginatedDomains.map((d) => (
                <tr key={d.id} className="hover:bg-kaspaGreen/10 cursor-pointer">
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
              disabled={loading}
              className={`px-4 py-2 rounded-lg font-semibold transition border ${
                currentPage === page
                  ? 'bg-kaspaGreen text-white'
                  : 'bg-white text-kaspaDark hover:bg-kaspaGreen/10'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
