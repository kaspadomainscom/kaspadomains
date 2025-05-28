// src/app/rednose/page.tsx
import React from "react";

const domainsData = [
  { domain: "999club.kas", price: "99900", sold: false, rednoseAllocation: "0.999", buyLink: "https://www.kaspa.com/domains/marketplace/999club.kas/4579926d02dfc1eed2d578f7cb81b356f327c2fac3fbb1be9c81d794e98184b5i0" },
  { domain: "10kclub.kas", price: "25,000 KAS", sold: true, rednoseAllocation: "0.25%", buyLink: "https://www.kaspa.com/domains/marketplace/10kclub.kas/78d202e1304900088dd09bd6e6de789073bf11f22c061bf76864fd5e3c78e3d3i0" },
  { domain: "100kclub.kas", price: "25,500 KAS", sold: false, rednoseAllocation: "0.25%", buyLink: "https://www.kaspa.com/domains/marketplace/100kclub.kas/5e65bf6bfd82e9ec979b1dd076fbe71ecdfefaf7ddb866aeaac091cb1de3a1bci0" },
  { domain: "liquiditypool.kas", price: "35,000 KAS", sold: false, rednoseAllocation: "0.35%", buyLink: "https://www.kaspa.com/domains/marketplace/liquiditypool.kas/5876e3bcf18041993f9d88b23af5b18abc23efecf58c8e7236f99e700ce89d66i0" },
  { domain: "television.kas", price: "55,555 KAS", sold: false, rednoseAllocation: "0.555%", buyLink: "https://www.kaspa.com/domains/marketplace/television.kas/c544539d842a9d3f3c47cd0576e8b52936effd6cf553535d6dcb52586fd3fc64i0" },
  { domain: "swapdex.kas", price: "10,000 KAS", sold: false, rednoseAllocation: "0.1%", buyLink: "https://www.kaspa.com/domains/marketplace/swapdex.kas/cf34ad75cc7b3c58f26951cf8aa5cb93b92da900d4aeb1f5f48bb6805f7c24d4i0" },
  { domain: "whatthefuck.kas", price: "1,000 KAS", sold: false, rednoseAllocation: "0.01%", buyLink: "https://www.kaspa.com/domains/marketplace/whatthefuck.kas/07ba8eefb919893d8705dbc95e0e4b6cd3c2a6a3d7d59e93b7e8a9cc4bcb24bfi0" },
  { domain: "bullmarket.kas", price: "35,000 KAS", sold: false, rednoseAllocation: "0.35%", buyLink: "https://www.kaspa.com/domains/marketplace/bullmarket.kas/ffc933d73cbd50f01dc18f00e8a9ad7bb2ff9249d97150dca9aad3faeaf70df8i0" },
  { domain: "tweet.kas", price: "13,000 KAS", sold: false, rednoseAllocation: "0.13%", buyLink: "https://www.kaspa.com/domains/marketplace/tweet.kas/ab647f8c48da33ec127705a63f2db03b45b0d849575237dc7b4d9abacb3e60f0i0" },
  { domain: "channel1", price: "10,000 KAS", sold: false, rednoseAllocation: "0.1%", buyLink: "https://www.kaspa.com/domains/marketplace/channel1.kas/0a33cbc0b3bf59eaaf69172e9fa1626308df2b91c9450820cc0a57a40f4a69c8i0" },
  { domain: "pitbull.kas", price: "11,111 KAS", sold: false, rednoseAllocation: "0.111%", buyLink: "https://www.kaspa.com/domains/marketplace/pitbull.kas/62d5904c78d076884ad667a2c9f6218c3142d9d5b8fd6159f8a61137b5fa047ei0" },
  { domain: "netanyahu.kas", price: "10,000 KAS", sold: false, rednoseAllocation: "0.1%", buyLink: "https://www.kaspa.com/domains/marketplace/netanyahu.kas/79d541b431ed98690507be26c5ecb9f8df7a8e5d5cf6635286456400d4a02708i0" },
];

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
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-5xl font-semibold text-center text-gray-900">RedNose Domain Market</h1>
        <p className="text-lg text-gray-700 text-center max-w-3xl mx-auto">
          Explore our curated selection of premium Kaspa domains. Whether you’re looking for a memorable name, brand, or investment, each domain includes a RedNose allocation.
        </p>
      </div>

      {/* Stats */}
      <div className="space-y-6">
        <h2 className="text-4xl font-bold text-center text-gray-900">Market Stats Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { label: "Total KAS Sold", value: `${totalKasSold.toLocaleString()} KAS` },
            { label: "Total KAS Target", value: `${totalKasTarget.toLocaleString()} KAS` },
            { label: "Allocation Sold", value: `${totalAllocationSold.toFixed(3)}%` },
            { label: "Total Allocation", value: `${totalAllocationAll.toFixed(3)}%` },
          ].map(stat => (
            <div key={stat.label} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
              <p className="text-xl font-medium text-gray-600 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Domains Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
        <table className="min-w-full table-auto divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-[#70C7BA] to-[#54B2A1] text-white">
            <tr>
              {["Domain", "Price", "Allocation", "Sold", "Action"].map((h) => (
                <th key={h} className="px-6 py-4 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {domainsData.map((d, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">{d.domain}</td>
                <td className="px-6 py-4">{d.price}</td>
                <td className="px-6 py-4">{d.rednoseAllocation}</td>
                <td className="px-6 py-4">
                  <span className={`font-semibold ${d.sold ? "text-red-600" : "text-green-600"}`}>
                    {d.sold ? "Sold" : "Available"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {d.sold ? (
                    <span className="text-gray-400">Sold Out</span>
                  ) : (
                    <a
                      href={d.buyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#70C7BA] font-medium hover:text-[#54B2A1]"
                    >
                      Buy Now →
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
