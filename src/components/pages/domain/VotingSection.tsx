"use client";

import { useState, useEffect, useMemo } from "react";
import { Contract, keccak256, toUtf8Bytes, formatEther, EventLog, Log } from "ethers";
import { useWalletContext } from "@/context/WalletContext";
import { contracts } from "@/lib/contracts";
import { JsonFragment } from "ethers";
import { isSupabaseConfigured } from "@/lib/supabase";
import { fetchVoteCount, fetchHasVoted, fetchVoters } from "@/data/supabaseSource";
import { signedFetch, readError, payFee, preflight } from "@/lib/signedFetch";
import { VOTE_FEE_SOMPI, formatKas } from "@/lib/fees";

const DOMAIN_LIKES_PER_PAGE = 10;
const VOTES_CONTRACT_ADDRESS = contracts.DomainVotesManager.address;
const VOTES_CONTRACT_ABI = contracts.DomainVotesManager.abi as JsonFragment[];

// Contract calls here must match DomainVotesManager's real ABI exactly:
// getDomainVoteCount (not getDomainLikeCount), hasUserVotedDomain (not
// hasUserLikedDomain), voteDomainByHash (not likeDomain -- and it takes a
// uint256 domainHash, not the domain name string), and the DomainVoted event
// (not DomainLiked). Verified against src/abis/DomainVotesManager.json --
// this component previously called functions/events that don't exist on the
// deployed contract, so voting has never actually worked.
export function VotingSection({ domainName }: { domainName: string }) {
    const { kasplex, kasware, signer } = useWalletContext();
    // Which identity counts depends on the store. Votes in the database are
    // recorded against the Kaspa L1 address that signed them, so the
    // "already voted?" check must use the same address -- comparing against the
    // Kasplex EVM account would never match and the button would stay enabled
    // until the server rejected the duplicate.
    const account = isSupabaseConfigured ? kasware.account : kasplex.account;

    // `null` means "not known", not "zero". A failed read used to leave both of
    // these at their empty values, so an outage rendered "Votes: 0" and "No
    // votes yet. Be the first to vote!" as statements of fact -- on a domain
    // that might have fifty votes, to a user about to pay 1 KAS believing they
    // were first. See docs/MIND.md #2.
    const [likesCount, setLikesCount] = useState<number | null>(null);
    const [userHasLiked, setUserHasLiked] = useState(false);
    const [voters, setVoters] = useState<string[] | null>(null);
    const [page, setPage] = useState(1);
    const [loadingVoters, setLoadingVoters] = useState(false);
    const [txPending, setTxPending] = useState(false);
    const [voteFeeWei, setVoteFeeWei] = useState<bigint | null>(null);
    const [contractUnavailable, setContractUnavailable] = useState(false);
    // Bumped after a successful vote to re-run the read effects.
    const [refreshKey, setRefreshKey] = useState(0);

    const domainHash = keccak256(toUtf8Bytes(domainName));
    const contract = useMemo(
        () => signer ? new Contract(VOTES_CONTRACT_ADDRESS, VOTES_CONTRACT_ABI, signer) : null,
        [signer]
    );

    // Load the current on-chain vote fee (don't hardcode it -- it's owner-adjustable).
    // The database path has a fixed fee from lib/fees.ts instead, paid on Kaspa
    // L1, so there is nothing to fetch there.
    useEffect(() => {
        if (isSupabaseConfigured) return;
        if (!contract) return;
        contract
            .voteFee()
            .then((fee: bigint) => {
                setVoteFeeWei(fee);
                setContractUnavailable(false);
            })
            .catch((err: unknown) => {
                // DomainVotesManager is unreachable at its configured address
                // (see docs/BUGS.md) -- surface this as an explicit, honest
                // state rather than leaving the button clickable forever.
                console.error(err);
                setContractUnavailable(true);
            });
    }, [contract]);

    // Load total vote count
    useEffect(() => {
        let cancelled = false;

        if (isSupabaseConfigured) {
            fetchVoteCount(domainName)
                .then((count) => {
                    if (!cancelled) setLikesCount(count);
                })
                .catch((error) => {
                    console.error(error);
                    if (!cancelled) setLikesCount(null);
                });
            return () => {
                cancelled = true;
            };
        }

        if (!contract) return;
        contract
            .getDomainVoteCount(domainName)
            .then((count: bigint) => {
                if (!cancelled) setLikesCount(Number(count));
            })
            .catch((error: unknown) => {
                console.error(error);
                if (!cancelled) setLikesCount(null);
            });

        return () => {
            cancelled = true;
        };
    }, [contract, domainName, refreshKey]);

    // Check if current user has voted for this domain
    useEffect(() => {
        let cancelled = false;

        async function loadUserVoteStatus() {
            if (!account) {
                if (!cancelled) setUserHasLiked(false);
                return;
            }

            try {
                if (isSupabaseConfigured) {
                    const hasVoted = await fetchHasVoted(domainName, account);
                    if (!cancelled) setUserHasLiked(hasVoted);
                    return;
                }

                if (!contract) {
                    if (!cancelled) setUserHasLiked(false);
                    return;
                }

                const hasVoted = await contract.hasUserVotedDomain(account, domainName);
                if (!cancelled) setUserHasLiked(hasVoted);
            } catch (error) {
                console.error(error);
            }
        }

        void loadUserVoteStatus();

        return () => {
            cancelled = true;
        };
    }, [contract, account, domainName, refreshKey]);

    // Fetch voters list, paginated
    useEffect(() => {
        let cancelled = false;

        if (!isSupabaseConfigured && !contract) return;

        async function loadVoters() {
            setLoadingVoters(true);

            if (isSupabaseConfigured) {
                try {
                    const addresses = await fetchVoters(domainName, page, DOMAIN_LIKES_PER_PAGE);
                    if (!cancelled) setVoters(addresses);
                } catch (error) {
                    console.error(error);
                    // null, not [] -- "we could not load the voters" is not
                    // "there are no voters".
                    if (!cancelled) setVoters(null);
                }
                if (!cancelled) setLoadingVoters(false);
                return;
            }

            if (!contract) return;

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

                if (!cancelled) setVoters(voterAddresses);
            } catch (error) {
                console.error(error);
                if (!cancelled) setVoters(null);
            }
            if (!cancelled) setLoadingVoters(false);
        }

        void loadVoters();

        return () => {
            cancelled = true;
        };
    }, [contract, domainHash, domainName, page, refreshKey]);

    async function onVote() {
        if (!account) {
            alert("Please connect your wallet");
            return;
        }
        // A contract is only needed on the chain path; the database path signs
        // a request instead, so requiring one here would block voting outright.
        if (!isSupabaseConfigured && !contract) {
            alert("Please connect your wallet");
            return;
        }
        if (votingUnavailable) {
            alert("Voting is temporarily unavailable. Please try again later.");
            return;
        }
        if (effectiveFeeWei === null) {
            alert("Vote fee not loaded yet, please try again in a moment.");
            return;
        }
        try {
            setTxPending(true);

            if (isSupabaseConfigured) {
                // Confirm the vote can be recorded *before* asking for money:
                // that the domain is listed, that this wallet hasn't already
                // voted, and that the server can write at all. All three used to
                // be discovered only after the 1 KAS had gone.
                const { intent, amountSompi } = await preflight({
                    action: 'vote',
                    domain: domainName,
                });

                // The server's quote, not our constant.
                const paymentTxId = await payFee(amountSompi);

                const response = await signedFetch({
                    action: 'vote',
                    domain: domainName,
                    path: `/api/domains/${encodeURIComponent(domainName)}/vote`,
                    body: { paymentTxId, intent },
                });

                if (!response.ok) {
                    alert(await readError(response, 'Could not record your vote.'));
                    return;
                }

                setUserHasLiked(true);
                setPage(1);
                // Re-read counts and voters from the server rather than
                // guessing them locally, so the UI shows what was stored.
                setRefreshKey((key) => key + 1);
                return;
            }

            // Chain path only: the early return above covers the database
            // path, and the guards established a contract exists here.
            if (!contract) return;

            const tx = await contract.voteDomainByHash(domainHash, {
                value: effectiveFeeWei,
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

    // Gate on whichever wallet actually signs the vote: L1 for the database
    // path, Kasplex for the on-chain one.
    const isConnected = isSupabaseConfigured
        ? kasware.status === "connected" && !!account
        : kasplex.status === "connected" && !!account;

    // Derived, not stored: with the database as the store there is no contract
    // to be unavailable and no fee to fetch -- votes are free (see docs/GAPS.md).
    const effectiveFeeWei = isSupabaseConfigured ? VOTE_FEE_SOMPI : voteFeeWei;
    const votingUnavailable = isSupabaseConfigured ? false : contractUnavailable;

    const voteFeeLabel = isSupabaseConfigured
        ? formatKas(VOTE_FEE_SOMPI)
        : effectiveFeeWei !== null
            ? `${formatEther(effectiveFeeWei)} KAS`
            : "…";

    return (
        <section className="mt-10 bg-[#122c2a] border border-[#1d3b39] rounded-xl p-6 shadow-md text-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-white">Support this Domain</h2>

            {votingUnavailable && (
                <p className="mb-4 text-sm text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded px-3 py-2">
                    Voting is temporarily unavailable — we&apos;re aware and working on it.
                </p>
            )}

            <div className="flex items-center gap-4 mb-4">
                <button
                    onClick={onVote}
                    disabled={!isConnected || userHasLiked || txPending || votingUnavailable}
                    className={`px-4 py-2 rounded font-semibold ${userHasLiked || votingUnavailable
                            ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                            : "bg-kaspaMint text-[#0F2F2E] hover:bg-[#3DFDAD]/90"
                        }`}
                >
                    {votingUnavailable
                        ? "Unavailable"
                        : userHasLiked
                        ? "You have voted"
                        : txPending
                            ? "Voting..."
                            : `Vote to this domain (${voteFeeLabel})`}
                </button>

                <span className="text-lg font-semibold text-white">
                    Votes: {likesCount === null ? '—' : likesCount}
                </span>
            </div>

            <h3 className="font-medium mb-2 text-gray-200">Voters</h3>

            {loadingVoters ? (
                <p className="text-gray-400">Loading voters...</p>
            ) : voters === null ? (
                <p className="text-yellow-400/90">
                    We couldn&apos;t load the voters for this domain, so we don&apos;t know
                    whether it has any. This is a problem on our side.
                </p>
            ) : voters.length === 0 ? (
                <p className="text-gray-400">No votes yet. Be the first to vote!</p>
            ) : (
                <ul className="space-y-1 max-h-48 overflow-auto border border-[#1d3b39] rounded p-2 font-mono text-sm text-gray-300">
                    {(voters ?? []).map((voter) => (
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
                    disabled={!voters || voters.length < DOMAIN_LIKES_PER_PAGE}
                    className="px-2 py-1 bg-[#1d3b39] text-gray-200 rounded disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </section>
    );
}
