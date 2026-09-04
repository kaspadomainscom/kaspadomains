'use client';

import { useEffect, useState } from 'react';
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

  const [domainName, setDomainName] = useState('');
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

  useEffect(() => {
    if (!domainSlug) return;

    const fullDomain = domainSlug.endsWith('.kas') ? domainSlug : `${domainSlug}.kas`;
    setDomainName(fullDomain);

    const loadOwner = async () => {
      setLoading(true);
      setError('');
      try {
        const fetchedOwner = await fetchDomainOwner(fullDomain);
        setOwner(fetchedOwner);
      } catch (err) {
        setError(`❌ ${domainSlug}: ${(err as Error).message}`);
      } finally {
        setLoading(false);
      }
    };

    loadOwner();
  }, [domainSlug]);

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

  // Seed the editor with existing on-chain links, once, when they load
  useEffect(() => {
    if (linksSeeded || linksLoading) return;
    if (existingLinks.length > 0) {
      setLinks(existingLinks);
    }
    setLinksSeeded(true);
  }, [existingLinks, linksLoading, linksSeeded]);

  function updateLinkField(index: number, field: 'name' | 'url', value: string) {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  function addLinkRow() {
    setLinks((prev) => (prev.length >= maxLinks ? prev : [...prev, { name: '', url: '' }]));
  }

  function removeLinkRow(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!kasplex.account) return;

    const ok = await updateLinks(domainName, kasplex.account as `0x${string}`, links);
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
        {links.map((link, i) => (
          <div key={i} className="flex gap-2 items-start">
            <input
              type="text"
              value={link.name}
              onChange={(e) => updateLinkField(i, 'name', e.target.value)}
              placeholder="Label (e.g. X)"
              className="w-1/3 border border-[#1d3b39] bg-[#0F2F2E] text-gray-100 placeholder-gray-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kaspaMint"
            />
            <input
              type="text"
              value={link.url}
              onChange={(e) => updateLinkField(i, 'url', e.target.value)}
              placeholder="https://x.com/yourhandle"
              className="flex-1 border border-[#1d3b39] bg-[#0F2F2E] text-gray-100 placeholder-gray-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kaspaMint"
            />
            <button
              type="button"
              onClick={() => removeLinkRow(i)}
              aria-label="Remove link"
              className="px-2 py-2 text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addLinkRow}
          disabled={links.length >= maxLinks}
          className="text-sm text-kaspaMint hover:underline disabled:text-gray-500 disabled:no-underline"
        >
          + Add another link
        </button>

        <p className="text-xs text-gray-500">{links.length} / {maxLinks} links</p>

        <button
          type="submit"
          disabled={saving}
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
