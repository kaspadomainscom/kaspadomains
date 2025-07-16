'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

async function fetchContractData() {
  return {
    totalVotes: 750000,
    totalKDCMinted: 900000,
    currentReward: 1,
    totalLiquidityKAS: 2520000,
    totalLiquidityKDC: 420000,
  };
}

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const sectionVariants = {
  hidden: {},
  show:  { transition: { staggerChildren: 0.12 } },
};

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

  return (
    <div className="min-h-screen bg-[#0b1e1d] text-gray-100 px-6 py-12">
      <motion.div
        className="max-w-5xl mx-auto space-y-12"
        variants={sectionVariants}
        initial="hidden"
        animate="show"
      >
        {/* What is KaspaDomains? */}
        <motion.section
          className="bg-[#122c2a] p-6 md:p-8 rounded-2xl shadow-md border border-[#1d3b39]"
          variants={fadeInUp}
        >
          <h2 className="text-4xl font-bold text-white mb-4">What is KaspaDomains?</h2>
          <p className="text-gray-300 leading-relaxed">
            <span className="text-white font-semibold">KaspaDomains.com</span> is a community‑powered
            registry for KNS <code className="text-kaspa-green">.kas</code> domains. Any KNS domain holder
            can register their name, then open it for public voting. Votes highlight the most valued domains
            and mint KDC tokens to voters and domain owners—no auctions, only votes and rewards.
          </p>
        </motion.section>

        {/* How It Works */}
        <motion.section
          className="bg-[#122c2a] p-6 md:p-8 rounded-2xl shadow-md border border-[#1d3b39]"
          variants={fadeInUp}
        >
          <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            Pay <span className="text-kaspa-green font-semibold">6 KAS</span> to vote on a domain:
          </p>
          <ul className="list-disc list-inside text-gray-300 space-y-1 mb-6">
            <li>Voter receives <strong>1 KDC</strong></li>
            <li>Domain owner receives <strong>0.25 KDC</strong></li>
            <li><strong>6 KAS</strong> → ecosystem fund</li>
          </ul>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {[
              ['Total Votes', formatNumber(data.totalVotes)],
              ['Minted KDC', formatNumber(data.totalKDCMinted)],
              ['Reward/vote', `${data.currentReward} KDC`],
              ['Liquidity KAS/KDC', `${formatNumber(data.totalLiquidityKAS)} / ${formatNumber(data.totalLiquidityKDC)}`],
            ].map(([label, value], i) => (
              <motion.div
                key={i}
                className="bg-[#1d3b39] rounded-lg p-4 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (i + 1) }}
              >
                <div className="text-xs uppercase text-gray-400">{label}</div>
                <div className="text-2xl font-bold text-kaspa-green">{value}</div>
              </motion.div>
            ))}
          </div>

          {/* KAS Split */}
          <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden mb-6">
            <div className="absolute inset-0 bg-kas-fund-split" />
            <div className="absolute inset-4 bg-[#0b1e1d] rounded-full flex items-center justify-center">
              <div className="text-center text-gray-400 text-sm">
                6 KAS Fund
              </div>
            </div>
          </div>

          <p className="text-gray-300 leading-relaxed mb-6">
            Rewards halve every <strong>525,000 votes</strong> until the max supply of <strong>2.1 M</strong> KDC is minted.
          </p>

          {/* Halving Table */}
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
        </motion.section>

        {/* What Are KDC Tokens? */}
        <motion.section
          className="bg-[#122c2a] p-6 md:p-8 rounded-2xl shadow-md border border-[#1d3b39]"
          variants={fadeInUp}
        >
          <h2 className="text-4xl font-bold text-white mb-4">What Are KDC Tokens?</h2>
          <p className="text-gray-300 leading-relaxed">
            <strong>KDC</strong> is the native ERC‑20 reward token (2.1 M total):
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-300">
            <li><strong>20%</strong> (420 k) pre‑minted & LP‑burned for liquidity</li>
            <li><strong>80%</strong> (1.68 M) community‑minted via voting:
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li><strong>80%</strong> → voters</li>
                <li><strong>20%</strong> → domain owners</li>
              </ul>
            </li>
          </ul>
          <p className="mt-4 text-gray-300 leading-relaxed">
            No private sales, no team allocations—everything is earned on‑chain.
          </p>
        </motion.section>

        {/* Ecosystem Fund & Distribution */}
        <motion.section
          className="bg-[#122c2a] p-6 md:p-8 rounded-2xl shadow-md border border-[#1d3b39]"
          variants={fadeInUp}
        >
          <h2 className="text-4xl font-bold text-white mb-4">Ecosystem Fund & Distribution</h2>
          <p className="text-gray-300 leading-relaxed mb-6">
            Voting fees (6 KAS each) feed the <strong>EcosystemFund</strong>. On launch, 420 k KDC + 2.52 M KAS were locked as LP.
            Future USDT/KDC pools will be owned by KaspaDomains.com to collect trading fees (0.3% per swap), but only the burned LP
            remains permanent and trustless.
          </p>

          {/* Token Distribution Pie */}
          <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-token-distribution" />
            <div className="absolute inset-4 bg-[#0b1e1d] rounded-full flex items-center justify-center">
              <div className="text-center text-gray-400 text-sm">
                20% LP<br />64% Voters<br />16% Owners
              </div>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
