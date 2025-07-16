import { FC } from "react";
import { ethers } from "ethers";

interface DistributedEvent {
  args: {
    total: bigint;
    count: bigint;
    timestamp: bigint;
  };
}

interface Props {
  distributedEvents: DistributedEvent[];
  paginatedEvents: DistributedEvent[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  eventsPerPage: number;
  formatTimestamp: (ts: number | bigint) => string;
  exportDistributionsCSV: () => void;
  exportGroupedCSV: () => void;
}

const DistributionEventsTable: FC<Props> = ({
  distributedEvents,
  paginatedEvents,
  currentPage,
  setCurrentPage,
  eventsPerPage,
  formatTimestamp,
  exportDistributionsCSV,
  exportGroupedCSV,
}) => {
  const isPrevDisabled = currentPage === 1;
  const isNextDisabled = currentPage * eventsPerPage >= distributedEvents.length;

  return (
    <section aria-label="Distribution events log" className="mb-9">
      <h2 className="text-purple-900 text-xl font-semibold">Distribution Events Log</h2>
      <p className="text-purple-400 text-sm mb-3">
        Showing {distributedEvents.length} events.
      </p>

      <div
        tabIndex={0}
        aria-live="polite"
        className="max-h-60 overflow-y-auto border border-purple-400 rounded-md bg-purple-100 text-sm font-mono"
      >
        <table className="w-full border-collapse" aria-label="Distribution events table">
          <thead className="bg-purple-400 text-white">
            <tr>
              <th className="px-3 py-2 text-left">Timestamp</th>
              <th className="px-3 py-2 text-left">Total Distributed (KAS)</th>
              <th className="px-3 py-2 text-left">Recipients Count</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEvents.length > 0 ? (
              paginatedEvents.map((e, i) => (
                <tr
                  key={i}
                  className={i % 2 === 0 ? "bg-purple-100" : "bg-purple-200"}
                >
                  <td className="px-3 py-2">{formatTimestamp(e.args.timestamp)}</td>
                  <td className="px-3 py-2">{ethers.formatEther(e.args.total)}</td>
                  <td className="px-3 py-2">{e.args.count.toString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center py-3 text-gray-500 italic">
                  No events found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div
        aria-label="Distribution events pagination"
        className="mt-3 flex justify-center items-center gap-3"
      >
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={isPrevDisabled}
          aria-label="Previous page"
          className={`px-3 py-1 rounded border border-purple-400 font-semibold transition-colors ${
            isPrevDisabled
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-purple-400 text-white hover:bg-purple-500 cursor-pointer"
          }`}
        >
          Prev
        </button>
        <span aria-live="polite" aria-atomic="true" className="font-medium">
          Page {currentPage}
        </span>
        <button
          onClick={() =>
            setCurrentPage(
              isNextDisabled ? currentPage : currentPage + 1
            )
          }
          disabled={isNextDisabled}
          aria-label="Next page"
          className={`px-3 py-1 rounded border border-purple-400 font-semibold transition-colors ${
            isNextDisabled
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-purple-400 text-white hover:bg-purple-500 cursor-pointer"
          }`}
        >
          Next
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={exportDistributionsCSV}
          aria-label="Export Distributions CSV"
          className="px-4 py-2 bg-purple-400 hover:bg-purple-500 text-white rounded-lg font-semibold shadow-md transition-colors"
        >
          Export Distribution CSV
        </button>
        <button
          onClick={exportGroupedCSV}
          aria-label="Export Grouped Transfers CSV"
          className="px-4 py-2 bg-purple-700 hover:bg-purple-900 text-white rounded-lg font-semibold shadow-md transition-colors"
        >
          Export Grouped CSV (Monthly)
        </button>
      </div>
    </section>
  );
};

export default DistributionEventsTable;
