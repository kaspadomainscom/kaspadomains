// src/components/pages/domain/DomainInfoPanel.tsx
"use client";

import Link from "next/link";
import { Domain } from "@/data/types";
import { Detail } from "./Detail";
import { DomainResources } from "./DomainResources";

type Props = {
    domain: Domain;
    category: string;
};

export function DomainInfoPanel({ domain, category }: Props) {
    return (
        <section className="bg-[#122c2a] border border-[#1d3b39] rounded-xl p-6 shadow-md space-y-4 text-gray-100">
            <Detail label="Category" value={category} />

            <Detail
                label="Status"
                value={domain.isActive ? "Listed" : "Unlisted"}
                valueClass={domain.isActive ? "text-kaspaMint font-semibold" : "text-gray-500"}
            />

            {/* The "Likes" row used to live here. It read getDomainVoteCount from
                DomainVotesManager -- a contract with no deployed code -- so it
                showed "Unavailable" on every domain, permanently, directly above
                the working "Votes: N" that VotingSection renders from the
                database on the same page. Two counters, one dead, and they
                disagreed on what the thing is even called: the product says
                votes everywhere else, and "likes" is the exact confusion that
                produced MIND #1. Removed rather than repaired -- the real count
                is already on this page. */}

            <DomainResources domainName={domain.name} />

            <Link
                href={`/domain/update/${encodeURIComponent(domain.name)}`}
                className="inline-block text-sm text-kaspaMint hover:underline"
            >
                Own this domain? Manage its resources →
            </Link>
        </section>
    );
}
