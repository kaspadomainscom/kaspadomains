"use client";

import React from "react";

type Recipient = {
  addr: string;
  percent: number;
  label: string;
};

interface RecipientsTableProps {
  recipients: Recipient[];
  isOwner: boolean;
  txPending: boolean;
  updateRecipient: (
    index: number,
    field: keyof Recipient,
    value: string | number
  ) => void;
}

export default function RecipientsTable({
  recipients,
  isOwner,
  txPending,
  updateRecipient,
}: RecipientsTableProps) {
  return (
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
                  onChange={(e) =>
                    updateRecipient(i, "percent", e.target.value)
                  }
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
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
