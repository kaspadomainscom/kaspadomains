'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useWalletContext } from '@/context/WalletContext';
import { useGetDomainLinks, type DomainLink } from '@/hooks/domain/useGetDomainLinks';
import { useUpdateDomainLinks } from '@/hooks/domain/useUpdateDomainLinks';
import { contracts } from '@/lib/contracts';
import { kasplexClient } from '@/lib/viemClient';

const DEFAULT_MAX_LINKS = 10;

async function fetchDomainOwner(domain: string): Promise<string> {
  const encoded = encodeURIComponent(domain.toLowerCase());
  const res = await fetch(`https://api.knsdomains.org/mainnet/api/v1/${encoded}/owner`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch domain owner: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();

  if (data?.success && data?.data?.owner) {
    return data.data.owner;
  }

  throw new Error('Owner data missing in API response');
}

function normalizeAddress(addr?: string | null) {
  return addr?.toLowerCase().replace(/^kaspa(:test:|:)?/, '') ?? '';
}

export default function UpdateDomainPage() {
  const { name: domainSlug } = useParams() as { name: string };
  const { kasware, kasplex } = useWalletContext();

  const domainName = useMemo(() => {
    if (!domainSlug) return '';
    return domainSlug.endsWith('.kas') ? domainSlug : `${domainSlug}.kas`;
  }, [domainSlug]);
  const [owner, setOwner] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [links, setLinks] = useState<DomainLink[]>([{ name: 'X', url: '' }]);
  const [maxLinks, setMaxLinks] = useState(DEFAULT_MAX_LINKS);
  const [linksSeeded, setLinksSeeded] = useState(false);

  const isEvmConnected = kasplex.status === 'connected';
  const isKaspaConnected = kasware.status === 'connected';
  const isOwner = normalizeAddress(owner) === normalizeAddress(kasware.account);

  const { links: existingLinks, loading: linksLoading } = useGetDomainLinks(domainName);
  const { updateLinks, isLoading: saving, error: saveError } = useUpdateDomainLinks();
  const displayedLinks = !linksSeeded && existingLinks.length > 0 ? existingLinks : links;

  // The editor stays disabled until the on-chain links have resolved.
  // updateLinks is a bulk replace (see docs/SPEC.md), so an edit made before
  // existing links arrive would flip linksSeeded, hide the links that land
  // afterwards, and silently wipe them from the contract on save.
  const editorLocked = linksLoading;

  useEffect(() => {
    if (!domainSlug) return;

    const loadOwner = async () => {
      setLoading(true);
      setError('');
      try {
        const fetchedOwner = await fetchDomainOwner(domainName);
        setOwner(fetchedOwner);
      } catch (err) {
        setError(`❌ ${domainSlug}: ${(err as Error).message}`);
      } finally {
        setLoading(false);
      }
    };

    loadOwner();
  }, [domainSlug, domainName]);

  // Fetch the contract's link cap once
  useEffect(() => {
    kasplexClient
      .readContract({
        address: contracts.DomainLinksStorage.address,
        abi: contracts.DomainLinksStorage.abi,
        functionName: 'MAX_LINKS',
      })
      .then((val) => setMaxLinks(Number(val)))
      .catch(() => {
        // fall back to the client-side default
      });
  }, []);

  function updateLinkField(index: number, field: 'name' | 'url', value: string) {
    setLinks((prev) => {
      const current = linksSeeded || existingLinks.length === 0 ? prev : existingLinks;
      return current.map((l, i) => (i === index ? { ...l, [field]: value } : l));
    });
    setLinksSeeded(true);
  }

  function addLinkRow() {
    setLinks((prev) => {
      const current = linksSeeded || existingLinks.length === 0 ? prev : existingLinks;
      return current.length >= maxLinks ? current : [...current, { name: '', url: '' }];
    });
    setLinksSeeded(true);
  }

  function removeLinkRow(index: number) {
    setLinks((prev) => {
      const current = linksSeeded || existingLinks.length === 0 ? prev : existingLinks;
      return current.filter((_, i) => i !== index);
    });
    setLinksSeeded(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!kasplex.account) return;

    const ok = await updateLinks(domainName, kasplex.account as `0x${string}`, displayedLinks);
    if (ok) {
      setMessage(`✅ Resources for '${domainName}' updated successfully.`);
    }
  };

  if (loading) {
    return (
      <main className="max-w-xl mx-auto p-6 mt-10 text-center text-gray-400">
        <p>Loading domain data...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-xl mx-auto p-6 mt-10 text-center text-red-400">
        {error}
      </main>
    );
  }

  if (!isKaspaConnected || !isEvmConnected) {
    return (
      <main className="max-w-xl mx-auto p-6 mt-10 text-center text-yellow-400">
        Connect your Kasware wallet to manage this domain.
        <div className="mt-4">
          <button
            className="underline text-sm"
            onClick={() => {
              kasplex.connect();
              kasware.connect();
            }}
          >
            Retry connecting wallet
          </button>
        </div>
      </main>
    );
  }

  if (!isOwner) {
    return (
      <main className="max-w-xl mx-auto p-6 mt-10 text-center text-red-400">
        ❌ You are not the owner of <strong>{domainName || '(unknown)'}</strong>.
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto p-6 bg-[#122c2a] border border-[#1d3b39] rounded-xl shadow-md mt-8 text-gray-100">
      <h1 className="text-2xl font-bold mb-2 text-white">Edit Domain: {domainName}</h1>
      <p className="text-sm text-gray-400 mb-6">
        Add resources — your X (Twitter) account and any other links — so visitors can find you.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {displayedLinks.map((link, i) => (
          <div key={i} className="flex gap-2 items-start">
            <input
              type="text"
              value={link.name}
              onChange={(e) => updateLinkField(i, 'name', e.target.value)}
              disabled={editorLocked}
              placeholder="Label (e.g. X)"
              className="w-1/3 border border-[#1d3b39] bg-[#0F2F2E] text-gray-100 placeholder-gray-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kaspaMint disabled:opacity-50"
            />
            <input
              type="text"
              value={link.url}
              onChange={(e) => updateLinkField(i, 'url', e.target.value)}
              disabled={editorLocked}
              placeholder="https://x.com/yourhandle"
              className="flex-1 border border-[#1d3b39] bg-[#0F2F2E] text-gray-100 placeholder-gray-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kaspaMint disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => removeLinkRow(i)}
              disabled={editorLocked}
              aria-label="Remove link"
              className="px-2 py-2 text-red-400 hover:text-red-300 disabled:text-gray-500"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addLinkRow}
          disabled={editorLocked || displayedLinks.length >= maxLinks}
          className="text-sm text-kaspaMint hover:underline disabled:text-gray-500 disabled:no-underline"
        >
          + Add another link
        </button>

        <p className="text-xs text-gray-500">
          {editorLocked
            ? 'Loading your current links…'
            : `${displayedLinks.length} / ${maxLinks} links`}
        </p>

        <button
          type="submit"
          disabled={saving || editorLocked}
          className="w-full bg-kaspaMint hover:bg-[#3DFDAD]/90 text-[#0F2F2E] font-semibold py-2 rounded transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-green-600">{message}</p>}
      {saveError && <p className="mt-4 text-sm text-red-500">{saveError}</p>}
    </main>
  );
}
