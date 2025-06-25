// src/components/DomainLikeCount.tsx
"use client";

import { useEffect, useState } from "react";
import { useDomainLikes } from "@/hooks/solidity/useDomainLikes";
import { kasplexProvider } from "@/lib/kasplexProvider";

type Props = {
  domain: string;
};

export function DomainLikeCount({ domain }: Props) {
  const [likes, setLikes] = useState<number | null>(null);
  const { getDomainLikeCount } = useDomainLikes(kasplexProvider);

  useEffect(() => {
    async function fetchLikes() {
      try {
        const count = await getDomainLikeCount(domain);
        setLikes(count);
      } catch (err) {
        console.error("Failed to fetch like count:", err);
      }
    }

    fetchLikes();
  }, [domain, getDomainLikeCount]);

  return (
    <span className="inline-block">
      {likes === null ? "Loading..." : `${likes.toLocaleString()} Like${likes === 1 ? "" : "s"}`}
    </span>
  );
}
