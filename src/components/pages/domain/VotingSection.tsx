"use client";

import { useState, useEffect } from "react";
import { Contract, keccak256, toUtf8Bytes, parseEther, EventLog, Log } from "ethers";
import { useWalletContext } from "@/context/WalletContext";
import { contracts } from "@/lib/contracts";
import { JsonFragment } from "ethers";

const DOMAIN_LIKES_PER_PAGE = 10;

export function VotingSection({ domainName }: { domainName: string }) {
    const { account, signer, status } = useWalletContext();

    const [contract, setContract] = useState<Contract | null>(null);
    const [likesCount, setLikesCount] = useState<number>(0);
    const [userHasLiked, setUserHasLiked] = useState(false);
    const [voters, setVoters] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [loadingVoters, setLoadingVoters] = useState(false);
    const [txPending, setTxPending] = useState(false);

    const YOUR_CONTRACT_ADDRESS = contracts.DomainLikesManager.address;
    const YOUR_CONTRACT_ABI = contracts.DomainLikesManager.abi as JsonFragment[];

    // Initialize contract when signer changes
    useEffect(() => {
        if (!signer) {
            setContract(null);
            return;
        }
        const c = new Contract(YOUR_CONTRACT_ADDRESS, YOUR_CONTRACT_ABI, signer);
        setContract(c);
    }, [signer, YOUR_CONTRACT_ABI, YOUR_CONTRACT_ADDRESS]);

    // Load total likes count
    useEffect(() => {
        if (!contract) return;
        contract
            .getDomainLikeCount(domainName)
            .then((count) => setLikesCount(count.toNumber()))
            .catch(console.error);
    }, [contract, domainName]);

    // Check if current user liked this domain
    useEffect(() => {
        if (!contract || !account) {
            setUserHasLiked(false);
            return;
        }
        contract
            .hasUserLikedDomain(account, domainName)
            .then(setUserHasLiked)
            .catch(console.error);
    }, [contract, account, domainName]);

    // Fetch voters list paginated via events
    useEffect(() => {
        if (!contract) return;

        async function fetchVoters() {
            if (!contract) return;

            setLoadingVoters(true);

            try {
                const domainId = keccak256(toUtf8Bytes(domainName));
                const filter = contract.filters.DomainLiked(null, domainId);
                const rawEvents: (EventLog | Log)[] = await contract.queryFilter(filter);

                // Narrow to EventLog only (which have args)
                const events = rawEvents.filter(
                    (e): e is EventLog => "args" in e && typeof e.args === "object"
                );

                const paginatedEvents = events.slice(
                    (page - 1) * DOMAIN_LIKES_PER_PAGE,
                    page * DOMAIN_LIKES_PER_PAGE
                );

                const voterAddresses = paginatedEvents
                    .map((e) => (e.args.user && typeof e.args.user === "string" ? e.args.user : null))
                    .filter((addr): addr is string => addr !== null);

                setVoters(voterAddresses);
            } catch (error) {
                console.error(error);
                setVoters([]);
            }
            setLoadingVoters(false);
        }

        fetchVoters();
    }, [contract, domainName, page]);

    async function onVote() {
        if (!contract || !account) {
            alert("Please connect your wallet");
            return;
        }
        try {
            setTxPending(true);
            const tx = await contract.likeDomain(domainName, {
                value: parseEther("6"), // 6 KAS payment
            });
            await tx.wait();

            // Refresh data after vote
            const count = await contract.getDomainLikeCount(domainName);
            setLikesCount(count.toNumber());
            setUserHasLiked(true);
            setPage(1); // reset pagination
        } catch (error) {
            console.error(error);
            alert("Transaction failed or rejected");
        } finally {
            setTxPending(false);
        }
    }

    const isConnected = status === "connected" && !!account;

    return (
        <section className="mt-10 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Support this Domain</h2>

            <div className="flex items-center gap-4 mb-4">
                <button
                    onClick={onVote}
                    disabled={!isConnected || userHasLiked || txPending}
                    className={`px-4 py-2 rounded font-semibold text-white ${userHasLiked
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                >
                    {userHasLiked
                        ? "You have voted"
                        : txPending
                            ? "Voting..."
                            : "Vote to this domain (6 KAS)"}
                </button>

                <span className="text-lg font-semibold">Votes: {likesCount}</span>
            </div>

            <h3 className="font-medium mb-2">Voters</h3>

            {loadingVoters ? (
                <p>Loading voters...</p>
            ) : voters.length === 0 ? (
                <p>No votes yet. Be the first to vote!</p>
            ) : (
                <ul className="space-y-1 max-h-48 overflow-auto border border-gray-200 rounded p-2 font-mono text-sm">
                    {voters.map((voter) => (
                        <li key={voter}>{voter}</li>
                    ))}
                </ul>
            )}

            {/* Pagination */}
            <div className="flex justify-between mt-4">
                <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                    Previous
                </button>
                <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={voters.length < DOMAIN_LIKES_PER_PAGE}
                    className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </section>
    );
}
