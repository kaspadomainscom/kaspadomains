// src/components/pages/domain/DomainInfoPanel.tsx
"use client";

import Link from "next/link";
import { Domain } from "@/data/types";
import { DomainLikeCount } from "@/components/contracts/DomainLikesManager/DomainLikeCount";
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
                value={domain.listed ? "Listed" : "Unlisted"}
                valueClass={domain.listed ? "text-green-600" : "text-gray-500"}
            />

            <Detail
                label="Price"
                value={`${domain.price?.toLocaleString() ?? "0"} KAS`}
                valueClass="text-green-700 font-semibold"
            />

            <Detail
                label="Likes"
                value={<DomainLikeCount domain={domain.name} />}
                valueClass="text-pink-600 font-semibold"
            />

            {domain.sellerTelegram && (
                <Detail
                    label="Seller Telegram"
                    value={
                        <Link
                            href={`https://t.me/${domain.sellerTelegram.replace(/^@/, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                            @{domain.sellerTelegram.replace(/^@/, "")}
                        </Link>
                    }
                />
            )}

            {domain.sellerTwitter && (
                <Detail
                    label="Seller Twitter"
                    value={
                        <Link
                            href={`https://x.com/${domain.sellerTwitter.replace(/^@/, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                            @{domain.sellerTwitter.replace(/^@/, "")}
                        </Link>
                    }
                />
            )}

            {domain.linkedWebsite && (
                <Detail
                    label="Website"
                    value={
                        <Link
                            href={domain.linkedWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
                        >
                            {domain.linkedWebsite.replace(/^https?:\/\//, "")}
                        </Link>
                    }
                />
            )}

            {domain.kaspaLink && (
                <div className="pt-1">
                    <Link
                        href={domain.kaspaLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-purple-600 hover:underline font-medium"
                        aria-label={`View ${domain.name} on Kaspa.com`}
                    >
                        View on Kaspa.com
                    </Link>
                </div>
            )}
        </section>
    );
}
