'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useKasware } from '@/hooks/kns/useKasware';

async function fetchDomainOwner(domain: string): Promise<string> {
  const encoded = encodeURIComponent(domain.toLowerCase());
  const res = await fetch(`https://api.knsdomains.org/mainnet/api/v1/${encoded}/owner`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch domain owner: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  console.log('🐞 API response:', data);

  if (data?.success && data?.data?.owner) {
    return data.data.owner;
  }

  throw new Error('Owner data missing in API response');
}

function normalizeAddress(addr?: string | null) {
  return addr?.toLowerCase().replace(/^kaspa(:test:|:)?/, '') ?? '';
}

export default function EditDomainPage() {
  const { name: domainSlug } = useParams() as { name: string };
  const { address: walletAddress, connecting } = useKasware();

  const [domainName, setDomainName] = useState('');
  const [owner, setOwner] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [bio, setBio] = useState('');
  const [twitter, setTwitter] = useState('');

  const status = connecting
    ? 'connecting'
    : walletAddress
    ? 'connected'
    : 'disconnected';

  const isOwner = normalizeAddress(owner) === normalizeAddress(walletAddress);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);

    try {
      // TODO: Call actual API to update bio and Twitter handle
      await new Promise((resolve) => setTimeout(resolve, 600));
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
        <p>Loading domain data...</p>
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
          {"Use the 'Connect Wallet' button in the header."}
        </p>
      </main>
    );
  }

  if (!isOwner) {
    return (
      <main className="max-w-xl mx-auto p-6 mt-10 text-center text-red-500">
        ❌ You are not the owner of <strong>{domainName || '(unknown)'}</strong>.
        <div className="mt-4 text-left text-xs text-gray-500 dark:text-gray-400">
          <p>domainSlug: {domainSlug}</p>
          <p>domainName: {domainName}</p>
          <p>Owner: {owner}</p>
          <p>Your Wallet: {walletAddress}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto p-6 bg-white dark:bg-neutral-900 rounded shadow-md mt-8">
      <h1 className="text-2xl font-bold mb-6 text-kaspaGreen">Edit Domain: {domainName}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bio Field */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium mb-1">Bio / Description</label>
          <textarea
            id="bio"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write something about this domain..."
            className="w-full border border-gray-300 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 text-gray-800 dark:text-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kaspaGreen"
          />
        </div>

        {/* Twitter Field */}
        <div>
          <label htmlFor="twitter" className="block text-sm font-medium mb-1">Twitter / X Handle</label>
          <input
            id="twitter"
            type="text"
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            placeholder="@example"
            className="w-full border border-gray-300 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 text-gray-800 dark:text-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kaspaGreen"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-kaspaGreen hover:bg-kaspaMint text-white font-semibold py-2 rounded transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Feedback */}
      {message && <p className="mt-4 text-sm text-green-600">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
    </main>
  );
}
