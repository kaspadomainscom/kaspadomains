'use client';

export default function Learn() {
  return (
    <div className="p-8 max-w-5xl mx-auto text-gray-100 space-y-10">
      <section>
        <h1 className="text-4xl font-extrabold tracking-tight text-kaspa-green mb-4">
          What is KaspaDomains?
        </h1>
        <p className="text-lg leading-relaxed">
          <strong className="text-white">KaspaDomains.com</strong> is a decentralized on-chain experiment featuring a fixed collection of <strong>10,000 unique <code className="text-kaspa-green">.kas</code> domains</strong>. 
          These domains are not for sale but open for <strong>community-powered voting</strong>. By participating, you help build a transparent reputation layer on Kaspa while earning rewards, shaping the future of decentralized digital identity.
        </p>
      </section>

      <section>
        <h2 className="text-3xl font-bold text-white mb-2">How It Works</h2>
        <p className="mb-4 leading-relaxed">
          Anyone can vote for a domain by paying a fixed fee of <span className="font-semibold text-kaspa-green">5 KAS</span>. Each vote triggers a minting process:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-200">
          <li>You receive a variable amount of <strong className="text-white">KDC tokens</strong> as a reward, starting at 1 KDC per vote.</li>
          <li>The domain owner simultaneously receives the same amount of KDC tokens for free as a reward.</li>
        </ul>
        <p className="mt-4 leading-relaxed">
          The KDC token reward halves every <strong>525,000 votes</strong>, reducing by half each time (for example, from 1 KDC to 0.5 KDC). This halving continues until the maximum supply of 2.1 million KDC tokens is reached, encouraging early participation.
        </p>
      </section>

      <section>
        <h2 className="text-3xl font-bold text-white mb-2">What Are KDC Tokens?</h2>
        <p className="leading-relaxed">
          <strong>KDC</strong> is the native ERC-20 reward token earned through voting. It reflects your participation in KaspaDomains. 
          There is a fixed maximum supply of 2.1 million tokens, minted exclusively through voting—there is no premine or developer allocation.
          The protocol is intentionally minimal and focused on transparency and fairness.
        </p>
      </section>

      <section>
        <h2 className="text-3xl font-bold text-white mb-2">Decentralized, Fair, and Transparent</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-200">
          <li>A fixed collection of <strong>10,000 domains</strong></li>
          <li><strong>No premine</strong>, no developer allocation, and no centralized authority</li>
          <li>Token rewards minted transparently by smart contracts, with halving every 525,000 votes</li>
          <li>KDC tokens are fully <strong>ERC-20 compliant</strong> and tradable</li>
        </ul>
      </section>

      <section>
        <h2 className="text-3xl font-bold text-white mb-2">Why Vote?</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-200">
          <li>Support rare, brandable, or meaningful <code className="text-kaspa-green">.kas</code> domains</li>
          <li>Earn KDC tokens as rewards and build your on-chain profile</li>
          <li>Help elevate domains by signaling popularity through votes</li>
          <li>Domain owners are rewarded with KDC tokens for each vote their domain receives</li>
          <li>Your vote directly influences which domains gain visibility and reputation within the Kaspa ecosystem</li>
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
          KaspaDomains is designed to be a simple, fully decentralized protocol prioritizing transparency, fairness, and community participation. 
          Any future evolution will be community-driven and unfold naturally as the ecosystem grows.
        </p>
      </section>

      <footer className="pt-6 border-t border-gray-700 text-sm text-gray-400">
        <p>
          🌐 Explore, vote, and help build Kaspa’s decentralized naming ecosystem. Follow us for updates on features, rewards, and governance.
        </p>
      </footer>
    </div>
  );
}
