'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useKasware } from '@/hooks/kns/useKasware';

async function fetchDomainOwner(domain: string): Promise<string> {
  const encoded = encodeURIComponent(domain.toLowerCase());
  const res = await fetch(`https://api.knsdomains.org/mainnet/api/v1/${encoded}/owner`);
  if (!res.ok) throw new Error('Failed to fetch domain owner');
  const data = await res.json();
  return data?.data?.owner ?? '';
}

function normalizeAddress(addr: string | null | undefined) {
  return addr?.toLowerCase().replace(/^kaspa(:test:|:)?/, '') ?? '';
}

export default function EditDomainPage() {
  const { name: domainSlug } = useParams() as { name: string };
  const { address: walletAddress, connecting } = useKasware();

  const status = connecting
    ? 'connecting'
    : walletAddress
    ? 'connected'
    : 'disconnected';

  const [domainName, setDomainName] = useState('');
  const [owner, setOwner] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isOwner = normalizeAddress(owner) === normalizeAddress(walletAddress);

  useEffect(() => {
    if (!domainSlug) return;

    const fullDomain = domainSlug.endsWith('.kas') ? domainSlug : `${domainSlug}.kas`;
    console.log('🔍 domainSlug:', domainSlug);
    console.log('➡️ fullDomain:', fullDomain);

    async function loadDomain() {
      setLoading(true);
      setError('');
      try {
        const fetchedOwner = await fetchDomainOwner(fullDomain);
        console.log('✅ fetchedOwner:', fetchedOwner);
        setDomainName(fullDomain);
        setOwner(fetchedOwner);
      } catch (err) {
        console.error('❌ fetchDomainOwner error:', err);
        setError('❌ Failed to fetch domain owner.');
      } finally {
        setLoading(false);
      }
    }

    loadDomain();
  }, [domainSlug]);

  useEffect(() => {
    console.log('🧠 walletAddress:', walletAddress);
    console.log('🔐 normalizedOwner:', normalizeAddress(owner));
    console.log('🔑 normalizedWallet:', normalizeAddress(walletAddress));
  }, [owner, walletAddress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      setSaving(true);
      // TODO: Replace with actual domain update logic
      await new Promise((resolve) => setTimeout(resolve, 500));
      setMessage(`✅ Domain '${domainName}' updated successfully.`);
    } catch {
      setError('❌ Failed to update domain.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || status === 'connecting') {
    return (
      <main className="max-w-xl mx-auto p-6 mt-10 text-center text-gray-600">
        Loading domain data...
        <pre className="mt-4 text-xs text-gray-400">
          {`domainSlug: ${domainSlug}\ndomainName: ${domainName}\nloading: ${loading}`}
        </pre>
      </main>
    );
  }

  if (status === 'disconnected') {
    return (
      <main className="max-w-xl mx-auto p-6 mt-10 text-center text-red-500">
        ❌ Please connect your Kaspa wallet to edit this domain.
        <p className="mt-4 text-sm text-gray-500">
          Use the &apos;Connect Wallet&apos; button in the header.
        </p>
      </main>
    );
  }

  if (!isOwner) {
    return (
      <main className="max-w-xl mx-auto p-6 mt-10 text-center text-red-500">
        ❌ You are not the owner of <strong>{domainName || '(unknown)'}</strong>. Access denied.
        <div className="mt-4 text-left text-xs text-gray-500 dark:text-gray-400">
          <p>Raw domainSlug: {domainSlug || '(empty)'}</p>
          <p>domainName state: {domainName || '(empty)'}</p>
          <p>Error message: {error || '(none)'}</p>
          <p>Owner address: {owner || '(empty)'}</p>
          <p>Wallet address: {walletAddress || '(empty)'}</p>
          <p>Normalized owner: {normalizeAddress(owner)}</p>
          <p>Normalized wallet: {normalizeAddress(walletAddress)}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto p-6 bg-white dark:bg-neutral-900 rounded shadow-md mt-8">
      <h1 className="text-2xl font-bold mb-4 text-kaspaGreen">Edit Kaspa Domain</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="domainName" className="block font-medium mb-1">
            Domain Name
          </label>
          <input
            id="domainName"
            type="text"
            value={domainName}
            disabled
            className="w-full bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-neutral-700 rounded px-3 py-2 cursor-not-allowed"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-kaspaGreen px-4 py-2 rounded text-white hover:bg-kaspaMint transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-green-600">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
    </main>
  );
}
