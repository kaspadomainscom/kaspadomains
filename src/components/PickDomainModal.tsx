'use client';

import { DomainAsset } from '@/hooks/kns/types';
import { useListDomain } from '@/hooks/domain/useListDomain';
import { useGetAllowedCategories } from '@/hooks/domains/useGetAllowedCategories';
import { LISTING_FEE_SOMPI, formatKas } from '@/lib/fees';
import { MAX_CATEGORIES } from '@/lib/categories';
import { useState } from 'react';

type PickDomainModalProps = {
  domains?: DomainAsset[];
  kaspaAccount: string | null;
};

export default function PickDomainModal({
  domains = [],
  kaspaAccount,
}: PickDomainModalProps) {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [listedDomain, setListedDomain] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const { listDomain, isLoading: listing, error: listError } = useListDomain();
  // `options` carries titles; `categories` is keys only. Rendering the keys
  // showed people raw slugs -- "realWords", "999club" -- as if they were labels.
  const {
    options: categoryOptions,
    loading: categoriesLoading,
    error: categoriesError,
  } = useGetAllowedCategories();

  const verifiedDomains = domains.filter((domain) => domain.isVerifiedDomain === true);
  const busy = listing;

  function toggleCategory(category: string) {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) return prev.filter((c) => c !== category);
      // Stop at the cap rather than letting the server refuse after the user has
      // already chosen. The editor has always done this; listing did not.
      if (prev.length >= MAX_CATEGORIES) return prev;
      return [...prev, category];
    });
  }

  // Kasware (L1) is the only wallet involved: it signs the listing request.
  if (!kaspaAccount) {
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
          Choose at least one category <span className="text-red-400">*</span>{' '}
          <span className="font-normal text-gray-400">
            ({selectedCategories.length} / {MAX_CATEGORIES})
          </span>
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
              // Disable at the cap rather than swallowing the click. A button
              // that does nothing when pressed reads as broken.
              const atCap = !active && selectedCategories.length >= MAX_CATEGORIES;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => toggleCategory(option.key)}
                  disabled={busy || atCap}
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
                  // The listing and its categories are written in one
                  // transactional request.
                  const result = await listDomain(domain.asset, selectedCategories);
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

      {selectedCategories.length >= MAX_CATEGORIES && (
        <p className="text-gray-400 text-xs mt-2">
          That&apos;s the maximum of {MAX_CATEGORIES} categories. Deselect one to choose a
          different category.
        </p>
      )}

      {/* The database path returns a domain name, not a transaction hash, so
          the block below never fired for it -- a paid listing produced no
          confirmation in the modal at all, only a toast. */}
      {listedDomain && (
        <p className="text-green-400 text-sm mt-4">
          <strong>{listedDomain}</strong> is listed.{' '}
          <a href={`/domain/${encodeURIComponent(listedDomain)}`} className="underline">
            View its page
          </a>
        </p>
      )}

      {listError && <p className="text-red-400 text-sm mt-2">Error: {listError}</p>}
    </div>
  );
}
