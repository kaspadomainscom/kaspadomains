"use client";

import React, { useState, useEffect } from "react";
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

// Contract setup
const contractAddress = "0x428C2524445cefa875E5B8DCa25E58902dcF2eF8"; // Replace with your deployed address
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
  return date.toLocaleString();
}
function formatDateYearMonth(ts: number | bigint) {
  const d = new Date(Number(ts) * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Simple CSV export helper
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
  // Removed unused provider state
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

  // Wallet filter for logs (address substring, case insensitive)
  const [walletFilter, setWalletFilter] = useState("");

  const isOwner =
    connectedAddress && owner
      ? connectedAddress.toLowerCase() === owner.toLowerCase()
      : false;

  // MetaMask login
  async function connectWallet() {
    if (typeof window.ethereum === "undefined")
      return alert("MetaMask required");

    try {
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
      alert("Failed to connect wallet");
      console.error(error);
    }
  }

  // Load contract data
  useEffect(() => {
    if (!contract) return;

    async function loadData() {
      try {
        if (!contract) return;
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
        console.error("Error loading contract data:", error);
      }
    }

    loadData();
  }, [contract]);

  // Load events
  useEffect(() => {
    if (!contract) return;

    async function loadEvents() {
      try {
        if (!contract) return;
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
        console.error("Error loading events:", error);
      }
    }

    loadEvents();
  }, [contract]);

  // Trigger distribute()
  async function handleDistribute() {
    try {
      if (!contract || !signer) return;
      const tx = await contract.distribute();
      await tx.wait();
      alert("Distribution successful!");
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("Distribution failed: " + err.message);
      } else {
        alert("Distribution failed");
      }
    }
  }

  // Update recipient in state
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

  // Save recipients to contract
  async function saveRecipients() {
    if (!contract || !signer) return alert("Wallet not connected");

    try {
      // Validate recipients percent sum <= 100 and valid addresses
      const totalPercent = recipients.reduce((sum, r) => sum + r.percent, 0);
      if (totalPercent > 100) {
        return alert("Total percent cannot exceed 100");
      }
      for (const r of recipients) {
        if (!ethers.isAddress(r.addr)) {
          return alert(`Invalid address: ${r.addr}`);
        }
        if (r.percent <= 0) {
          return alert(`Percent must be positive for ${r.addr}`);
        }
      }

      const tx = await contract.setRecipients(
        recipients.map((r) => ({
          addr: r.addr,
          percent: r.percent,
          label: r.label,
        }))
      );
      await tx.wait();
      alert("Recipients updated successfully");
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("Failed to save recipients: " + err.message);
      } else {
        alert("Failed to save recipients");
      }
    }
  }

  // Filtered events by wallet filter
  const filteredReceivedEvents = walletFilter
    ? receivedEvents.filter((e) =>
        e.args.from.toLowerCase().includes(walletFilter.toLowerCase())
      )
    : receivedEvents;

  const filteredDistributedEvents = walletFilter
    ? distributedEvents.filter(() => true) // no wallet in Distributed event, show all
    : distributedEvents;

  const paginatedEvents = filteredDistributedEvents
    .slice()
    .reverse()
    .slice((currentPage - 1) * eventsPerPage, currentPage * eventsPerPage);

  const chartData = filteredDistributedEvents.map((e) => ({
    time: formatTimestamp(e.args.timestamp),
    kas: parseFloat(ethers.formatEther(e.args.total)),
  }));

  // Prepare CSV data grouped by year-month
  function prepareCSVGroupedByMonth() {
    // Group Received by year-month
    const receivedGroups: Record<string, bigint> = {};
    filteredReceivedEvents.forEach((e) => {
      const ym = formatDateYearMonth(e.args.timestamp ?? BigInt(0));
      receivedGroups[ym] = (receivedGroups[ym] || BigInt(0)) + e.args.amount;
    });

    // Group Distributed by year-month
    const distributedGroups: Record<string, bigint> = {};
    filteredDistributedEvents.forEach((e) => {
      const ym = formatDateYearMonth(e.args.timestamp ?? BigInt(0));
      distributedGroups[ym] = (distributedGroups[ym] || BigInt(0)) + e.args.total;
    });

    return { receivedGroups, distributedGroups };
  }

  function exportLogsCSV() {
    // Raw logs (Received)
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
        maxWidth: 900,
        margin: "auto",
        padding: 20,
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      {!connectedAddress ? (
        <div>
          <h2>Connect Wallet</h2>
          <button onClick={connectWallet} style={{ padding: "8px 16px" }}>
            Connect with MetaMask
          </button>
        </div>
      ) : (
        <>
          <h1 style={{ marginBottom: 8 }}>KaspaDomains Ecosystem Fund Admin</h1>

          <p>
            Connected as:{" "}
            <b style={{ fontFamily: "monospace" }}>{connectedAddress}</b>{" "}
            {isOwner ? (
              <span style={{ color: "green" }}>✅ Admin</span>
            ) : (
              <span style={{ color: "red" }}>⛔ Not Admin</span>
            )}
          </p>

          <section
            style={{
              marginBottom: 24,
              padding: 16,
              border: "1px solid #ccc",
              borderRadius: 8,
              background: "#f9f9f9",
            }}
          >
            <h2>Summary</h2>
            <p>
              <b>Total Received:</b> {totalReceived} KAS
            </p>
            <p>
              <b>Total Distributed:</b> {totalDistributed} KAS
            </p>
            <p>
              <b>Balance:</b>{" "}
              {(parseFloat(totalReceived) - parseFloat(totalDistributed)).toFixed(
                4
              )}{" "}
              KAS
            </p>
            <p>
              <b>Last Distribution:</b> {formatTimestamp(lastDistributedAt)}
            </p>
            {isOwner && (
              <button
                onClick={handleDistribute}
                style={{
                  marginTop: 12,
                  padding: "10px 16px",
                  backgroundColor: "#00c853",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Trigger Distribute()
              </button>
            )}
          </section>

          {/* Recipients editor */}
          <section
            style={{
              marginBottom: 24,
              padding: 16,
              border: "1px solid #ccc",
              borderRadius: 8,
              background: "#f4faff",
            }}
          >
            <h2>Recipients</h2>
            <table
              style={{ width: "100%", borderCollapse: "collapse" }}
              border={1}
              cellPadding={6}
            >
              <thead>
                <tr>
                  <th>#</th>
                  <th>Address</th>
                  <th>Percent</th>
                  <th>Label</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>
                      <input
                        type="text"
                        value={r.addr}
                        style={{ width: "100%", fontFamily: "monospace" }}
                        onChange={(e) =>
                          updateRecipient(i, "addr", e.target.value)
                        }
                        disabled={!isOwner}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={r.percent}
                        style={{ width: "60px" }}
                        onChange={(e) =>
                          updateRecipient(i, "percent", e.target.value)
                        }
                        disabled={!isOwner}
                      />
                      %
                    </td>
                    <td>
                      <input
                        type="text"
                        value={r.label}
                        style={{ width: "100%" }}
                        onChange={(e) =>
                          updateRecipient(i, "label", e.target.value)
                        }
                        disabled={!isOwner}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {isOwner && (
              <button
                onClick={saveRecipients}
                style={{
                  marginTop: 10,
                  padding: "8px 16px",
                  backgroundColor: "#1976d2",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Save Recipients
              </button>
            )}
          </section>

          <section
            style={{
              marginBottom: 24,
              padding: 16,
              border: "1px solid #ccc",
              borderRadius: 8,
              background: "#fff",
            }}
          >
            <h2>Filter Logs by Wallet Address</h2>
            <input
              type="text"
              placeholder="Filter by wallet address..."
              value={walletFilter}
              onChange={(e) => setWalletFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                fontFamily: "monospace",
                fontSize: "14px",
                marginBottom: "12px",
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
            />

            <h3>Distributions Chart</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="time" hide />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="kas" stroke="#00c853" />
              </LineChart>
            </ResponsiveContainer>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button onClick={exportLogsCSV} style={{ flex: "1 1 150px" }}>
                Export Received Logs CSV
              </button>
              <button
                onClick={exportDistributionsCSV}
                style={{ flex: "1 1 150px" }}
              >
                Export Distribution Logs CSV
              </button>
              <button onClick={exportGroupedCSV} style={{ flex: "1 1 200px" }}>
                Export Year/Month Grouped CSV
              </button>
            </div>
          </section>

          <section
            style={{
              marginBottom: 24,
              padding: 16,
              border: "1px solid #ccc",
              borderRadius: 8,
              background: "#fff",
              overflowX: "auto",
            }}
          >
            <h2>Distribution History (Page {currentPage})</h2>
            <table
              border={1}
              cellPadding={6}
              style={{ width: "100%", minWidth: 500, borderCollapse: "collapse" }}
            >
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Total KAS</th>
                  <th>Recipients</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEvents.map((e, i) => (
                  <tr key={i}>
                    <td>{formatTimestamp(e.args.timestamp)}</td>
                    <td>{ethers.formatEther(e.args.total)}</td>
                    <td>{e.args.count.toString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={
                  currentPage * eventsPerPage >= filteredDistributedEvents.length
                }
              >
                Next
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
