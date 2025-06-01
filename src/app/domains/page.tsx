'use client';

import React, { useState } from "react";
import Link from "next/link";
import { categoriesData } from "@/data/categoriesManifest";
import { Domain } from "@/data/types";

// Flatten all domains and tag them with category
const allDomains: (Domain & { category: string })[] = Object.entries(categoriesData).flatMap(
  ([categoryKey, { domains }]) =>
    domains.map((domain) => ({
      ...domain,
      category: categoryKey,
    }))
);

// Get all category labels
const categories = Object.entries(categoriesData).map(([key, { title }]) => ({
  key,
  title,
}));

const DomainPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredDomains =
    selectedCategory === "all"
      ? allDomains
      : allDomains.filter((d) => d.category === selectedCategory);

  const totalKasSold = filteredDomains
    .filter((d) => !d.listed)
    .reduce((sum, d) => sum + d.price, 0);

  const totalKasTarget = filteredDomains.reduce((sum, d) => sum + d.price, 0);

  return (
    <section className="max-w-7xl mx-auto px-6 py-6 space-y-12">
      <div className="space-y-4">
        <h1 className="text-5xl font-semibold text-center text-gray-900">kaspadomains Market</h1>
        <div className="lg:columns-2 lg:gap-8 text-gray-700 text-lg leading-relaxed">
          <p>
            Welcome to the <strong>kaspadomains premium domain marketplace</strong> – a curated platform showcasing only the most unique and valuable domains in the Kaspa ecosystem.
          </p>
          <p>
            Each domain listed is carefully categorized — from <strong>Clubs</strong> to <strong>Characters</strong> to <strong>Trending Memes</strong>. A <strong>287 KAS listing fee</strong> ensures only high-quality domains appear here.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-gray-900">Browse by Category</h2>
        <div className="flex flex-wrap gap-3">
          {categories.map(({ key, title }) => (
            <Link
              key={key}
              href={`/domains/categories/category/${key}`}
              className="px-4 py-2 bg-[#70C7BA] text-white rounded-xl shadow hover:bg-[#54B2A1] transition"
            >
              {title}
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-4xl font-bold text-center text-gray-900">Market Stats Overview</h2>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {[
              { label: "Total KAS Sold", value: `${totalKasSold.toLocaleString()} KAS` },
              { label: "Total KAS Target", value: `${totalKasTarget.toLocaleString()} KAS` },
            ].map((stat) => (
              <div key={stat.label} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
                <p className="text-xl font-medium text-gray-600 mb-2">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="w-full md:w-auto">
            <label htmlFor="categoryFilter" className="block text-lg font-medium text-gray-700 mb-2">
              Filter by Category
            </label>
            <select
              id="categoryFilter"
              className="px-4 py-2 border rounded-xl shadow w-full md:w-64"
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
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
        <table className="min-w-full table-auto divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-[#70C7BA] to-[#54B2A1] text-white">
            <tr>
              {["Domain", "Category", "Price", "Status", "Action"].map((h) => (
                <th key={h} className="px-6 py-4 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {filteredDomains.map((d, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">{d.name}</td>
                <td className="px-6 py-4">{categoriesData[d.category].title}</td>
                <td className="px-6 py-4">{d.price.toLocaleString()} KAS</td>
                <td className="px-6 py-4">
                  <span className={`font-semibold ${d.listed ? "text-green-500" : "text-red-500"}`}>
                    {d.listed ? "Available" : "Sold"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {d.listed ? (
                    <a
                      href={d.kaspaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#70C7BA] font-medium hover:text-[#54B2A1]"
                    >
                      Buy Now
                    </a>
                  ) : (
                    <span className="text-gray-500">Sold Out</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default DomainPage;
