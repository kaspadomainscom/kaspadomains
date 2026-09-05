// src/components/pages/domain/CategoryEditor.tsx
'use client';

import { useMemo, useState } from 'react';
import { useGetAllowedCategories } from '@/hooks/domains/useGetAllowedCategories';
import { useDomainCategories } from '@/hooks/domain/useDomainCategories';

/** Matches MAX_CATEGORIES in the API route. */
const MAX_CATEGORIES = 6;

/**
 * Change which categories a listing appears under.
 *
 * Categories are the only navigation this site has, so being in the wrong one
 * is close to not being listed at all -- and until this existed there was no
 * way to fix it short of paying to relist.
 *
 * The editor stays disabled until the current set has loaded. Saving is a bulk
 * replace, so editing against a not-yet-loaded set would submit whatever the
 * user happened to tick and silently drop the rest. This is the same
 * load-before-edit rule the resources editor learned the hard way; see the
 * data-loss race in docs/BUGS.md.
 */
export function CategoryEditor({ domainName }: { domainName: string }) {
  const { options, loading: optionsLoading, error: optionsError } = useGetAllowedCategories();
  const {
    categories: saved,
    loading,
    loadError,
    supported,
    save,
    saving,
    saveError,
  } = useDomainCategories(domainName);

  // `null` until the user touches anything, so the saved set stays authoritative
  // and a background reload can't be overwritten by stale local state.
  const [draft, setDraft] = useState<string[] | null>(null);
  const [message, setMessage] = useState('');

  const selected = draft ?? saved ?? [];
  const locked = loading || optionsLoading || saving;

  const dirty = useMemo(() => {
    if (!draft || !saved) return false;
    if (draft.length !== saved.length) return true;
    const savedSet = new Set(saved);
    return draft.some((key) => !savedSet.has(key));
  }, [draft, saved]);

  if (!supported) return null;

  function toggle(key: string) {
    setMessage('');
    setDraft((current) => {
      const base = current ?? saved ?? [];
      if (base.includes(key)) return base.filter((k) => k !== key);
      if (base.length >= MAX_CATEGORIES) return base;
      return [...base, key];
    });
  }

  async function handleSave() {
    setMessage('');
    const ok = await save(selected);
    if (ok) {
      setDraft(null);
      setMessage('✅ Categories updated.');
    }
  }

  return (
    <section className="mt-8 border-t border-[#1d3b39] pt-6">
      <h2 className="text-lg font-semibold text-white">Categories</h2>
      <p className="mt-1 mb-4 text-sm text-gray-400">
        Where this domain appears when people browse. Pick up to {MAX_CATEGORIES}.
      </p>

      {loadError && (
        <p className="mb-3 rounded border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          Could not load this domain&apos;s current categories: {loadError}
        </p>
      )}

      {optionsError && (
        <p className="mb-3 rounded border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {optionsError}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.key);
          const atCap = !isSelected && selected.length >= MAX_CATEGORIES;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => toggle(option.key)}
              disabled={locked || atCap}
              aria-pressed={isSelected}
              className={`rounded-full border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                isSelected
                  ? 'border-kaspaMint bg-kaspaMint/15 text-kaspaMint'
                  : 'border-[#1d3b39] bg-[#0F2F2E] text-gray-300 hover:border-kaspaMint/50'
              }`}
            >
              {option.title}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-gray-500">
        {loading
          ? 'Loading current categories…'
          : `${selected.length} / ${MAX_CATEGORIES} selected`}
      </p>

      <button
        type="button"
        onClick={handleSave}
        disabled={locked || !dirty || selected.length === 0}
        className="mt-3 rounded bg-kaspaMint px-4 py-2 text-sm font-semibold text-[#0F2F2E] transition hover:bg-[#3DFDAD]/90 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save categories'}
      </button>

      {/* A listing with no categories is invisible, so say so before the API
          has to refuse it. */}
      {!loading && selected.length === 0 && (
        <p className="mt-2 text-sm text-amber-300">
          Pick at least one category — a listing with none cannot be found.
        </p>
      )}

      {message && <p className="mt-2 text-sm text-green-400">{message}</p>}
      {saveError && <p className="mt-2 text-sm text-red-400">{saveError}</p>}
    </section>
  );
}
