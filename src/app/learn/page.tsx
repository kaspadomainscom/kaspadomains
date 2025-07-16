'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

// Dummy contract data fetcher, replace with your contract calls
async function fetchContractData() {
  return {
    totalVotes: 750000,
    totalKDCMinted: 900000,
    currentReward: 1, // KDC per vote
    totalLiquidityKAS: 2520000,
    totalLiquidityKDC: 420000,
  };
}

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const sectionVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12 },
  },
};

// Format large numbers with commas
function formatNumber(num: number) {
  return num.toLocaleString();
}

export default function Learn() {
  const [contractData, setContractData] = useState({
    totalVotes: 0,
    totalKDCMinted: 0,
    currentReward: 1,
    totalLiquidityKAS: 0,
    totalLiquidityKDC: 0,
  });

  useEffect(() => {
    fetchContractData().then(setContractData);
  }, []);

  const supplyDistributionData = [
    { name: 'Minted KDC', value: contractData.totalKDCMinted },
    { name: 'Remaining KDC', value: Math.max(0, 2100000 - contractData.totalKDCMinted) },
  ];

  const COLORS = ['#21bf73', '#116530'];

  const halvingData = [
    { stage: '0-525k votes', reward: 2 },
    { stage: '525k-1.05m votes', reward: 1 },
    { stage: '1.05m-1.575m votes', reward: 0.5 },
    { stage: '1.575m-2.1m votes', reward: 0.25 },
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
          <h2 className="text-4xl font-bold text-white mb-6">What is KaspaDomains?</h2>
          <p className="text-lg leading-relaxed text-gray-300">
            <strong className="text-white">KaspaDomains.com</strong> is a decentralized on-chain experiment featuring a fixed
            collection of <strong>10,000 unique <code className="text-kaspa-green">.kas</code> domains</strong>. These domains are
            not for sale but open for <strong>community-powered voting</strong>. Participate to help build a transparent reputation
            layer on Kaspa and earn rewards in KDC tokens.
          </p>
        </motion.section>

        {/* How It Works */}
        <motion.section
          className="bg-[#122c2a] p-6 md:p-8 rounded-2xl shadow-md border border-[#1d3b39]"
          variants={fadeInUp}
        >
          <h2 className="text-4xl font-bold text-white mb-6">How It Works</h2>
          <p className="mb-4 leading-relaxed text-gray-300">
            Anyone can vote for a domain by paying a fixed fee of{' '}
            <span className="font-semibold text-kaspa-green">6 KAS</span>. Each vote:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
            <li>Rewards the voter with 1 KDC token</li>
            <li>Rewards the domain owner with 1 KDC token</li>
            <li>Splits the 6 KAS payment: 3 KAS to the domain owner, 3 KAS to the ecosystem fund</li>
          </ul>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <motion.div
              className="bg-[#1d3b39] rounded-lg p-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="text-sm uppercase text-gray-400">Total Votes</div>
              <div className="text-2xl font-bold text-kaspa-green">{formatNumber(contractData.totalVotes)}</div>
            </motion.div>
            <motion.div
              className="bg-[#1d3b39] rounded-lg p-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-sm uppercase text-gray-400">Minted KDC</div>
              <div className="text-2xl font-bold text-kaspa-green">{formatNumber(contractData.totalKDCMinted)}</div>
            </motion.div>
            <motion.div
              className="bg-[#1d3b39] rounded-lg p-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="text-sm uppercase text-gray-400">Current Reward</div>
              <div className="text-2xl font-bold text-kaspa-green">{contractData.currentReward} KDC/vote</div>
            </motion.div>
            <motion.div
              className="bg-[#1d3b39] rounded-lg p-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="text-sm uppercase text-gray-400">Liquidity (KAS/KDC)</div>
              <div className="text-2xl font-bold text-kaspa-green">
                {formatNumber(contractData.totalLiquidityKAS)} KAS / {formatNumber(contractData.totalLiquidityKDC)} KDC
              </div>
            </motion.div>
          </div>

          {/* Voting KAS split diagram */}
          <div className="w-full h-48 max-w-md mx-auto">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Domain Owner', value: 3 },
                    { name: 'Ecosystem Fund', value: 3 },
                  ]}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label
                >
                  <Cell fill="#21bf73" />
                  <Cell fill="#116530" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-6 leading-relaxed text-gray-300">
            KDC rewards halve every <strong>525,000 votes</strong>, continuing until the fixed max supply of{' '}
            <strong>2.1 million</strong> tokens is fully minted.
          </p>

          {/* Halving chart */}
          <div className="mt-8 w-full h-48 max-w-3xl mx-auto">
            <ResponsiveContainer>
              <BarChart data={halvingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="reward" fill="#21bf73" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        {/* What Are KDC Tokens? */}
        <motion.section
          className="bg-[#122c2a] p-6 md:p-8 rounded-2xl shadow-md border border-[#1d3b39]"
          variants={fadeInUp}
        >
          <h2 className="text-4xl font-bold text-white mb-6">What Are KDC Tokens?</h2>
          <p className="leading-relaxed text-gray-300">
            <strong>KDC</strong> is the native ERC-20 reward token of KaspaDomains. 100% of its supply is minted by the community. There is no premine,
            no dev allocation, and no private sales. Its value is backed by real participation.
          </p>
        </motion.section>

        {/* Ecosystem Fund and Liquidity */}
        <motion.section
          className="bg-[#122c2a] p-6 md:p-8 rounded-2xl shadow-md border border-[#1d3b39]"
          variants={fadeInUp}
        >
          <h2 className="text-4xl font-bold text-white mb-6">Ecosystem Fund and Liquidity</h2>
          <p className="leading-relaxed text-gray-300 mb-8">
            All KAS collected from voting fees goes to the <strong>EcosystemFund</strong> smart contract. This fund is used to support listings,
            liquidity, marketing, and future governance. On launch, <strong>420,000 KDC</strong> tokens will be paired with{' '}
            <strong>2,520,000 KAS</strong> in liquidity and permanently locked via LP burn. This gives the token strong fundamentals and price reliability.
            Additional smaller pools (like KDC/USDT) may be created by the Ecosystem Fund for broader access, but only the burned LP pool is permanent and trustless.
          </p>

          {/* Supply distribution pie chart */}
          <div className="w-full h-48 max-w-md mx-auto">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={supplyDistributionData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label={({ name, percent }) =>
                    `${name}: ${percent !== undefined ? (percent * 100).toFixed(0) : '0'}%`
                  }
                >
                  {supplyDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
