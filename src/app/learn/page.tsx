'use client';

export default function Learn() {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-gray-100 px-6 py-12">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Intro */}
        <section className="bg-[#1a1a1a] p-6 rounded-2xl shadow-md">
          <h1 className="text-4xl font-extrabold tracking-tight text-kaspa-green mb-4">
            What is KaspaDomains?
          </h1>
          <p className="text-lg leading-relaxed">
            <strong className="text-white">KaspaDomains.com</strong> is a decentralized on-chain experiment featuring a fixed collection of 
            <strong> 10,000 unique <code className="text-kaspa-green">.kas</code> domains</strong>. 
            These domains are not for sale but open for <strong>community-powered voting</strong>. 
            By participating, you help build a transparent reputation layer on Kaspa while earning rewards, 
            shaping the future of decentralized digital identity.
          </p>
        </section>

        {/* How It Works */}
        <section className="bg-[#1a1a1a] p-6 rounded-2xl shadow-md">
          <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
          <p className="mb-4 leading-relaxed">
            Anyone can vote for a domain by paying a fixed fee of 
            <span className="font-semibold text-kaspa-green"> 5 KAS</span>. Each vote triggers a minting process:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>You receive a variable amount of <strong className="text-white">KDC tokens</strong> as a reward, starting at 1 KDC per vote.</li>
            <li>The domain owner simultaneously receives the same amount of KDC tokens as a reward.</li>
          </ul>
          <p className="mt-4 leading-relaxed">
            The KDC token reward halves every <strong>525,000 votes</strong>, reducing each time (e.g., from 1 KDC to 0.5 KDC) until the 2.1 million max supply is reached—rewarding early participants.
          </p>
        </section>

        {/* KDC Tokens */}
        <section className="bg-[#1a1a1a] p-6 rounded-2xl shadow-md">
          <h2 className="text-3xl font-bold text-white mb-4">What Are KDC Tokens?</h2>
          <p className="leading-relaxed">
            <strong>KDC</strong> is the native ERC-20 reward token earned through voting. It reflects your participation in KaspaDomains.
            With a fixed supply of 2.1 million tokens, all KDC is minted through voting—no premine, no dev allocation. 
            It’s a protocol rooted in transparency and fairness.
          </p>
        </section>

        {/* Core Principles */}
        <section className="bg-[#1a1a1a] p-6 rounded-2xl shadow-md">
          <h2 className="text-3xl font-bold text-white mb-4">Decentralized, Fair, and Transparent</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>A fixed collection of <strong>10,000 domains</strong></li>
            <li><strong>No premine</strong>, no developer allocation, and no centralized authority</li>
            <li>Token rewards minted transparently by smart contracts with halving every 525,000 votes</li>
            <li>KDC tokens are fully <strong>ERC-20 compliant</strong> and tradable</li>
          </ul>
        </section>

        {/* Why Vote */}
        <section className="bg-[#1a1a1a] p-6 rounded-2xl shadow-md">
          <h2 className="text-3xl font-bold text-white mb-4">Why Vote?</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>Support rare, brandable, or meaningful <code className="text-kaspa-green">.kas</code> domains</li>
            <li>Earn KDC tokens and build your on-chain profile</li>
            <li>Boost domains by signaling popularity through votes</li>
            <li>Domain owners earn KDC with every vote on their domain</li>
            <li>Your vote shapes visibility and reputation across the Kaspa ecosystem</li>
            <li>Contribute to decentralized reputation and value systems</li>
          </ul>
        </section>

        {/* Not a Marketplace */}
        <section className="bg-[#1a1a1a] p-6 rounded-2xl shadow-md">
          <h2 className="text-3xl font-bold text-white mb-4">Not a Marketplace</h2>
          <p className="leading-relaxed">
            KaspaDomains doesn’t sell, auction, or transfer domain ownership. 
            There are no buy buttons — only votes. It’s a social protocol, not a trading platform.
          </p>
        </section>

        {/* Vision */}
        <section className="bg-[#1a1a1a] p-6 rounded-2xl shadow-md">
          <h2 className="text-3xl font-bold text-white mb-4">Vision for the Future</h2>
          <p className="leading-relaxed">
            KaspaDomains is built to be a minimal, decentralized, and fair protocol. 
            Any future features or governance will evolve from the community as adoption grows.
          </p>
        </section>

        {/* Footer */}
        <footer className="pt-8 text-sm text-gray-500 border-t border-gray-700">
          <p>
            🌐 Explore, vote, and help build Kaspa’s decentralized naming ecosystem. 
            Follow us for updates on features, rewards, and governance.
          </p>
        </footer>
      </div>
    </div>
  );
}
