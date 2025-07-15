"use client";

import React from "react";
import { ethers } from "ethers";

type ReceivedEvent = {
  args: {
    from: string;
    amount: bigint;
    timestamp?: bigint;
  };
};

interface Props {
  events: ReceivedEvent[];
  formatTimestamp: (ts: number | bigint) => string;
  exportLogsCSV: () => void;
}

export default function ReceivedEventsTable({
  events,
  formatTimestamp,
  exportLogsCSV,
}: Props) {
  return (
    <section aria-label="Received events log" style={{ marginBottom: 36 }}>
      <h2 style={{ color: "#f57f17" }}>Received Events Log</h2>
      <p style={{ fontSize: 14, color: "#f9a825" }}>
        Showing {events.length} events.
      </p>
      <div
        style={{
          maxHeight: 240,
          overflowY: "auto",
          border: "1px solid #fbc02d",
          borderRadius: 6,
          backgroundColor: "#fffde7",
          fontSize: 14,
          fontFamily: "monospace",
        }}
        tabIndex={0}
        aria-live="polite"
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse" }}
          aria-label="Received events table"
        >
          <thead style={{ backgroundColor: "#fff176" }}>
            <tr>
              <th>Timestamp</th>
              <th>From</th>
              <th>Amount (KAS)</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => (
              <tr
                key={i}
                style={{
                  backgroundColor: i % 2 === 0 ? "#fffde7" : "#fff9c4",
                }}
              >
                <td>{formatTimestamp(e.args.timestamp ?? BigInt(0))}</td>
                <td>{e.args.from}</td>
                <td>{ethers.formatEther(e.args.amount)}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: 12 }}>
                  No events found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        onClick={exportLogsCSV}
        style={{
          marginTop: 10,
          padding: "8px 16px",
          backgroundColor: "#f9a825",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
          color: "#3e2723",
          fontWeight: "600",
          fontSize: 14,
          boxShadow: "0 3px 8px rgba(249, 168, 37, 0.6)",
          transition: "background-color 0.3s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "#fbc02d")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "#f9a825")
        }
        aria-label="Export Received events CSV"
      >
        Export Received CSV
      </button>
    </section>
  );
}
