// components/DistributionHistoryTable.tsx
"use client";

import React from "react";
import { ethers } from "ethers";

type DistributedEvent = {
  args: {
    total: bigint;
    count: bigint;
    timestamp: bigint;
  };
};

type Props = {
  distributedEvents: DistributedEvent[];
  currentPage: number;
  eventsPerPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  exportDistributionsCSV: () => void;
  exportGroupedCSV: () => void;
  formatTimestamp: (ts: number | bigint) => string;
};

export default function DistributionHistoryTable({
  distributedEvents,
  currentPage,
  eventsPerPage,
  setCurrentPage,
  exportDistributionsCSV,
  exportGroupedCSV,
  formatTimestamp,
}: Props) {
  const paginatedEvents = distributedEvents
    .slice()
    .reverse()
    .slice((currentPage - 1) * eventsPerPage, currentPage * eventsPerPage);

  return (
    <section aria-label="Distribution events log" style={{ marginBottom: 36 }}>
      <h2 style={{ color: "#4a148c" }}>Distribution Events Log</h2>
      <p style={{ fontSize: 14, color: "#7e57c2" }}>
        Showing {distributedEvents.length} events.
      </p>

      <div
        style={{
          maxHeight: 240,
          overflowY: "auto",
          border: "1px solid #7e57c2",
          borderRadius: 6,
          backgroundColor: "#ede7f6",
          fontSize: 14,
          fontFamily: "monospace",
        }}
        tabIndex={0}
        aria-live="polite"
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse" }}
          aria-label="Distribution events table"
        >
          <thead style={{ backgroundColor: "#9575cd" }}>
            <tr>
              <th>Timestamp</th>
              <th>Total Distributed (KAS)</th>
              <th>Recipients Count</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEvents.length > 0 ? (
              paginatedEvents.map((e, i) => (
                <tr
                  key={i}
                  style={{
                    backgroundColor: i % 2 === 0 ? "#ede7f6" : "#d1c4e9",
                  }}
                >
                  <td>{formatTimestamp(e.args.timestamp)}</td>
                  <td>{ethers.formatEther(e.args.total)}</td>
                  <td>{e.args.count.toString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: 12 }}>
                  No events found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          justifyContent: "center",
          gap: 12,
          alignItems: "center",
        }}
        aria-label="Distribution events pagination"
      >
        <button
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          aria-label="Previous page"
          style={{
            padding: "6px 12px",
            borderRadius: 4,
            border: "1px solid #7e57c2",
            backgroundColor: currentPage === 1 ? "#ccc" : "#9575cd",
            color: currentPage === 1 ? "#666" : "white",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
          }}
        >
          Prev
        </button>
        <span aria-live="polite" aria-atomic="true">
          Page {currentPage}
        </span>
        <button
          onClick={() =>
            setCurrentPage((prev) =>
              prev * eventsPerPage >= distributedEvents.length ? prev : prev + 1
            )
          }
          disabled={currentPage * eventsPerPage >= distributedEvents.length}
          aria-label="Next page"
          style={{
            padding: "6px 12px",
            borderRadius: 4,
            border: "1px solid #7e57c2",
            backgroundColor:
              currentPage * eventsPerPage >= distributedEvents.length
                ? "#ccc"
                : "#9575cd",
            color:
              currentPage * eventsPerPage >= distributedEvents.length
                ? "#666"
                : "white",
            cursor:
              currentPage * eventsPerPage >= distributedEvents.length
                ? "not-allowed"
                : "pointer",
          }}
        >
          Next
        </button>
      </div>

      {/* Export Buttons */}
      <div style={{ marginTop: 14 }}>
        <button
          onClick={exportDistributionsCSV}
          style={{
            padding: "8px 16px",
            backgroundColor: "#9575cd",
            color: "white",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: 14,
            marginRight: 12,
          }}
        >
          Export Distribution CSV
        </button>
        <button
          onClick={exportGroupedCSV}
          style={{
            padding: "8px 16px",
            backgroundColor: "#7b1fa2",
            color: "white",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: 14,
          }}
        >
          Export Grouped CSV (Monthly)
        </button>
      </div>
    </section>
  );
}
