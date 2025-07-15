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
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
            setCurrentPage(
              currentPage * eventsPerPage >= distributedEvents.length
                ? currentPage
                : currentPage + 1
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

      <div style={{ marginTop: 14 }}>
        <button
          onClick={exportDistributionsCSV}
          aria-label="Export Distributions CSV"
          style={{
            padding: "8px 16px",
            backgroundColor: "#9575cd",
            color: "white",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: 14,
            boxShadow: "0 3px 8px rgba(149, 117, 205, 0.6)",
            transition: "background-color 0.3s",
            marginRight: 12,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#7e57c2")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#9575cd")}
        >
          Export Distribution CSV
        </button>
        <button
          onClick={exportGroupedCSV}
          aria-label="Export Grouped Transfers CSV"
          style={{
            padding: "8px 16px",
            backgroundColor: "#7b1fa2",
            color: "white",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: 14,
            boxShadow: "0 3px 8px rgba(123, 31, 162, 0.7)",
            transition: "background-color 0.3s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#4a148c")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#7b1fa2")}
        >
          Export Grouped CSV (Monthly)
        </button>
      </div>
    </section>
  );
};

export default DistributionEventsTable;
