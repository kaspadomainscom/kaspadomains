// src/components/pages/domain/DomainInfoPanel.tsx
"use client";

import { Domain } from "@/data/types";
import { DomainLikeCount } from "@/components/contracts/DomainVotesManager/DomainLikeCount";
import { Detail } from "./Detail";

type Props = {
    domain: Domain;
    category: string;
};

export function DomainInfoPanel({ domain, category }: Props) {
    return (
        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4 text-gray-800">
            <Detail label="Category" value={category} />

            <Detail
                label="Status"
                value={domain.isActive ? "Listed" : "Unlisted"}
                valueClass={domain.isActive ? "text-green-600" : "text-gray-500"}
            />

            <Detail
                label="Likes"
                value={<DomainLikeCount domain={domain.name} />}
                valueClass="text-pink-600 font-semibold"
            />

        </section>
    );
}
