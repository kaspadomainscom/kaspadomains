"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useWalletContext } from "@/context/WalletContext";
import FundSummary from "@/components/pages/EcosystemAdmin/FundSummary";
import { Contract, ethers, Eip1193Provider, Log } from "ethers";
import RecipientsTable from "@/components/pages/EcosystemAdmin/RecipientsTable";
import WalletFilterInput from "@/components/pages/EcosystemAdmin/WalletFilterInput";
import ReceivedEventsTable from "@/components/pages/EcosystemAdmin/ReceivedEventsTable";
import DistributionEventsTable from "@/components/pages/EcosystemAdmin/DistributionEventsTable";
import DistributionChart from "@/components/pages/EcosystemAdmin/DistributionChart";

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

type DistributedEvent = Log & {
  args: {
    total: bigint;
    count: bigint;
    timestamp: bigint;
  };
};

type ReceivedEvent = Log & {
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
    "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function EcosystemAdmin() {
  const { account, provider, metamask, disconnectAll } = useWalletContext();

  const rawProvider = useMemo<Eip1193Provider | null>(() => {
    if (provider) return provider as Eip1193Provider;
    if (metamask && "request" in metamask) return metamask as Eip1193Provider;
    if (typeof window !== "undefined") {
      const win = window as unknown as { ethereum?: unknown };
      if (
        win.ethereum &&
        typeof (win.ethereum as Eip1193Provider).request === "function"
      ) {
        return win.ethereum as Eip1193Provider;
      }
    }
    return null;
  }, [provider, metamask]);

  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  useEffect(() => {
    async function getSigner() {
      if (!rawProvider) return;
      try {
        const ethersProvider = new ethers.BrowserProvider(rawProvider);
        const _signer = await ethersProvider.getSigner();
        setSigner(_signer);
      } catch {
        setSigner(null);
      }
    }
    getSigner();
  }, [rawProvider]);

  const [contract, setContract] = useState<Contract | null>(null);
  const [owner, setOwner] = useState<string | null>(null);

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
    account && owner ? account.toLowerCase() === owner.toLowerCase() : false;

  useEffect(() => {
    if (!signer) {
      setContract(null);
      setOwner(null);
      return;
    }
    const _contract = new Contract(contractAddress, contractABI, signer);
    setContract(_contract);
    setErrorMessage(null);

    _contract
      .owner()
      .then((contractOwner: string) => setOwner(contractOwner))
      .catch((err: unknown) => {
        console.error("Failed to fetch contract owner:", err);
        setErrorMessage("Failed to fetch contract owner");
      });
  }, [signer]);

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
      )) as ReceivedEvent[];

      const distributed = (await contract.queryFilter(
        contract.filters.Distributed(),
        -10000
      )) as DistributedEvent[];

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

  function updateRecipient(
    index: number,
    field: keyof Recipient,
    value: string | number
  ) {
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

  const filteredReceivedEvents = walletFilter
    ? receivedEvents.filter((e) =>
        e.args.from.toLowerCase().includes(walletFilter.toLowerCase())
      )
    : receivedEvents;

  const filteredDistributedEvents = walletFilter
    ? distributedEvents // no wallet filter on distributed events
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

    const header = [
      "Year-Month",
      "Total Received (KAS)",
      "Total Distributed (KAS)",
    ];
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
    <div className="max-w-3xl mx-auto px-6 mt-4 mb-4 sm:px-10 py-6 bg-white rounded-xl shadow-md text-gray-900 font-sans relative">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 rounded-xl">
          <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-16 w-16"></div>
        </div>
      )}

      {!account ? (
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4 text-gray-800">
            Connect Your Wallet
          </h2>
          <p className="max-w-lg mx-auto mb-6 text-gray-600">
            To administer the KaspaDomains Ecosystem Fund, please connect your
            Ethereum-compatible wallet. MetaMask is recommended for ease of use.
          </p>
          <button
            onClick={metamask.connect}
            aria-busy={loading}
            disabled={loading}
            className={`px-7 py-3 text-lg font-medium rounded-md shadow transition-colors ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {loading ? (
              <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-5 w-5 mx-auto"></div>
            ) : (
              "Connect with MetaMask"
            )}
          </button>
          {errorMessage && (
            <p className="mt-4 text-red-600 font-semibold">{errorMessage}</p>
          )}
        </div>
      ) : !isOwner ? (
        <div
          role="alert"
          aria-live="assertive"
          className="max-w-lg mx-auto mt-24 p-6 border-2 border-red-600 bg-red-50 text-red-700 rounded-lg shadow-lg text-center text-lg"
        >
          <p className="font-bold mb-3">⛔ Access Denied</p>
          <p>You are not authorized to enter this area.</p>
          <p>If you believe this is an error, please connect with the correct wallet.</p>
          <button
            onClick={disconnectAll}
            className="mt-6 px-5 py-2 text-base rounded-md bg-red-600 text-white shadow hover:bg-red-700 transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>
      ) : (
        <>
          <header className="mb-7 border-b-2 border-blue-600 pb-3">
            <h1 className="text-3xl text-blue-600 font-semibold">
              KaspaDomains Ecosystem Fund Administration
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage fund recipients, view distribution history, and export data
              related to KaspaDomains ecosystem payments and distributions.
            </p>
            <p className="mt-2">
              Connected as:{" "}
              <b className="font-mono">{account}</b>{" "}
              <span className="text-green-600" aria-label="Admin user">
                ✅ You are an Admin
              </span>
            </p>
            {errorMessage && (
              <p className="text-red-600 mt-2 font-semibold">{errorMessage}</p>
            )}
          </header>

          <div className="space-y-8">
            <FundSummary
              totalReceived={totalReceived}
              totalDistributed={totalDistributed}
              lastDistributedAt={lastDistributedAt}
              isOwner={isOwner}
              txPending={txPending}
              loading={loading} /* New prop for disabling distribute button */
              onDistribute={handleDistribute}
            />

            <RecipientsTable
              recipients={recipients}
              isOwner={isOwner}
              txPending={txPending}
              updateRecipient={updateRecipient}
            />

            <WalletFilterInput value={walletFilter} onChange={setWalletFilter} />

            <ReceivedEventsTable
              events={filteredReceivedEvents}
              formatTimestamp={formatTimestamp}
              exportLogsCSV={exportLogsCSV}
            />

            <DistributionEventsTable
              distributedEvents={filteredDistributedEvents}
              paginatedEvents={paginatedEvents}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              eventsPerPage={eventsPerPage}
              formatTimestamp={formatTimestamp}
              exportDistributionsCSV={exportDistributionsCSV}
              exportGroupedCSV={exportGroupedCSV}
            />

            <DistributionChart chartData={chartData} />
          </div>
        </>
      )}
    </div>
  );
}
