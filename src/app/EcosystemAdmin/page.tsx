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

// ethers v6: Event no longer exported, use Log type and cast args explicitly
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
            // Cast returned logs as typed events
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
        <div
            style={{
                maxWidth: 960,
                margin: "auto",
                padding: 24,
                marginLeft: "16px",
                marginRight: "16px",
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                color: "#222",
                backgroundColor: "#fefefe",
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                borderRadius: 12,
            }}
        >
            {!account ? (
                <div style={{ textAlign: "center" }}>
                    <h2 style={{ fontSize: 28, marginBottom: 16, color: "#333" }}>
                        Connect Your Wallet
                    </h2>
                    <p style={{ maxWidth: 480, margin: "auto 0 24px" }}>
                        To administer the KaspaDomains Ecosystem Fund, please connect your
                        Ethereum-compatible wallet. MetaMask is recommended for ease of use.
                    </p>
                    <button
                        onClick={metamask.connect}
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
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0039cb")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2962ff")}
                        aria-busy={loading}
                    >
                        Connect with MetaMask
                    </button>
                    {errorMessage && <p style={{ color: "red", marginTop: 16 }}>{errorMessage}</p>}
                </div>
            ) : !isOwner ? (
                <div
                    style={{
                        textAlign: "center",
                        marginTop: 100,
                        padding: 24,
                        border: "2px solid #e53e3e",
                        backgroundColor: "#fff5f5",
                        color: "#c53030",
                        borderRadius: 12,
                        boxShadow: "0 2px 12px rgba(197, 33, 33, 0.3)",
                        fontSize: 20,
                        maxWidth: 600,
                        marginLeft: "auto",
                        marginRight: "auto",
                    }}
                    role="alert"
                    aria-live="assertive"
                >
                    <p style={{ fontWeight: "bold", marginBottom: 12 }}>⛔ Access Denied</p>
                    <p>You are not authorized to enter this area.</p>
                    <p>
                        If you believe this is an error, please connect with the correct
                        wallet.
                    </p>
                    <button
                        onClick={disconnectAll}
                        style={{
                            marginTop: 24,
                            padding: "10px 20px",
                            fontSize: 16,
                            borderRadius: 6,
                            border: "none",
                            cursor: "pointer",
                            backgroundColor: "#c53030",
                            color: "white",
                            boxShadow: "0 3px 8px rgba(197, 33, 33, 0.6)",
                            transition: "background-color 0.3s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#9b2c2c")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#c53030")}
                    >
                        Disconnect Wallet
                    </button>
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
                            <b style={{ fontFamily: "monospace" }}>{account}</b>{" "}
                            <span style={{ color: "green" }} aria-label="Admin user">
                                ✅ You are an Admin
                            </span>
                        </p>
                        {errorMessage && <p style={{ color: "red", marginTop: 8 }}>{errorMessage}</p>}
                    </header>

                    <FundSummary
                        totalReceived={totalReceived}
                        totalDistributed={totalDistributed}
                        lastDistributedAt={lastDistributedAt}
                        isOwner={isOwner}
                        txPending={txPending}
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
                </>
            )}
        </div>
    );
}
