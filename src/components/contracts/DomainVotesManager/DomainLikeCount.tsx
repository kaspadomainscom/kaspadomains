'use client';

import { useEffect, useState } from 'react';
import { useDomainLikes } from '@/hooks/domain/useGetDomainLikeCount';
import { kasplexClient } from '@/lib/viemClient';

type Props = {
  domain: string;
};

export function DomainLikeCount({ domain }: Props) {
  const [likes, setLikes] = useState<number | null>(null);

  const { getDomainLikeCount } = useDomainLikes(kasplexClient);

  useEffect(() => {
    if (!domain) return;

    let isMounted = true;

    (async () => {
      try {
        const count = await getDomainLikeCount(domain);
        if (isMounted) setLikes(Number(count));
      } catch (err) {
        console.error('Failed to fetch like count:', err);
        if (isMounted) setLikes(null);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [domain, getDomainLikeCount]);

  return (
    <span className="inline-block text-sm text-gray-300">
      {likes === null ? 'Loading...' : `${likes.toLocaleString()} Like${likes === 1 ? '' : 's'}`}
    </span>
  );
}
