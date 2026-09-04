'use client';

import { useEffect, useState } from 'react';
import { useDomainLikes } from '@/hooks/domain/useGetDomainLikeCount';
import { kasplexClient } from '@/lib/viemClient';

type Props = {
  domain: string;
};

export function DomainLikeCount({ domain }: Props) {
  const [likes, setLikes] = useState<number | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  const { getDomainLikeCount } = useDomainLikes(kasplexClient);

  useEffect(() => {
    if (!domain) return;

    let isMounted = true;
    setStatus('loading');

    (async () => {
      try {
        const count = await getDomainLikeCount(domain);
        if (!isMounted) return;
        setLikes(Number(count));
        setStatus('success');
      } catch (err) {
        console.error('Failed to fetch like count:', err);
        if (!isMounted) return;
        setStatus('error');
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [domain, getDomainLikeCount]);

  return (
    <span className="inline-block text-sm text-gray-300">
      {status === 'loading'
        ? 'Loading...'
        : status === 'error'
          ? 'Unavailable'
          : `${(likes ?? 0).toLocaleString()} Like${likes === 1 ? '' : 's'}`}
    </span>
  );
}
