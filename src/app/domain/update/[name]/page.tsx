'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useWalletContext } from '@/context/WalletContext';
import { useGetDomainLinks, type DomainLink } from '@/hooks/domain/useGetDomainLinks';
import { useUpdateDomainLinks } from '@/hooks/domain/useUpdateDomainLinks';
import { normalizeDomainName } from '@/lib/domainName';
import { MAX_LINKS } from '@/lib/limits';
import { knsApiUrl } from '@/lib/kaspaDomainRuntime';
import { CategoryEditor } from '@/components/pages/domain/CategoryEditor';



async function fetchDomainOwner(domain: string): Promise<string> {
  const encoded = encodeURIComponent(domain.toLowerCase());
  const res = await fetch(knsApiUrl(`${encoded}/owner`));

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
  const { kasware } = useWalletContext();

  const domainName = useMemo(() => {
    if (!domainSlug) return '';
    return normalizeDomainName(domainSlug);
  }, [domainSlug]);
  /**
   * The owner lookup, stored **with the domain it is about** and carrying its
   * own outcome.
   *
   * Two separate `loading` and `error` flags could not express this correctly.
   * Effects run after render, so on the first render following a change of
   * domain both flags still describe the *previous* domain -- `loading` false
   * and an owner that belongs to another name -- which is one frame in which
   * `isOwner` decides using the wrong answer. Keeping the name alongside the
   * result makes "this is about a different domain" representable, and a
   * success and a failure stay distinguishable rather than collapsing into a
   * permanent spinner (`MIND.md` #3).
   */
  const [ownerRecord, setOwnerRecord] = useState<
    { domain: string; owner: string } | { domain: string; failure: string } | null
  >(null);
  const ownerLookup = ownerRecord?.domain === domainName ? ownerRecord : null;
  const owner = ownerLookup && 'owner' in ownerLookup ? ownerLookup.owner : '';
  const [message, setMessage] = useState('');
  const [links, setLinks] = useState<DomainLink[]>([{ name: 'X', url: '' }]);
  const [linksSeeded, setLinksSeeded] = useState(false);

  const isKaspaConnected = kasware.status === 'connected';
  const isOwner = normalizeAddress(owner) === normalizeAddress(kasware.account);

  const {
    links: existingLinks,
    profileRevision,
    loading: linksLoading,
    replaceSnapshot,
  } = useGetDomainLinks(domainName);
  const { updateLinks, isLoading: saving, error: saveError } = useUpdateDomainLinks();
  // `null` means we do not know what the current links are.
  const linksUnavailable =
    !linksLoading && (existingLinks === null || profileRevision === null);
  const knownLinks = existingLinks ?? [];

  const displayedLinks = !linksSeeded && knownLinks.length > 0 ? knownLinks : links;

  // The editor stays disabled until the existing links have resolved -- and
  // also if they *failed* to resolve.
  //
  // `updateLinks` is a bulk replace (see docs/SPEC.md): the request carries the
  // complete desired list and anything omitted is deleted. So editing against a
  // set we could not read is not "starting fresh", it is a delete of everything
  // the owner had. Gating on `linksLoading` alone was not enough, because a
  // failed read also ends the loading state -- it just ended it with an empty
  // list that looked exactly like "this domain has no links".
  const editorLocked = linksLoading || linksUnavailable;

  useEffect(() => {
    if (!domainSlug) return;
    // Same guard `useGetDomainLinks` uses, and for a sharper reason: this owner
    // is what `isOwner` gates the editor on. A slow response for a previous
    // domain arriving after a newer one would decide whether the person looking
    // at this page can edit it, using an answer about a different domain.
    let cancelled = false;

    const loadOwner = async () => {
      try {
        const fetchedOwner = await fetchDomainOwner(domainName);
        if (!cancelled) setOwnerRecord({ domain: domainName, owner: fetchedOwner });
      } catch (err) {
        if (!cancelled) {
          setOwnerRecord({ domain: domainName, failure: `❌ ${domainSlug}: ${(err as Error).message}` });
        }
      }
    };

    void loadOwner();

    return () => {
      cancelled = true;
    };
  }, [domainSlug, domainName]);

  function updateLinkField(index: number, field: 'name' | 'url', value: string) {
    setLinks((prev) => {
      const current = linksSeeded || knownLinks.length === 0 ? prev : knownLinks;
      return current.map((l, i) => (i === index ? { ...l, [field]: value } : l));
    });
    setLinksSeeded(true);
  }

  function addLinkRow() {
    setLinks((prev) => {
      const current = linksSeeded || knownLinks.length === 0 ? prev : knownLinks;
      return current.length >= MAX_LINKS ? current : [...current, { name: '', url: '' }];
    });
    setLinksSeeded(true);
  }

  function removeLinkRow(index: number) {
    setLinks((prev) => {
      const current = linksSeeded || knownLinks.length === 0 ? prev : knownLinks;
      return current.filter((_, i) => i !== index);
    });
    setLinksSeeded(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (profileRevision === null) {
      setMessage('Reload the current profile before saving resources.');
      return;
    }

    const saved = await updateLinks(domainName, displayedLinks, profileRevision);
    if (saved) {
      setLinks(saved.links);
      setLinksSeeded(false);
      replaceSnapshot(saved.links, saved.profileRevision);
      setMessage(`✅ Resources for '${domainName}' updated successfully.`);
    }
  };

  // No answer *for this domain* yet -- either still in flight, or the effect
  // for a newly selected domain has not run. Both are genuinely "loading".
  if (!ownerLookup) {
    return (
      <main className="max-w-xl mx-auto p-6 mt-10 text-center text-gray-400">
        <p>Loading domain data...</p>
      </main>
    );
  }

  if ('failure' in ownerLookup) {
    return (
      <main className="max-w-xl mx-auto p-6 mt-10 text-center text-red-400">
        {ownerLookup.failure}
      </main>
    );
  }

  // Kasware (L1) is the only wallet involved: it holds the key that owns the
  // domain and signs the edit.
  if (!isKaspaConnected) {
    return (
      <main className="max-w-xl mx-auto p-6 mt-10 text-center text-yellow-400">
        Connect your Kasware wallet to manage this domain.
        <div className="mt-4">
          <button
            className="underline text-sm"
            onClick={() => {
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
          disabled={editorLocked || displayedLinks.length >= MAX_LINKS}
          className="text-sm text-kaspaMint hover:underline disabled:text-gray-500 disabled:no-underline"
        >
          + Add another link
        </button>

        {linksUnavailable && (
          <p className="rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-200">
            {existingLinks === null
              ? "We couldn't load this domain's current links, so editing is disabled. Saving replaces the whole list, and doing that without knowing what is there would delete your existing links. Please reload in a moment."
              : 'This listing has no usable current revision, so editing is disabled. Reload before saving.'}
          </p>
        )}

        <p className="text-xs text-gray-500">
          {linksUnavailable
            ? 'Current profile state unknown — editing disabled.'
            : linksLoading
              ? 'Loading your current links…'
              : `${displayedLinks.length} / ${MAX_LINKS} links`}
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

      {/* Categories save on their own request, not with the links form: they
          are a separate signed action, and bundling them would mean one failure
          rolled back an edit the user had already seen succeed. */}
      <CategoryEditor domainName={domainName} />
    </main>
  );
}
