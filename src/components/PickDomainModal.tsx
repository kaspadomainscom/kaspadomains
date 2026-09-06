'use client';

import { DomainAsset } from '@/hooks/kns/types';
import { useListDomain } from '@/hooks/domain/useListDomain';
import { useSetDomainCategories } from '@/hooks/domain/useSetDomainCategories';
import { useGetAllowedCategories } from '@/hooks/domains/useGetAllowedCategories';
import { isSupabaseConfigured } from '@/lib/supabase';
import { LEGACY_KASPLEX_TESTNET } from '@/lib/kaspaDomainRuntime';
import { LISTING_FEE_SOMPI, formatKas } from '@/lib/fees';
import { useState } from 'react';

type PickDomainModalProps = {
  domains?: DomainAsset[];
  evmAccount: string | null;
  kaspaAccount: string | null;
};

export default function PickDomainModal({
  domains = [],
  evmAccount,
  kaspaAccount,
}: PickDomainModalProps) {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [listedDomain, setListedDomain] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const { listDomain, txHash, isLoading: listing, error: listError } = useListDomain();
  const { setCategories, isLoading: assigningCategories } = useSetDomainCategories();
  // `options` carries titles; `categories` is keys only. Rendering the keys
  // showed people raw slugs -- "realWords", "999club" -- as if they were labels.
  const {
    options: categoryOptions,
    loading: categoriesLoading,
    error: categoriesError,
  } = useGetAllowedCategories();

  const verifiedDomains = domains.filter((domain) => domain.isVerifiedDomain === true);
  const busy = listing || assigningCategories;

  function toggleCategory(category: string) {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  }

  // Require both wallets connected
  // Same rule as the page above: the database path signs with the Kaspa L1
  // key, so only `kaspaAccount` is universally required.
  if (!kaspaAccount || (!isSupabaseConfigured && !evmAccount)) {
    return (
      <p className="text-center mt-10 text-white">
        Connect your Kasware wallet to continue.
      </p>
    );
  }

  // No verified domains found
  if (verifiedDomains.length === 0) {
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

      {/* Category selection — required before a domain can be listed */}
      <div className="mb-4">
        <p className="text-sm text-white font-medium mb-2">
          Choose at least one category <span className="text-red-400">*</span>
        </p>
        {categoriesLoading ? (
          <p className="text-sm text-gray-400">Loading categories…</p>
        ) : categoriesError ? (
          // The hook sets `error` and also empties the list, and this component
          // used to read only the list -- so a failed load blamed an empty
          // catalogue. On this page that is worse than a wrong message: listing
          // requires a category, so the user is blocked and told the wrong
          // reason for it.
          <p className="text-sm text-red-400">
            {categoriesError} You can&apos;t list a domain until this loads — please try
            again shortly.
          </p>
        ) : categoryOptions.length === 0 ? (
          <p className="text-sm text-red-400">No categories available right now.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((option) => {
              const active = selectedCategories.includes(option.key);
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => toggleCategory(option.key)}
                  disabled={busy}
                  aria-pressed={active}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition
                    ${active
                      ? 'bg-kaspaMint text-[#0F2F2E] border-kaspaMint'
                      : 'bg-transparent text-gray-300 border-gray-600 hover:border-kaspaMint'
                    }`}
                >
                  {option.title}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ul className="space-y-2">
        {verifiedDomains.map((domain) => (
          <li key={domain.assetId}>
            <button
              onClick={async () => {
                if (selectedCategories.length === 0) return;
                setSelectedDomain(domain.asset);
                try {
                  const result = await listDomain(domain.asset, selectedCategories);
                  // The database path writes the listing and its categories in
                  // one request, so a second call here would be a duplicate.
                  // The on-chain path still needs its separate write.
                  if (result && !isSupabaseConfigured) {
                    await setCategories(domain.asset, evmAccount as `0x${string}`, selectedCategories);
                  }
                  if (result) setListedDomain(domain.asset);
                } catch {
                  // errors are surfaced via toasts inside the hooks
                }
              }}
              disabled={busy || selectedCategories.length === 0}
              className={`w-full flex items-center justify-between px-4 py-2 rounded-md transition
                ${busy && selectedDomain === domain.asset
                  ? 'bg-[#3DFDAD]/90 text-[#0F2F2E] cursor-wait'
                  : selectedCategories.length === 0
                  ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  : 'bg-kaspaMint text-[#0F2F2E] hover:bg-[#3DFDAD]/90 cursor-pointer'
                }`}
              aria-busy={busy && selectedDomain === domain.asset}
              aria-disabled={busy || selectedCategories.length === 0}
              type="button"
            >
              <span>{domain.asset}</span>
              <span className="text-xs font-semibold">
                {busy && selectedDomain === domain.asset
                  ? 'Listing…'
                  : `List for ${formatKas(LISTING_FEE_SOMPI)}`}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selectedCategories.length === 0 && (
        <p className="text-yellow-400 text-xs mt-2">
          Pick a category above to enable listing.
        </p>
      )}

      {/* The database path returns a domain name, not a transaction hash, so
          the block below never fired for it -- a paid listing produced no
          confirmation in the modal at all, only a toast. */}
      {listedDomain && !txHash && (
        <p className="text-green-400 text-sm mt-4">
          <strong>{listedDomain}</strong> is listed.{' '}
          <a href={`/domain/${encodeURIComponent(listedDomain)}`} className="underline">
            View its page
          </a>
        </p>
      )}

      {txHash && (
        <p className="text-green-400 text-sm mt-4 break-all">
          Domain listed! Tx:{' '}
          <a
            href={`${LEGACY_KASPLEX_TESTNET.explorerUrl}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {txHash.slice(0, 12)}…
          </a>
        </p>
      )}

      {listError && <p className="text-red-400 text-sm mt-2">Error: {listError}</p>}
    </div>
  );
}
