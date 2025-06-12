'use client';

import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/wallet/useWallet'; // Kasware or MetaMask wallet hook
import { useOwnedDomains } from '@/hooks/kns/api/useOwnedDomains';
import { DomainAsset } from '@/hooks/kns/types';

type PickDomainModalProps = {
  domains?: DomainAsset[];
};

export default function PickDomainModal({ domains: externalDomains }: PickDomainModalProps) {
  const router = useRouter();
  const { account, walletType, isCorrectNetwork } = useWallet(); // Includes Kasware + MetaMask

  const {
    data: walletDomainsData,
    isLoading,
    isError,
    error,
  } = useOwnedDomains(account);

  const domains: DomainAsset[] | undefined = externalDomains ?? walletDomainsData?.domains;

  if (!account) {
    return (
      <p className="text-center mt-10 text-white">
        Connect your wallet to continue.
      </p>
    );
  }

  if (walletType === 'metamask' && !isCorrectNetwork) {
    return (
      <p className="text-center mt-10 text-yellow-300">
        Please switch to the <strong>Kasplex Testnet</strong> in MetaMask to continue.
      </p>
    );
  }

  if (!externalDomains && isLoading) {
    return (
      <p className="text-center mt-10 text-white">
        Loading your domains...
      </p>
    );
  }

  if (!externalDomains && isError) {
    return (
      <pre className="text-center mt-10 text-red-500 whitespace-pre-wrap bg-red-100 p-4 rounded text-sm">
        Error: {error?.message ?? 'Unknown error'}
      </pre>
    );
  }

  if (!domains || domains.length === 0) {
    return (
      <p className="text-center mt-10 text-white">
        No KNS domains found for this wallet.
      </p>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-10 bg-[#0F2F2E] border border-kaspaMint rounded-xl p-6 shadow-md">
      <h2 className="text-xl font-semibold text-white mb-4">Pick a domain to configure</h2>

      {walletDomainsData?.pagination && (
        <p className="text-sm text-kaspaMint mb-2">
          Total domains: {walletDomainsData.pagination.totalItems}
        </p>
      )}

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
