// src/components/EcosystemDistribution.tsx
export default function EcosystemDistribution() {
  return (
    <section className="bg-[#122c2a] p-6 md:p-10 rounded-2xl shadow-lg text-gray-100 space-y-8">
      <h2 className="text-3xl font-bold text-kaspa-green">Ecosystem Fund & Distribution</h2>

      {/* Voting Details */}
      <div className="space-y-4">
        <p>
          Each vote costs <span className="font-semibold text-white">6 KAS</span>, which is sent entirely to the{" "}
          <span className="font-semibold text-white">KaspaDomains.com Ecosystem Fund</span>.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Voter receives <span className="font-semibold text-white">1 KDC</span> (minted).
          </li>
          <li>
            Domain owner earns <span className="font-semibold text-white">0.2 KDC</span> per vote received.
          </li>
        </ul>
      </div>

      {/* Launch Liquidity Info */}
      <div className="space-y-4">
        <h3 className="text-2xl font-semibold text-kaspa-green">Initial Liquidity</h3>
        <p>
          At launch,{" "}
          <span className="font-semibold text-white">420,000 KDC</span> (20% of supply) and{" "}
          <span className="font-semibold text-white">2.52 million KAS</span> were added to the{" "}
          <span className="font-semibold text-white">KDC/KAS liquidity pool</span>.
        </p>
        <p>
          <span className="font-semibold text-white">99.9% of LP tokens were burned</span>, making the liquidity{" "}
          <span className="italic">permanent and trustless</span>.
        </p>
        <p>
          🔗{" "}
          <a
            href="https://your-lp-burn-transaction-link" // Replace with real tx
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-400 hover:text-blue-300"
          >
            View LP burn transaction
          </a>
        </p>
      </div>

      {/* Supply Allocation */}
      <div className="space-y-4">
        <h3 className="text-2xl font-semibold text-kaspa-green">Future Strategy</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <span className="font-semibold text-white">10% of supply</span> is reserved for future listings and{" "}
            <span className="font-semibold text-white">KDC/USDT liquidity pools</span> managed by KaspaDomains.com.
          </li>
          <li>
            <span className="font-semibold text-white">0.3% trading fee</span> from KDC/USDT swaps will feed the ecosystem.
          </li>
          <li>
            <span className="font-semibold text-white">70% of supply</span> is reserved for community minting through
            voting (1 KDC per 24 KAS).
          </li>
        </ul>
      </div>
    </section>
  );
}
