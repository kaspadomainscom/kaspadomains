// src/components/PickDomainModal.tsx
'use client';

import { useOwnedDomains } from '@/hooks/kns/api/useOwnedDomains';
import { DomainAsset } from '@/hooks/kns/types';
import { useWalletContext } from '@/context/WalletContext';
import { useListDomain } from '@/hooks/domain/useListDomain';
import { useState } from 'react';

type PickDomainModalProps = {
  domains?: DomainAsset[];
};

export default function PickDomainModal({ domains: externalDomains }: PickDomainModalProps) {
  const { account } = useWalletContext();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const {
    data: walletDomainsData,
    isLoading,
    isError,
    error,
  } = useOwnedDomains(account ?? null);

  const { listDomain, txHash, isLoading: listing, error: listError } = useListDomain();

  const domains: DomainAsset[] | undefined = externalDomains ?? walletDomainsData?.domains;
  const verifiedDomains = domains?.filter((domain) => domain.isVerifiedDomain === true);

  if (!account) {
    return <p className="text-center mt-10 text-white">Connect your wallet to continue.</p>;
  }

  if (!externalDomains && isLoading) {
    return <p className="text-center mt-10 text-white">Loading your domains...</p>;
  }

  if (!externalDomains && isError) {
    return (
      <pre className="text-center mt-10 text-red-500 whitespace-pre-wrap bg-red-100 p-4 rounded text-sm">
        Error: {error?.message ?? 'Unknown error'}
      </pre>
    );
  }

  if (!verifiedDomains || verifiedDomains.length === 0) {
    return (
      <p className="text-center mt-10 text-white">
        No verified KNS domains found for this wallet.
      </p>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-10 bg-[#0F2F2E] border border-kaspaMint rounded-xl p-6 shadow-md">
      <h2 className="text-xl font-semibold text-white mb-4">Pick a domain to list</h2>

      {walletDomainsData?.pagination && (
        <p className="text-sm text-kaspaMint mb-2">
          Total verified domains: {verifiedDomains.length}
        </p>
      )}

      <ul className="space-y-2">
        {verifiedDomains.map((domain) => (
          <li key={domain.assetId}>
            <button
              onClick={async () => {
                setSelectedDomain(domain.asset);
                await listDomain(domain.asset);
              }}
              disabled={listing && selectedDomain === domain.asset}
              className="w-full flex items-center justify-between px-4 py-2 bg-kaspaMint text-[#0F2F2E] hover:bg-[#3DFDAD]/90 rounded-md transition"
            >
              <span>{domain.asset}</span>
              <span className="text-xs text-[#0F2F2E] font-semibold">
                {listing && selectedDomain === domain.asset
                  ? 'Listing…'
                  : 'List for 420 KAS'}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {txHash && (
        <p className="text-green-400 text-sm mt-4 break-all">
          Domain listed! Tx:{' '}
          <a
            href={`https://frontend.kasplextest.xyz/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {txHash.slice(0, 12)}...
          </a>
        </p>
      )}

      {listError && <p className="text-red-400 text-sm mt-2">Error: {listError}</p>}
    </div>
  );
}
