'use client';

import React from 'react';

type FundSummaryProps = {
  totalReceived: string;
  totalDistributed: string;
  lastDistributedAt: number;
  isOwner: boolean;
  txPending: boolean;
  loading?: boolean;
  onDistribute: () => void;
};

function formatTimestamp(ts: number | bigint) {
  const date = new Date(Number(ts) * 1000);
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function FundSummary({
  totalReceived,
  totalDistributed,
  lastDistributedAt,
  isOwner,
  txPending,
  loading = false,
  onDistribute,
}: FundSummaryProps) {
  const currentBalance = (
    parseFloat(totalReceived) - parseFloat(totalDistributed)
  ).toFixed(4);

  const isDisabled = txPending || loading;

  return (
    <section
      aria-label="Summary of Fund Status"
      className="
        mb-8 p-5 rounded-lg bg-blue-100 relative
        shadow-inner
        before:absolute before:inset-0 before:rounded-lg before:pointer-events-none before:content-[''] before:shadow-[inset_0_0_8px_rgba(187,222,251,1)]
      "
    >
      <h2 className="text-blue-800 mb-3 text-xl font-semibold">Fund Summary</h2>
      <p>
        <strong>Total Received:</strong> {totalReceived} KAS
      </p>
      <p>
        <strong>Total Distributed:</strong> {totalDistributed} KAS
      </p>
      <p>
        <strong>Current Balance:</strong> {currentBalance} KAS
      </p>
      <p>
        <strong>Last Distribution:</strong> {formatTimestamp(lastDistributedAt)}
      </p>

      {isOwner && (
        <>
          <button
            onClick={onDistribute}
            disabled={isDisabled}
            aria-busy={isDisabled}
            title="Click to trigger distribution of the ecosystem fund"
            className={`
              mt-5 px-6 py-3 rounded-lg font-semibold text-white
              flex items-center justify-center gap-2
              transition-colors duration-300
              ${isDisabled
                ? 'bg-gray-400 cursor-not-allowed shadow-none'
                : 'bg-green-600 hover:bg-green-700 shadow-lg'}
            `}
          >
            {(txPending || loading) && (
              <span
                className="w-4 h-4 border-4 border-white border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
            )}
            {txPending
              ? 'Distributing...'
              : loading
              ? 'Loading...'
              : 'Trigger Distribution'}
          </button>

          <p className="mt-3 text-xs text-gray-600">
            * Only admins can trigger fund distribution. This will send KAS to
            the configured recipients based on their set percentages.
          </p>
        </>
      )}
    </section>
  );
}
