'use client';

import EcosystemDistribution from '@/components/pages/learn/EcosystemDistribution';
import { useEffect, useState } from 'react';

async function fetchContractData() {
  return {
    totalVotes: 750000,
    totalKDCMinted: 900000,
    currentReward: 1,
    totalLiquidityKAS: 2520000,
    totalLiquidityKDC: 420000,
  };
}

function formatNumber(n: number) {
  return n.toLocaleString();
}

export default function Learn() {
  const [data, setData] = useState({
    totalVotes: 0,
    totalKDCMinted: 0,
    currentReward: 1,
    totalLiquidityKAS: 0,
    totalLiquidityKDC: 0,
  });

  useEffect(() => {
    fetchContractData().then(setData);
  }, []);

  const halving = [
    { stage: '0–525k votes', reward: 2 },
    { stage: '525k–1.05m votes', reward: 1 },
    { stage: '1.05m–1.575m votes', reward: 0.5 },
    { stage: '1.575m–2.1m votes', reward: 0.25 },
  ];

  const voteProgress = Math.min(data.totalVotes / 2100000, 1);

  return (
    <div className="min-h-screen bg-[#0b1e1d] text-gray-100 px-6 py-12">
      <div className="max-w-5xl mx-auto space-y-12">

        {/* Intro */}
        <section className="bg-[#122c2a] p-6 md:p-8 rounded-2xl shadow-md border border-[#1d3b39]">
          <h2 className="text-4xl font-bold text-white mb-4">What is KaspaDomains?</h2>
          <p className="text-gray-300 leading-relaxed">
            <span className="text-white font-semibold">KaspaDomains.com</span> is a community‑powered registry for KNS <code className="text-kaspa-green">.kas</code> domains.
            Any KNS domain holder can register their name, then open it for public voting. Votes highlight the most valued domains
            and mint KDC tokens to voters and domain owners—no auctions, only votes and rewards.
          </p>
        </section>

        {/* How it works */}
        <section className="bg-[#122c2a] p-6 md:p-8 rounded-2xl shadow-md border border-[#1d3b39]">
          <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-gray-300 mb-4">
            Pay <span className="text-kaspa-green font-semibold">6 KAS</span> to vote on a domain:
          </p>
          <ul className="list-disc list-inside text-gray-300 space-y-1 mb-6">
            <li>Voter receives <strong>1 KDC</strong></li>
            <li>Domain owner receives <strong>0.2 KDC</strong></li>
            <li><strong>6 KAS</strong> goes to the KaspaDomains.com fund</li>
          </ul>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            {[
              ['Total Votes', formatNumber(data.totalVotes)],
              ['Minted KDC', formatNumber(data.totalKDCMinted)],
              ['Reward/vote', `${data.currentReward} KDC`],
              ['Liquidity KAS/KDC', `${formatNumber(data.totalLiquidityKAS)} / ${formatNumber(data.totalLiquidityKDC)}`],
            ].map(([label, value], i) => (
              <div key={i} className="bg-[#1d3b39] rounded-lg p-4 text-center">
                <div className="text-xs uppercase text-gray-400">{label}</div>
                <div className="text-2xl font-bold text-kaspa-green">{value}</div>
              </div>
            ))}
          </div>

          {/* Vote Progress Bar */}
          <div className="mb-8">
            <div className="text-sm text-gray-400 mb-1">
              Progress to max supply ({formatNumber(data.totalVotes)} / 2,100,000 votes)
            </div>
            <div className="w-full h-4 bg-[#1a3533] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#3bf5b2] to-[#1e3d38]"
                style={{ width: `${(voteProgress * 100).toFixed(2)}%` }}
              />
            </div>
          </div>

          {/* Halving */}
          <p className="text-gray-300 leading-relaxed mb-4">
            Rewards halve every <strong>525,000 votes</strong> until max supply of <strong>2.1 M</strong> KDC.
          </p>
          <div className="space-y-2">
            {halving.map((h, idx) => (
              <div
                key={idx}
                className="flex justify-between bg-[#1d3b39] rounded px-4 py-2 text-gray-300 text-sm"
              >
                <span>{h.stage}</span>
                <span>{h.reward} KDC</span>
              </div>
            ))}
          </div>
        </section>

        {/* KDC Tokens */}
        <section className="bg-[#122c2a] p-6 md:p-8 rounded-2xl shadow-md border border-[#1d3b39]">
          <h2 className="text-4xl font-bold text-white mb-4">What Are KDC Tokens?</h2>
          <p className="text-gray-300">
            <strong>KDC</strong> is the native ERC‑20 reward token (2.1 M total):
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-300">
            <li><strong>20%</strong> (420 k) pre‑minted & LP‑burned for liquidity</li>
            <li><strong>10%</strong> reserved for future listings</li>
            <li><strong>70%</strong> (1.47 M) community-minted via voting:
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li><strong>83.33%</strong> → voters (≈1.225 M)</li>
                <li><strong>16.67%</strong> → domain owners (≈245 k)</li>
              </ul>
            </li>
          </ul>
          <p className="mt-4 text-gray-300">
            No private sales, no team allocations — everything is earned on‑chain.
          </p>
        </section>

        {/* Ecosystem Fund */}
        <EcosystemDistribution />

          {/* Token Pie Chart */}
          {/* <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden mb-6">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#3bf5b2] via-[#5fcf8f] to-[#1e3d38]" />
            <div className="absolute inset-4 bg-[#0b1e1d] rounded-full flex items-center justify-center text-center text-gray-400 text-sm">
              20% LP<br />64% Voters<br />16% Owners
            </div>
          </div>
        </section> */}

      </div>
    </div>
  );
}
