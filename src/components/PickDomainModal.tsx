// src/components/PickDomainModal.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useMetaMask } from '@/hooks/metamask/useMetaMask';
import { useOwnedDomains } from '@/hooks/kns/useOwnedDomains';

export default function PickDomainModal() {
  const router = useRouter();
  const { account } = useMetaMask();
  const { data: domains, isLoading, isError, error } = useOwnedDomains(account);

  if (!account) {
    return <p className="text-center mt-10">Connect your wallet to continue.</p>;
  }

  if (isLoading) {
    return <p className="text-center mt-10">Loading your domains...</p>;
  }

  if (isError) {
    return <p className="text-center mt-10 text-red-500">Error: {error.message}</p>;
  }

  if (!domains || domains.length === 0) {
    return <p className="text-center mt-10">No KNS domains found for this wallet.</p>;
  }

  return (
    <div className="max-w-lg mx-auto mt-10 bg-[#0F2F2E] border border-kaspaMint rounded-xl p-6 shadow-md">
      <h2 className="text-xl font-semibold text-white mb-4">Pick a domain to configure</h2>
      <ul className="space-y-2">
        {domains.map((domain) => (
          <li key={domain.assetId}>
            <button
              onClick={() => router.push(`/domain/new?name=${encodeURIComponent(domain.asset)}`)}
              className="w-full text-left px-4 py-2 bg-kaspaMint text-[#0F2F2E] hover:bg-[#3DFDAD]/90 rounded-md transition"
            >
              {domain.asset}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
