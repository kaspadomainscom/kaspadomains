// src/app/domains/page.tsx
import React from "react";
import Link from "next/link";

const domainsData = [
  { domain: "999club.kas", category: "999club", price: "99900", sold: false, rednoseAllocation: "0.999", buyLink: "https://www.kaspa.com/domains/marketplace/999club.kas/4579926d02dfc1eed2d578f7cb81b356f327c2fac3fbb1be9c81d794e98184b5i0" },
  { domain: "10kclub.kas", category: "10kclub", price: "25,000 KAS", sold: true, rednoseAllocation: "0.25%", buyLink: "https://www.kaspa.com/domains/marketplace/10kclub.kas/78d202e1304900088dd09bd6e6de789073bf11f22c061bf76864fd5e3c78e3d3i0" },
  { domain: "bartsimpson.kas", category: "characters", price: "5,000 KAS", sold: false, rednoseAllocation: "0.05%", buyLink: "https://www.kaspa.com/domains/marketplace/bartsimpson.kas/..." },
  // ...rest of the domains
];

const categories = [...new Set(domainsData.map(d => d.category).filter(Boolean))];

const parseKasValue = (price: string): number =>
  parseFloat(price.replace(/,/g, "").replace(/\s*KAS$/, ""));

const parsePercentValue = (percent: string): number =>
  parseFloat(percent.replace("%", ""));

const DomainPage = () => {
  const totalKasSold = domainsData.filter(d => d.sold).reduce((sum, d) => sum + parseKasValue(d.price), 0);
  const totalAllocationSold = domainsData.filter(d => d.sold).reduce((sum, d) => sum + parsePercentValue(d.rednoseAllocation), 0);
  const totalAllocationAll = domainsData.reduce((sum, d) => sum + parsePercentValue(d.rednoseAllocation), 0);
  const totalKasTarget = domainsData.reduce((sum, d) => sum + parseKasValue(d.price), 0);

  return (
    <section className="max-w-7xl mx-auto px-6 py-6 space-y-12">
      <div className="space-y-4">
        <h1 className="text-5xl font-semibold text-center text-gray-900">kaspadomains Market</h1>
        <div className="lg:columns-2 lg:gap-8 text-gray-700 text-lg leading-relaxed">
          <p>
            Welcome to the <strong>kaspadomains premium domain marketplace</strong> – a curated platform showcasing only the most unique and valuable domains in the Kaspa ecosystem.
            Every domain listed here is special: it&apos;s either a recognizable name, a strong brand candidate, or a high-potential investment.
          </p>
          <p>
            We filter and categorize each domain by type – from <strong>Clubs</strong> and <strong>Characters</strong> to <strong>Memes</strong> and <strong>Finance</strong> – making it easy to browse and discover exactly what you&apos;re looking for.
            There&apos;s a <strong>one-time 287 KAS listing fee</strong>, which ensures only serious and valuable domains make it to the market. Nobody will pay 287 KAS to list “whatbbhshj.kas” – but something like <strong>bartsimpson.kas</strong> definitely earns its spot.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-gray-900">Browse by Category</h2>
        <div className="flex flex-wrap gap-3">
          {categories.map((category) => (
            <Link
              key={category}
              href={`/domains/category/${category.toLowerCase()}`}
              className="px-4 py-2 bg-[#70C7BA] text-white rounded-xl shadow hover:bg-[#54B2A1] transition"
            >
              {category}
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-4xl font-bold text-center text-gray-900">Market Stats Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { label: "Total KAS Sold", value: `${totalKasSold.toLocaleString()} KAS` },
            { label: "Total KAS Target", value: `${totalKasTarget.toLocaleString()} KAS` },
            { label: "Allocation Sold", value: `${totalAllocationSold.toFixed(3)}%` },
            { label: "Total Allocation", value: `${totalAllocationAll.toFixed(3)}%` }
          ].map((stat) => (
            <div key={stat.label} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
              <p className="text-xl font-medium text-gray-600 mb-2">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
        <table className="min-w-full table-auto divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-[#70C7BA] to-[#54B2A1] text-white">
            <tr>
              {["Domain", "Category", "Price", "Allocation", "Sold", "Action"].map((h) => (
                <th key={h} className="px-6 py-4 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {domainsData.map((d, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">{d.domain}</td>
                <td className="px-6 py-4">{d.category}</td>
                <td className="px-6 py-4">{d.price}</td>
                <td className="px-6 py-4">{d.rednoseAllocation}</td>
                <td className="px-6 py-4">
                  <span className={`text-${d.sold ? "red" : "green"}-500 font-semibold`}>
                    {d.sold ? "Sold" : "Available"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {d.sold ? (
                    <span className="text-gray-500">Sold Out</span>
                  ) : (
                    <a
                      href={d.buyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#70C7BA] font-medium hover:text-[#54B2A1]"
                    >
                      Buy Now
                    </a>
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
