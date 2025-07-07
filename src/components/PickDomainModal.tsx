'use client';

import { DomainAsset } from '@/hooks/kns/types';
import { useListDomain } from '@/hooks/domain/useListDomain';
import { useState } from 'react';

type PickDomainModalProps = {
  domains?: DomainAsset[];
  evmAccount?: string | null;
  kaspaAccount?: string | null;
};

export default function PickDomainModal({
  domains,
  evmAccount,
  kaspaAccount,
}: PickDomainModalProps) {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const { listDomain, txHash, isLoading: listing, error: listError } = useListDomain();

  const verifiedDomains = domains?.filter((domain) => domain.isVerifiedDomain === true);

  if (!evmAccount || !kaspaAccount) {
    return (
      <p className="text-center mt-10 text-white">
        Connect both Kasware and MetaMask wallets to continue.
      </p>
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

      <p className="text-sm text-kaspaMint mb-2">
        Total verified domains: {verifiedDomains.length}
      </p>

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
                {listing && selectedDomain === domain.asset ? 'Listing…' : 'List for 420 KAS'}
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
