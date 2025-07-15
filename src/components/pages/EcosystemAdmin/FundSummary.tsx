// components/EcosystemAdmin/FundSummary.tsx
'use client';

import React from 'react';

type FundSummaryProps = {
  totalReceived: string;
  totalDistributed: string;
  lastDistributedAt: number;
  isOwner: boolean;
  txPending: boolean;
  loading?: boolean; // new optional prop
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
      style={{
        marginBottom: 32,
        padding: 20,
        borderRadius: 10,
        backgroundColor: '#e3f2fd',
        boxShadow: 'inset 0 0 8px #bbdefb',
        position: 'relative',
      }}
    >
      <h2 style={{ color: '#1565c0', marginBottom: 12 }}>Fund Summary</h2>
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
            style={{
              marginTop: 20,
              padding: '14px 24px',
              backgroundColor: isDisabled ? '#9e9e9e' : '#00c853',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: 16,
              boxShadow: isDisabled
                ? 'none'
                : '0 5px 12px rgba(0, 200, 83, 0.5)',
              transition: 'background-color 0.3s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            onMouseEnter={(e) =>
              !isDisabled && (e.currentTarget.style.backgroundColor = '#009624')
            }
            onMouseLeave={(e) =>
              !isDisabled && (e.currentTarget.style.backgroundColor = '#00c853')
            }
            title="Click to trigger distribution of the ecosystem fund"
            disabled={isDisabled}
            aria-busy={isDisabled}
          >
            {(txPending || loading) && (
              <span
                style={{
                  borderTopColor: 'white',
                  animation: 'spin 1s linear infinite',
                  borderRadius: '50%',
                  border: '3px solid rgba(255,255,255,0.5)',
                  borderTop: '3px solid white',
                  width: 18,
                  height: 18,
                }}
              />
            )}
            {txPending ? 'Distributing...' : loading ? 'Loading...' : 'Trigger Distribution'}
          </button>

          <p style={{ marginTop: 12, fontSize: 13, color: '#555' }}>
            * Only admins can trigger fund distribution. This will send KAS to
            the configured recipients based on their set percentages.
          </p>
        </>
      )}

      {/* Spinner keyframes for inline style */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}
