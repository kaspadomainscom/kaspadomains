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
    <section
      aria-label="Received events log"
      className="mb-9" // 36px margin-bottom ≈ 9 * 4px
    >
      <h2 className="text-yellow-700">Received Events Log</h2>
      <p className="text-yellow-600 text-sm mb-2">
        Showing {events.length} events.
      </p>

      <div
        tabIndex={0}
        aria-live="polite"
        className="max-h-60 overflow-y-auto border border-yellow-400 rounded-md bg-yellow-50 font-mono text-sm"
      >
        <table
          className="w-full border-collapse"
          aria-label="Received events table"
        >
          <thead className="bg-yellow-200 sticky top-0 z-10">
            <tr>
              <th className="text-left px-4 py-2">Timestamp</th>
              <th className="text-left px-4 py-2">From</th>
              <th className="text-left px-4 py-2">Amount (KAS)</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="text-center py-3 text-gray-500 italic"
                >
                  No events found.
                </td>
              </tr>
            )}

            {events.map((e, i) => (
              <tr
                key={i}
                className={i % 2 === 0 ? "bg-yellow-50" : "bg-yellow-100"}
              >
                <td className="px-4 py-2">{formatTimestamp(e.args.timestamp ?? BigInt(0))}</td>
                <td className="px-4 py-2 break-all">{e.args.from}</td>
                <td className="px-4 py-2 font-semibold">
                  {ethers.formatEther(e.args.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={exportLogsCSV}
        aria-label="Export Received events CSV"
        className="mt-2 px-4 py-2 bg-yellow-400 rounded-md text-yellow-900 font-semibold shadow-md
                   transition-colors duration-300
                   hover:bg-yellow-300"
        type="button"
      >
        Export Received CSV
      </button>
    </section>
  );
}
