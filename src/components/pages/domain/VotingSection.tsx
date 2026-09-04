"use client";

import { useState, useEffect } from "react";
import { Contract, keccak256, toUtf8Bytes, formatEther, EventLog, Log } from "ethers";
import { useWalletContext } from "@/context/WalletContext";
import { contracts } from "@/lib/contracts";
import { JsonFragment } from "ethers";

const DOMAIN_LIKES_PER_PAGE = 10;

// Contract calls here must match DomainVotesManager's real ABI exactly:
// getDomainVoteCount (not getDomainLikeCount), hasUserVotedDomain (not
// hasUserLikedDomain), voteDomainByHash (not likeDomain -- and it takes a
// uint256 domainHash, not the domain name string), and the DomainVoted event
// (not DomainLiked). Verified against src/abis/DomainVotesManager.json --
// this component previously called functions/events that don't exist on the
// deployed contract, so voting has never actually worked.
export function VotingSection({ domainName }: { domainName: string }) {
    const { account, signer, status } = useWalletContext();

    const [contract, setContract] = useState<Contract | null>(null);
    const [likesCount, setLikesCount] = useState<number>(0);
    const [userHasLiked, setUserHasLiked] = useState(false);
    const [voters, setVoters] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [loadingVoters, setLoadingVoters] = useState(false);
    const [txPending, setTxPending] = useState(false);
    const [voteFeeWei, setVoteFeeWei] = useState<bigint | null>(null);

    const YOUR_CONTRACT_ADDRESS = contracts.DomainVotesManager.address;
    const YOUR_CONTRACT_ABI = contracts.DomainVotesManager.abi as JsonFragment[];
    const domainHash = keccak256(toUtf8Bytes(domainName));

    // Initialize contract when signer changes
    useEffect(() => {
        if (!signer) {
            setContract(null);
            return;
        }
        const c = new Contract(YOUR_CONTRACT_ADDRESS, YOUR_CONTRACT_ABI, signer);
        setContract(c);
    }, [signer, YOUR_CONTRACT_ABI, YOUR_CONTRACT_ADDRESS]);

    // Load the current on-chain vote fee (don't hardcode it -- it's owner-adjustable)
    useEffect(() => {
        if (!contract) return;
        contract
            .voteFee()
            .then((fee: bigint) => setVoteFeeWei(fee))
            .catch(console.error);
    }, [contract]);

    // Load total vote count
    useEffect(() => {
        if (!contract) return;
        contract
            .getDomainVoteCount(domainName)
            .then((count: bigint) => setLikesCount(Number(count)))
            .catch(console.error);
    }, [contract, domainName]);

    // Check if current user has voted for this domain
    useEffect(() => {
        if (!contract || !account) {
            setUserHasLiked(false);
            return;
        }
        contract
            .hasUserVotedDomain(account, domainName)
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
                const filter = contract.filters.DomainVoted(null, domainHash);
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
    }, [contract, domainHash, page]);

    async function onVote() {
        if (!contract || !account) {
            alert("Please connect your wallet");
            return;
        }
        if (voteFeeWei === null) {
            alert("Vote fee not loaded yet, please try again in a moment.");
            return;
        }
        try {
            setTxPending(true);
            const tx = await contract.voteDomainByHash(domainHash, {
                value: voteFeeWei,
            });
            await tx.wait();

            // Refresh data after vote
            const count = await contract.getDomainVoteCount(domainName);
            setLikesCount(Number(count));
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
    const voteFeeLabel = voteFeeWei !== null ? `${formatEther(voteFeeWei)} KAS` : "…";

    return (
        <section className="mt-10 bg-[#122c2a] border border-[#1d3b39] rounded-xl p-6 shadow-md text-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-white">Support this Domain</h2>

            <div className="flex items-center gap-4 mb-4">
                <button
                    onClick={onVote}
                    disabled={!isConnected || userHasLiked || txPending}
                    className={`px-4 py-2 rounded font-semibold ${userHasLiked
                            ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                            : "bg-kaspaMint text-[#0F2F2E] hover:bg-[#3DFDAD]/90"
                        }`}
                >
                    {userHasLiked
                        ? "You have voted"
                        : txPending
                            ? "Voting..."
                            : `Vote to this domain (${voteFeeLabel})`}
                </button>

                <span className="text-lg font-semibold text-white">Votes: {likesCount}</span>
            </div>

            <h3 className="font-medium mb-2 text-gray-200">Voters</h3>

            {loadingVoters ? (
                <p className="text-gray-400">Loading voters...</p>
            ) : voters.length === 0 ? (
                <p className="text-gray-400">No votes yet. Be the first to vote!</p>
            ) : (
                <ul className="space-y-1 max-h-48 overflow-auto border border-[#1d3b39] rounded p-2 font-mono text-sm text-gray-300">
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
                    className="px-2 py-1 bg-[#1d3b39] text-gray-200 rounded disabled:opacity-50"
                >
                    Previous
                </button>
                <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={voters.length < DOMAIN_LIKES_PER_PAGE}
                    className="px-2 py-1 bg-[#1d3b39] text-gray-200 rounded disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </section>
    );
}
