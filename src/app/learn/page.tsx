'use client';

export default function Learn() {
  return (
    <div className="p-8 max-w-5xl mx-auto text-gray-100 space-y-10">
      <section>
        <h1 className="text-4xl font-extrabold tracking-tight text-kaspa-green mb-4">
          What is KaspaDomains?
        </h1>
        <p className="text-lg leading-relaxed">
          <strong className="text-white">KaspaDomains.com</strong> is a decentralized on-chain experiment showcasing 
          <strong> 10,000 unique <code className="text-kaspa-green">.kas</code> domains</strong> — not for sale, but open for 
          <strong> community-powered voting</strong>. It’s a new way to explore the Kaspa identity layer, earn rewards, and participate in a transparent token economy.
        </p>
      </section>

      <section>
        <h2 className="text-3xl font-bold text-white mb-2">How It Works</h2>
        <p className="mb-4 leading-relaxed">
          Anyone can vote for a domain by paying a small fee of <span className="font-semibold text-kaspa-green">5 KAS</span>. Each vote triggers a minting process:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-200">
          <li>You receive <strong className="text-white">1 KDC</strong> (Kaspa Domains Coin), the reward token of the ecosystem.</li>
          <li>You also receive <strong className="text-white">1 ERC-20 token</strong> representing the domain you voted for.</li>
          <li>The domain owner receives <strong className="text-white">1 KDC</strong> and <strong>0.1 domain token</strong>.</li>
        </ul>
        <p className="mt-4 leading-relaxed">
          Every domain gets its own ERC-20 contract dynamically deployed on first vote. These tokens are liquid, transparent, and may reflect a domain’s popularity or value.
        </p>
      </section>

      <section>
        <h2 className="text-3xl font-bold text-white mb-2">What Are KDC Tokens?</h2>
        <p className="leading-relaxed">
          <strong>KDC</strong> is the native ERC-20 reward token earned through voting. It reflects your participation in the KaspaDomains protocol. 
          In the future, it may unlock governance rights, staking opportunities, or special community perks.
        </p>
      </section>

      <section>
        <h2 className="text-3xl font-bold text-white mb-2">Decentralized, Fair, and Transparent</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-200">
          <li>Fixed supply of <strong>10,000 domains</strong></li>
          <li><strong>No premine</strong>, no dev allocation, no centralized control</li>
          <li>All token rewards are minted transparently by smart contracts</li>
          <li>KDC and domain tokens are fully <strong>ERC-20 compliant</strong> and tradable</li>
        </ul>
      </section>

      <section>
        <h2 className="text-3xl font-bold text-white mb-2">Why Vote?</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-200">
          <li>Support rare, brandable, or meaningful .kas domains</li>
          <li>Earn token rewards and build your on-chain profile</li>
          <li>Help elevate domains by signaling popularity through votes</li>
          <li>Contribute to a decentralized reputation and value layer</li>
        </ul>
      </section>

      <section>
        <h2 className="text-3xl font-bold text-white mb-2">Not a Marketplace</h2>
        <p className="leading-relaxed">
          KaspaDomains doesn’t sell, auction, or transfer domain ownership. 
          There are no buy buttons — only votes. It’s a social protocol, not a trading platform.
        </p>
      </section>

      <section>
        <h2 className="text-3xl font-bold text-white mb-2">Vision for the Future</h2>
        <p className="leading-relaxed">
          We aim to expand utility for both KDC and domain tokens: staking, rankings, DAO governance, airdrops, and more. 
          Early voters and domain supporters may shape the future of the Kaspa identity layer.
        </p>
      </section>

      <footer className="pt-6 border-t border-gray-700 text-sm text-gray-400">
        <p>
          🌐 Explore, vote, and help build Kaspa’s decentralized naming ecosystem.
          Follow us for updates on features, rewards, and governance.
        </p>
      </footer>
    </div>
  );
}
