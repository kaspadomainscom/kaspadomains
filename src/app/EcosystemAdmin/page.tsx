"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Contract,
  JsonRpcSigner,
  ethers,
} from "ethers";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const contractAddress = "0x428C2524445cefa875E5B8DCa25E58902dcF2eF8"; 
const contractABI = [
  "function totalReceived() view returns (uint256)",
  "function totalDistributed() view returns (uint256)",
  "function lastDistributedAt() view returns (uint256)",
  "function getRecipients() view returns (tuple(address addr, uint8 percent, string label)[])",
  "function setRecipients(tuple(address addr, uint8 percent, string label)[] calldata)",
  "function distribute()",
  "function owner() view returns (address)",
  "event Received(address indexed from, uint256 amount)",
  "event Distributed(uint256 total, uint256 count, uint256 timestamp)",
];

type Recipient = {
  addr: string;
  percent: number;
  label: string;
};

type DistributedEvent = {
  args: {
    total: bigint;
    count: bigint;
    timestamp: bigint;
  };
};

type ReceivedEvent = {
  args: {
    from: string;
    amount: bigint;
    timestamp?: bigint;
  };
};

function formatTimestamp(ts: number | bigint) {
  const date = new Date(Number(ts) * 1000);
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function formatDateYearMonth(ts: number | bigint) {
  const d = new Date(Number(ts) * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function exportCSV(filename: string, rows: string[][]) {
  const csvContent =
    "data:text/csv;charset=utf-8," +
    rows.map((e) => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function EcosystemAdmin() {
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

  const [totalReceived, setTotalReceived] = useState("0");
  const [totalDistributed, setTotalDistributed] = useState("0");
  const [lastDistributedAt, setLastDistributedAt] = useState(0);
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  const [receivedEvents, setReceivedEvents] = useState<ReceivedEvent[]>([]);
  const [distributedEvents, setDistributedEvents] = useState<DistributedEvent[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 10;

  const [walletFilter, setWalletFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [txPending, setTxPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isOwner =
    connectedAddress && owner
      ? connectedAddress.toLowerCase() === owner.toLowerCase()
      : false;

  async function connectWallet() {
    setErrorMessage(null);
    if (typeof window.ethereum === "undefined") {
      setErrorMessage("MetaMask not detected. Please install MetaMask.");
      return;
    }
    try {
      setLoading(true);
      const _provider = new ethers.BrowserProvider(window.ethereum);
      const _signer = await _provider.getSigner();
      const _address = await _signer.getAddress();
      const _contract = new Contract(contractAddress, contractABI, _signer);
      const _owner = await _contract.owner();

      setSigner(_signer);
      setConnectedAddress(_address);
      setContract(_contract);
      setOwner(_owner);
    } catch (error) {
      setErrorMessage("Failed to connect wallet.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const loadContractData = useCallback(async () => {
    if (!contract) return;
    setErrorMessage(null);
    try {
      setLoading(true);
      const [totalRec, totalDist, lastDist, recips] = await Promise.all([
        contract.totalReceived(),
        contract.totalDistributed(),
        contract.lastDistributedAt(),
        contract.getRecipients(),
      ]);

      setTotalReceived(ethers.formatEther(totalRec));
      setTotalDistributed(ethers.formatEther(totalDist));
      setLastDistributedAt(Number(lastDist));
      setRecipients(recips);
    } catch (error) {
      setErrorMessage("Error loading contract data.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [contract]);

  const loadEvents = useCallback(async () => {
    if (!contract) return;
    setErrorMessage(null);
    try {
      setLoading(true);
      const received = (await contract.queryFilter(
        contract.filters.Received(),
        -10000
      )) as unknown as ReceivedEvent[];

      const distributed = (await contract.queryFilter(
        contract.filters.Distributed(),
        -10000
      )) as unknown as DistributedEvent[];

      setReceivedEvents(received);
      setDistributedEvents(distributed);
    } catch (error) {
      setErrorMessage("Error loading event logs.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [contract]);

  useEffect(() => {
    if (!contract) return;
    loadContractData();
    loadEvents();

    // Refresh every 30 seconds
    const intervalId = setInterval(() => {
      loadContractData();
      loadEvents();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [contract, loadContractData, loadEvents]);

  async function handleDistribute() {
    if (!contract || !signer) return setErrorMessage("Wallet not connected");
    setErrorMessage(null);

    if (!confirm("Are you sure you want to trigger fund distribution?")) return;

    try {
      setTxPending(true);
      const tx = await contract.distribute();
      await tx.wait();
      alert("Distribution successful!");
      loadContractData();
      loadEvents();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage("Distribution failed: " + err.message);
      } else {
        setErrorMessage("Distribution failed");
      }
    } finally {
      setTxPending(false);
    }
  }

  function updateRecipient(index: number, field: keyof Recipient, value: string | number) {
    setRecipients((prev) => {
      const newRecs = [...prev];
      if (field === "percent") {
        newRecs[index][field] = Number(value);
      } else {
        newRecs[index][field] = value as string;
      }
      return newRecs;
    });
  }

  function addRecipient() {
    setRecipients((prev) => [
      ...prev,
      { addr: "", percent: 0, label: "" }
    ]);
  }

  function removeRecipient(index: number) {
    if (!confirm("Remove this recipient?")) return;
    setRecipients((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveRecipients() {
    if (!contract || !signer) return setErrorMessage("Wallet not connected");
    setErrorMessage(null);

    try {
      const totalPercent = recipients.reduce((sum, r) => sum + r.percent, 0);
      if (totalPercent > 100) {
        setErrorMessage("Total percent cannot exceed 100");
        return;
      }
      for (const r of recipients) {
        if (!ethers.isAddress(r.addr)) {
          setErrorMessage(`Invalid address: ${r.addr}`);
          return;
        }
        if (r.percent <= 0) {
          setErrorMessage(`Percent must be positive for ${r.addr}`);
          return;
        }
      }

      setTxPending(true);
      const tx = await contract.setRecipients(
        recipients.map((r) => ({
          addr: r.addr,
          percent: r.percent,
          label: r.label,
        }))
      );
      await tx.wait();
      alert("Recipients updated successfully");
      loadContractData();
      loadEvents();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage("Failed to save recipients: " + err.message);
      } else {
        setErrorMessage("Failed to save recipients");
      }
    } finally {
      setTxPending(false);
    }
  }

  const filteredReceivedEvents = walletFilter
    ? receivedEvents.filter((e) =>
        e.args.from.toLowerCase().includes(walletFilter.toLowerCase())
      )
    : receivedEvents;

  const filteredDistributedEvents = walletFilter
    ? distributedEvents // Distributed event has no wallet info, show all anyway
    : distributedEvents;

  const paginatedEvents = filteredDistributedEvents
    .slice()
    .reverse()
    .slice((currentPage - 1) * eventsPerPage, currentPage * eventsPerPage);

  const chartData = filteredDistributedEvents.map((e) => ({
    time: formatTimestamp(e.args.timestamp),
    kas: parseFloat(ethers.formatEther(e.args.total)),
  }));

  function prepareCSVGroupedByMonth() {
    const receivedGroups: Record<string, bigint> = {};
    filteredReceivedEvents.forEach((e) => {
      const ym = formatDateYearMonth(e.args.timestamp ?? BigInt(0));
      receivedGroups[ym] = (receivedGroups[ym] || BigInt(0)) + e.args.amount;
    });

    const distributedGroups: Record<string, bigint> = {};
    filteredDistributedEvents.forEach((e) => {
      const ym = formatDateYearMonth(e.args.timestamp ?? BigInt(0));
      distributedGroups[ym] = (distributedGroups[ym] || BigInt(0)) + e.args.total;
    });

    return { receivedGroups, distributedGroups };
  }

  function exportLogsCSV() {
    const header = ["Timestamp", "From", "Amount (KAS)"];
    const rows = filteredReceivedEvents.map((e) => [
      formatTimestamp(e.args.timestamp ?? BigInt(0)),
      e.args.from,
      ethers.formatEther(e.args.amount),
    ]);
    exportCSV("received_events.csv", [header, ...rows]);
  }

  function exportDistributionsCSV() {
    const header = ["Timestamp", "Total KAS", "Recipients"];
    const rows = filteredDistributedEvents.map((e) => [
      formatTimestamp(e.args.timestamp),
      ethers.formatEther(e.args.total),
      e.args.count.toString(),
    ]);
    exportCSV("distributed_events.csv", [header, ...rows]);
  }

  function exportGroupedCSV() {
    const { receivedGroups, distributedGroups } = prepareCSVGroupedByMonth();

    const header = ["Year-Month", "Total Received (KAS)", "Total Distributed (KAS)"];
    const allMonths = new Set([
      ...Object.keys(receivedGroups),
      ...Object.keys(distributedGroups),
    ]);
    const rows = Array.from(allMonths)
      .sort()
      .map((ym) => [
        ym,
        receivedGroups[ym] ? ethers.formatEther(receivedGroups[ym]) : "0",
        distributedGroups[ym] ? ethers.formatEther(distributedGroups[ym]) : "0",
      ]);
    exportCSV("grouped_transfers.csv", [header, ...rows]);
  }

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "auto",
        padding: 24,
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: "#222",
        backgroundColor: "#fefefe",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        borderRadius: 12,
      }}
    >
      {!connectedAddress ? (
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 28, marginBottom: 16, color: "#333" }}>
            Connect Your Wallet
          </h2>
          <p style={{ maxWidth: 480, margin: "auto 0 24px" }}>
            To administer the KaspaDomains Ecosystem Fund, please connect your
            Ethereum-compatible wallet. MetaMask is recommended for ease of use.
          </p>
          <button
            onClick={connectWallet}
            style={{
              padding: "12px 28px",
              fontSize: 16,
              backgroundColor: "#2962ff",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              boxShadow: "0 4px 8px rgba(41, 98, 255, 0.4)",
              transition: "background-color 0.3s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#0039cb")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#2962ff")
            }
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Connecting..." : "Connect with MetaMask"}
          </button>
          {errorMessage && (
            <p style={{ color: "red", marginTop: 16 }}>{errorMessage}</p>
          )}
        </div>
      ) : (
        <>
          <header
            style={{
              marginBottom: 28,
              borderBottom: "2px solid #2962ff",
              paddingBottom: 12,
            }}
          >
            <h1 style={{ fontSize: 32, color: "#2962ff" }}>
              KaspaDomains Ecosystem Fund Administration
            </h1>
            <p style={{ fontSize: 14, color: "#555" }}>
              Manage fund recipients, view distribution history, and export data
              related to KaspaDomains ecosystem payments and distributions.
            </p>
            <p style={{ marginTop: 8 }}>
              Connected as:{" "}
              <b style={{ fontFamily: "monospace" }}>{connectedAddress}</b>{" "}
              {isOwner ? (
                <span style={{ color: "green" }} aria-label="Admin user">✅ You are an Admin</span>
              ) : (
                <span style={{ color: "red" }} aria-label="Not an admin">⛔ Not an Admin</span>
              )}
            </p>
            {errorMessage && (
              <p style={{ color: "red", marginTop: 8 }}>{errorMessage}</p>
            )}
          </header>

          <section
            aria-label="Summary of Fund Status"
            style={{
              marginBottom: 32,
              padding: 20,
              borderRadius: 10,
              backgroundColor: "#e3f2fd",
              boxShadow: "inset 0 0 8px #bbdefb",
              position: "relative",
            }}
          >
            <h2 style={{ color: "#1565c0", marginBottom: 12 }}>
              Fund Summary
            </h2>
            <p>
              <strong>Total Received:</strong> {totalReceived} KAS
            </p>
            <p>
              <strong>Total Distributed:</strong> {totalDistributed} KAS
            </p>
            <p>
              <strong>Current Balance:</strong>{" "}
              {(parseFloat(totalReceived) - parseFloat(totalDistributed)).toFixed(
                4
              )}{" "}
              KAS
            </p>
            <p>
              <strong>Last Distribution:</strong> {formatTimestamp(lastDistributedAt)}
            </p>

            {isOwner && (
              <button
                onClick={handleDistribute}
                style={{
                  marginTop: 20,
                  padding: "14px 24px",
                  backgroundColor: txPending ? "#9e9e9e" : "#00c853",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: txPending ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  fontSize: 16,
                  boxShadow: txPending ? "none" : "0 5px 12px rgba(0, 200, 83, 0.5)",
                  transition: "background-color 0.3s",
                }}
                onMouseEnter={(e) =>
                  !txPending && (e.currentTarget.style.backgroundColor = "#009624")
                }
                onMouseLeave={(e) =>
                  !txPending && (e.currentTarget.style.backgroundColor = "#00c853")
                }
                title="Click to trigger distribution of the ecosystem fund"
                disabled={txPending}
                aria-busy={txPending}
              >
                {txPending ? "Distributing..." : "Trigger Distribution"}
              </button>
            )}

            <p style={{ marginTop: 12, fontSize: 13, color: "#555" }}>
              * Only admins can trigger fund distribution. This will send KAS to
              the configured recipients based on their set percentages.
            </p>
          </section>

          <section
            aria-label="Edit fund recipients"
            style={{
              marginBottom: 32,
              padding: 20,
              borderRadius: 10,
              backgroundColor: "#e8f5e9",
              boxShadow: "inset 0 0 8px #c8e6c9",
            }}
          >
            <h2 style={{ color: "#2e7d32", marginBottom: 14 }}>
              Manage Recipients
            </h2>
            <p style={{ marginBottom: 12, fontSize: 14, color: "#2e7d32" }}>
              Define the addresses and allocation percentages of fund recipients.
              The total percentage must not exceed 100%.
            </p>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
              border={1}
              cellPadding={6}
            >
              <thead style={{ backgroundColor: "#a5d6a7" }}>
                <tr>
                  <th>#</th>
                  <th>Address</th>
                  <th>Percent (%)</th>
                  <th>Label / Description</th>
                  {isOwner && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {recipients.map((r, i) => (
                  <tr
                    key={i}
                    style={{
                      backgroundColor: i % 2 === 0 ? "#dcedc8" : "#f1f8e9",
                    }}
                  >
                    <td style={{ textAlign: "center" }}>{i + 1}</td>
                    <td>
                      <input
                        type="text"
                        value={r.addr}
                        style={{
                          width: "100%",
                          fontFamily: "monospace",
                          padding: "4px 6px",
                          borderRadius: 4,
                          border: "1px solid #ccc",
                        }}
                        onChange={(e) => updateRecipient(i, "addr", e.target.value)}
                        disabled={!isOwner || txPending}
                        spellCheck={false}
                        autoComplete="off"
                        aria-label={`Recipient address #${i + 1}`}
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={r.percent}
                        style={{
                          width: "60px",
                          padding: "4px 6px",
                          borderRadius: 4,
                          border: "1px solid #ccc",
                          textAlign: "center",
                        }}
                        onChange={(e) => updateRecipient(i, "percent", e.target.value)}
                        disabled={!isOwner || txPending}
                        aria-label={`Recipient percent #${i + 1}`}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={r.label}
                        style={{
                          width: "100%",
                          padding: "4px 6px",
                          borderRadius: 4,
                          border: "1px solid #ccc",
                        }}
                        onChange={(e) => updateRecipient(i, "label", e.target.value)}
                        disabled={!isOwner || txPending}
                        aria-label={`Recipient label #${i + 1}`}
                      />
                    </td>
                    {isOwner && (
                      <td style={{ textAlign: "center" }}>
                        <button
                          onClick={() => removeRecipient(i)}
                          disabled={txPending}
                          aria-label={`Remove recipient #${i + 1}`}
                          style={{
                            backgroundColor: "#e53935",
                            color: "white",
                            border: "none",
                            padding: "6px 10px",
                            borderRadius: 4,
                            cursor: txPending ? "not-allowed" : "pointer",
                            transition: "background-color 0.3s",
                          }}
                          onMouseEnter={(e) =>
                            !txPending && (e.currentTarget.style.backgroundColor = "#ab000d")
                          }
                          onMouseLeave={(e) =>
                            !txPending && (e.currentTarget.style.backgroundColor = "#e53935")
                          }
                        >
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {isOwner && (
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={addRecipient}
                  disabled={txPending}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#388e3c",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: txPending ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    fontSize: 15,
                    boxShadow: "0 4px 10px rgba(56, 142, 60, 0.5)",
                    transition: "background-color 0.3s",
                    marginRight: 12,
                  }}
                  onMouseEnter={(e) =>
                    !txPending && (e.currentTarget.style.backgroundColor = "#2e7d32")
                  }
                  onMouseLeave={(e) =>
                    !txPending && (e.currentTarget.style.backgroundColor = "#388e3c")
                  }
                  aria-label="Add new recipient"
                >
                  + Add Recipient
                </button>
                <button
                  onClick={saveRecipients}
                  disabled={txPending}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#2e7d32",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: txPending ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    fontSize: 15,
                    boxShadow: "0 4px 10px rgba(46, 125, 50, 0.5)",
                    transition: "background-color 0.3s",
                  }}
                  onMouseEnter={(e) =>
                    !txPending && (e.currentTarget.style.backgroundColor = "#1b5e20")
                  }
                  onMouseLeave={(e) =>
                    !txPending && (e.currentTarget.style.backgroundColor = "#2e7d32")
                  }
                  aria-label="Save recipients to blockchain"
                >
                  Save Recipients
                </button>
              </div>
            )}
          </section>

          <section
            aria-label="Event logs filter and export"
            style={{
              marginBottom: 24,
              padding: 16,
              borderRadius: 10,
              backgroundColor: "#fffde7",
              boxShadow: "inset 0 0 8px #fff59d",
            }}
          >
            <label htmlFor="walletFilter" style={{ fontWeight: "600" }}>
              Filter Received Events by Wallet Address:
            </label>
            <input
              id="walletFilter"
              type="text"
              value={walletFilter}
              onChange={(e) => setWalletFilter(e.target.value)}
              placeholder="Enter wallet address substring"
              style={{
                marginLeft: 12,
                padding: 6,
                fontFamily: "monospace",
                width: 320,
                borderRadius: 6,
                border: "1px solid #ccc",
              }}
              spellCheck={false}
              autoComplete="off"
            />
          </section>

          <section
            aria-label="Received events log"
            style={{ marginBottom: 36 }}
          >
            <h2 style={{ color: "#f57f17" }}>Received Events Log</h2>
            <p style={{ fontSize: 14, color: "#f9a825" }}>
              Showing {filteredReceivedEvents.length} events.
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
                  {filteredReceivedEvents.map((e, i) => (
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
                  {filteredReceivedEvents.length === 0 && (
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

          <section
            aria-label="Distribution events log"
            style={{ marginBottom: 36 }}
          >
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
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                  setCurrentPage((p) =>
                    p * eventsPerPage >= filteredDistributedEvents.length ? p : p + 1
                  )
                }
                disabled={currentPage * eventsPerPage >= filteredDistributedEvents.length}
                aria-label="Next page"
                style={{
                  padding: "6px 12px",
                  borderRadius: 4,
                  border: "1px solid #7e57c2",
                  backgroundColor:
                    currentPage * eventsPerPage >= filteredDistributedEvents.length
                      ? "#ccc"
                      : "#9575cd",
                  color:
                    currentPage * eventsPerPage >= filteredDistributedEvents.length
                      ? "#666"
                      : "white",
                  cursor:
                    currentPage * eventsPerPage >= filteredDistributedEvents.length
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
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#7e57c2")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#9575cd")
                }
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
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#4a148c")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#7b1fa2")
                }
              >
                Export Grouped CSV (Monthly)
              </button>
            </div>
          </section>

          <section aria-label="Distribution graph" style={{ height: 320 }}>
            <h2 style={{ color: "#00796b", marginBottom: 12 }}>
              Distribution Over Time (KAS)
            </h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="time" />
                  <YAxis
                    label={{ value: "KAS", angle: -90, position: "insideLeft" }}
                    domain={[0, "auto"]}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="kas"
                    stroke="#00796b"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>No distribution data available.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
