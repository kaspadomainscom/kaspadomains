// src/components/pages/domain/DomainInfoPanel.tsx
"use client";

import Link from "next/link";
import { Domain } from "@/data/types";
import { DomainLikeCount } from "@/components/contracts/DomainVotesManager/DomainLikeCount";
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

            <Detail
                label="Likes"
                value={<DomainLikeCount domain={domain.name} />}
                valueClass="text-pink-400 font-semibold"
            />

            <DomainResources domainName={domain.name} />

            <Link
                href={`/domain/update/${domain.name}`}
                className="inline-block text-sm text-kaspaMint hover:underline"
            >
                Own this domain? Manage its resources →
            </Link>
        </section>
    );
}
