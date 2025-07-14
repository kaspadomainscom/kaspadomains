'use client';

import { motion } from 'framer-motion';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const sectionVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const sections = [
  {
    title: 'What is KaspaDomains?',
    content: (
      <p className="text-lg leading-relaxed text-gray-300">
        <strong className="text-white">KaspaDomains.com</strong> is a decentralized on-chain experiment featuring a fixed collection of
        <strong> 10,000 unique <code className="text-kaspa-green">.kas</code> domains</strong>. These domains are not for sale but open for
        <strong> community-powered voting</strong>. Participate to help build a transparent reputation layer on Kaspa and earn rewards.
      </p>
    ),
  },
  {
    title: 'How It Works',
    content: (
      <>
        <p className="mb-4 leading-relaxed text-gray-300">
          Anyone can vote for a domain by paying a fixed fee of <span className="font-semibold text-kaspa-green">5 KAS</span>. Each vote triggers:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          <li>You receive KDC tokens as a reward</li>
          <li>The domain owner also earns the same amount of KDC</li>
        </ul>
        <p className="mt-4 leading-relaxed text-gray-300">
          KDC rewards halve every <strong>525,000 votes</strong>, continuing until the <strong>2.1 million</strong> supply is reached.
        </p>
      </>
    ),
  },
  {
    title: 'What Are KDC Tokens?',
    content: (
      <p className="leading-relaxed text-gray-300">
        <strong>KDC</strong> is the native ERC-20 reward token of KaspaDomains. There is no premine, no team allocation. All tokens are minted by the community through voting. It’s transparent and fair by design.
      </p>
    ),
  },
  {
    title: 'Decentralized, Fair, and Transparent',
    content: (
      <ul className="list-disc list-inside space-y-2 text-gray-300">
        <li>10,000 fixed domains</li>
        <li>No premine or dev allocation</li>
        <li>Minted by smart contract with halving every 525k votes</li>
        <li>ERC-20 compliant and tradable</li>
      </ul>
    ),
  },
  {
    title: 'Why Vote?',
    content: (
      <ul className="list-disc list-inside space-y-2 text-gray-300">
        <li>Support rare or meaningful <code className="text-kaspa-green">.kas</code> domains</li>
        <li>Earn KDC and build your on-chain identity</li>
        <li>Reward domain creators through your votes</li>
        <li>Signal popularity and reputation</li>
        <li>Help define value within Kaspa’s ecosystem</li>
      </ul>
    ),
  },
  {
    title: 'Not a Marketplace',
    content: (
      <p className="leading-relaxed text-gray-300">
        KaspaDomains doesn’t sell or auction domains. There are no buy buttons — only votes. It’s not a marketplace, it’s a social coordination protocol.
      </p>
    ),
  },
  {
    title: 'Vision for the Future',
    content: (
      <p className="leading-relaxed text-gray-300">
        The protocol is minimal and community-first. Any evolution will be driven by users, not devs. It’s designed to grow naturally, through participation.
      </p>
    ),
  },
];

export default function Learn() {
  return (
    <div className="min-h-screen bg-[#0b1e1d] text-gray-100 px-6 py-12">
      <motion.div
        className="max-w-5xl mx-auto space-y-12"
        variants={sectionVariants}
        initial="hidden"
        animate="show"
      >
        {sections.map((section, i) => (
          <motion.section
            key={i}
            className="bg-[#122c2a] p-6 md:p-8 rounded-2xl shadow-md border border-[#1d3b39]"
            variants={fadeInUp}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {section.title}
            </h2>
            {section.content}
          </motion.section>
        ))}

        <motion.footer
          className="pt-8 text-sm text-gray-400 border-t border-[#1f4442]"
          variants={fadeInUp}
        >
          <p>
            🌐 Explore, vote, and help build Kaspa’s decentralized naming ecosystem. 
            Follow us for updates on features, rewards, and governance.
          </p>
        </motion.footer>
      </motion.div>
    </div>
  );
}
