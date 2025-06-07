'use client';

import React, { useState } from "react";
import { categoriesData } from "@/data/categoriesManifest";
import type { Domain } from "@/data/types";

// Flatten all domains with category key
const allDomains: (Domain & { category: string })[] = Object.entries(categoriesData).flatMap(
  ([categoryKey, { domains }]) =>
    domains.map((domain) => ({
      ...domain,
      category: categoryKey,
    }))
);

const categories = Object.entries(categoriesData).map(([key, { title }]) => ({
  key,
  title,
}));

export default function DomainPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredDomains =
    selectedCategory === "all"
      ? allDomains
      : allDomains.filter((d) => d.category === selectedCategory);

  const totalKasSold = filteredDomains
    .filter((d) => !d.listed)
    .reduce((sum, d) => sum + (d.price ?? 0), 0);

  const totalKasTarget = filteredDomains.reduce((sum, d) => sum + (d.price ?? 0), 0);

  return (
    <section className="max-w-7xl mx-auto px-6 py-12 space-y-16">
      {/* Header */}
      <header className="space-y-6 max-w-3xl mx-auto text-center">
        <h1 className="text-5xl font-extrabold text-kaspaDark tracking-tight">
          kaspadomains Market
        </h1>
        <p className="text-lg text-gray-700 leading-relaxed">
          Welcome to the <strong>kaspadomains premium domain marketplace</strong> – a curated
          platform showcasing only the most unique and valuable domains in the Kaspa ecosystem.
        </p>
        <p className="text-lg text-gray-700 leading-relaxed">
          Each domain listed is carefully categorized — from <strong>Clubs</strong> to{" "}
          <strong>Characters</strong> to <strong>Trending Memes</strong>. A{" "}
          <strong>287 KAS listing fee</strong> ensures only high-quality domains appear here.
        </p>
      </header>

      {/* Category Links */}
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-semibold text-kaspaDark mb-6 text-center">Browse by Category</h2>
        <nav aria-label="Domain categories" className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-5 py-2 rounded-full font-medium transition ${
              selectedCategory === "all"
                ? "bg-kaspaGreen text-white shadow-lg"
                : "bg-kaspaGreen/30 text-kaspaGreen hover:bg-kaspaGreen/60"
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
                  ? "bg-kaspaGreen text-white shadow-lg"
                  : "bg-kaspaGreen/30 text-kaspaGreen hover:bg-kaspaGreen/60"
              }`}
              aria-current={selectedCategory === key ? "true" : undefined}
            >
              {title}
            </button>
          ))}
        </nav>
      </div>

      {/* Market Stats & Filter */}
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full md:w-3/5">
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow">
            <p className="text-lg text-gray-600 mb-1">Total KAS Sold</p>
            <p className="text-4xl font-extrabold text-kaspaDark">{totalKasSold.toLocaleString()} KAS</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow">
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
            className="w-full px-4 py-2 rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-kaspaGreen focus:border-transparent transition"
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

      {/* Domains Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-lg">
        <table className="min-w-full table-auto divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-kaspaGreen/90 to-kaspaGreen/70 text-white">
            <tr>
              {["Domain", "Category", "Price", "Status", "Action"].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-6 py-3 text-left font-semibold tracking-wide"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredDomains.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500 italic">
                  No domains found in this category.
                </td>
              </tr>
            ) : (
              filteredDomains.map((d) => (
                <tr
                  key={d.name}
                  className="hover:bg-kaspaGreen/10 transition-colors cursor-pointer"
                  tabIndex={0}
                  aria-label={`${d.name} domain, category ${categoriesData[d.category].title}, price ${
                    d.price ?? 0
                  } KAS, status ${d.listed ? "available" : "sold"}`}
                >
                  <td className="px-6 py-4 font-medium text-kaspaDark">{d.name}</td>
                  <td className="px-6 py-4 text-gray-700">{categoriesData[d.category].title}</td>
                  <td className="px-6 py-4 text-gray-900 font-semibold">
                    {(d.price ?? 0).toLocaleString()} KAS
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        d.listed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {d.listed ? "Available" : "Sold"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {d.listed ? (
                      <a
                        href={d.kaspaLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-kaspaGreen font-semibold hover:text-kaspaGreen-dark underline transition"
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
    </section>
  );
}
