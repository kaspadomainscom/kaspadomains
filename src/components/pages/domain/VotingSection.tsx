"use client";

import { useEffect, useState } from "react";
import { useWalletContext } from "@/context/WalletContext";
import { fetchVoteCount, fetchHasVoted, fetchVoters } from "@/data/supabaseSource";
import { signedFetch, readError, payFee, preflight } from "@/lib/signedFetch";
import { formatKas, VOTE_FEE_SOMPI } from "@/lib/fees";

const VOTERS_PER_PAGE = 10;

/**
 * Vote for a domain, and show who already has.
 *
 * Votes live in Postgres and are keyed by the **Kaspa L1 address** that signed
 * them. The `DomainVotesManager` path this used to fall back to was removed on
 * 2026-09-06: that contract has no deployed code, and its presence had already
 * caused three separate bugs — a permanently "Unavailable" counter, a fee
 * variable holding sompi on one path and wei on the other, and an
 * "already voted?" check that compared against the wrong address entirely.
 *
 * Counts and voter lists are `null` for "not known". They are **not** `0` and
 * `[]`: a failed read used to render "Votes: 0" and "No votes yet. Be the first
 * to vote!" on a domain that might have fifty, to a user about to pay 1 KAS on
 * that basis.
 */
export function VotingSection({ domainName }: { domainName: string }) {
  const { kasware, account } = useWalletContext();

  const [votes, setVotes] = useState<number | null>(null);
  // Derived from a keyed result, so no state transition happens in an effect
  // body and one wallet's answer can never be shown while another connects.
  const [votedResult, setVotedResult] = useState<{ key: string; voted: boolean } | null>(null);
  const [voters, setVoters] = useState<string[] | null>(null);
  const [page, setPage] = useState(1);
  const [loadingVoters, setLoadingVoters] = useState(false);
  const [txPending, setTxPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Bumped after a successful vote to re-run the reads.
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetchVoteCount(domainName)
      .then((count) => {
        if (!cancelled) setVotes(count);
      })
      .catch((error) => {
        console.error("Failed to load vote count:", error);
        if (!cancelled) setVotes(null);
      });

    return () => {
      cancelled = true;
    };
  }, [domainName, refreshKey]);

  const voteKey = `${domainName}:${account ?? ""}:${refreshKey}`;

  useEffect(() => {
    if (!account) return;

    let cancelled = false;

    fetchHasVoted(domainName, account)
      .then((voted) => {
        if (!cancelled) setVotedResult({ key: voteKey, voted });
      })
      .catch((error) => {
        // Leaving the button enabled is the safe direction: the preflight
        // re-checks this server-side before any money moves, so the worst case
        // is a refusal rather than a wasted fee.
        console.error("Failed to check vote status:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [domainName, account, voteKey]);

  const hasVoted = votedResult?.key === voteKey && votedResult.voted;

  useEffect(() => {
    let cancelled = false;

    async function loadVoters() {
      setLoadingVoters(true);
      try {
        const addresses = await fetchVoters(domainName, page, VOTERS_PER_PAGE);
        if (!cancelled) setVoters(addresses);
      } catch (error) {
        console.error("Failed to load voters:", error);
        // null, not [] -- "we could not load the voters" is not "there are none".
        if (!cancelled) setVoters(null);
      } finally {
        if (!cancelled) setLoadingVoters(false);
      }
    }

    void loadVoters();

    return () => {
      cancelled = true;
    };
  }, [domainName, page, refreshKey]);

  async function onVote() {
    if (!account) {
      setMessage("Connect your Kasware wallet to vote.");
      return;
    }

    setMessage(null);
    setTxPending(true);

    try {
      // Confirm the vote can be recorded *before* asking for money: that the
      // domain is listed, that this wallet hasn't already voted, and that the
      // server can write at all. All three used to be discovered only after the
      // 1 KAS had gone.
      const { intent, amountSompi } = await preflight({ action: "vote", domain: domainName });

      // The server's quote, not our constant.
      const paymentTxId = await payFee(amountSompi);

      const response = await signedFetch({
        action: "vote",
        domain: domainName,
        path: `/api/domains/${encodeURIComponent(domainName)}/vote`,
        body: { paymentTxId, intent },
      });

      if (!response.ok) {
        setMessage(await readError(response, "Could not record your vote."));
        return;
      }

      setVotedResult({ key: voteKey, voted: true });
      setPage(1);
      // Re-read from the server rather than guessing locally, so the UI shows
      // what was actually stored.
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not record your vote.");
    } finally {
      setTxPending(false);
    }
  }

  const isConnected = kasware.status === "connected" && Boolean(account);

  return (
    <section className="mt-10 bg-[#122c2a] border border-[#1d3b39] rounded-xl p-6 shadow-md text-gray-100">
      <h2 className="text-xl font-semibold mb-4 text-white">Support this Domain</h2>

      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={onVote}
          disabled={!isConnected || hasVoted || txPending}
          className={`px-4 py-2 rounded font-semibold ${
            hasVoted
              ? "bg-gray-600 text-gray-300 cursor-not-allowed"
              : "bg-kaspaMint text-[#0F2F2E] hover:bg-[#3DFDAD]/90"
          }`}
        >
          {hasVoted
            ? "You have voted"
            : txPending
              ? "Voting..."
              : `Vote for this domain (${formatKas(VOTE_FEE_SOMPI)})`}
        </button>

        <span className="text-lg font-semibold text-white">
          Votes: {votes === null ? "—" : votes}
        </span>
      </div>

      {!isConnected && (
        <p className="mb-4 text-sm text-gray-400">
          Connect your Kasware wallet to vote.
        </p>
      )}

      {message && <p className="mb-4 text-sm text-red-400">{message}</p>}

      <h3 className="font-medium mb-2 text-gray-200">Voters</h3>

      {loadingVoters ? (
        <p className="text-gray-400">Loading voters...</p>
      ) : voters === null ? (
        <p className="text-yellow-400/90">
          We couldn&apos;t load the voters for this domain, so we don&apos;t know whether it
          has any. This is a problem on our side.
        </p>
      ) : voters.length === 0 ? (
        <p className="text-gray-400">No votes yet. Be the first to vote!</p>
      ) : (
        <ul className="space-y-1 max-h-48 overflow-auto border border-[#1d3b39] rounded p-2 font-mono text-sm text-gray-300">
          {voters.map((voter) => (
            <li key={voter}>{voter}</li>
          ))}
        </ul>
      )}

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
          disabled={!voters || voters.length < VOTERS_PER_PAGE}
          className="px-2 py-1 bg-[#1d3b39] text-gray-200 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </section>
  );
}
