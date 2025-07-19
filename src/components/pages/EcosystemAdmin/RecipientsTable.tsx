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
      className="mb-8 p-5 rounded-lg bg-green-50 shadow-inner shadow-green-200"
    >
      <h2 className="text-green-800 mb-3.5 font-semibold text-xl">
        Manage Recipients
      </h2>
      <p className="mb-3 text-sm text-green-800">
        Define the addresses and allocation percentages of fund recipients. The
        total percentage must not exceed 100%.
      </p>

      <table
        className="w-full border border-green-300 border-collapse text-sm"
        cellPadding={6}
        border={1}
      >
        <thead className="bg-green-300">
          <tr>
            <th className="text-center px-2 py-1">#</th>
            <th className="text-left px-2 py-1">Address</th>
            <th className="text-center px-2 py-1">Percent (%)</th>
            <th className="text-left px-2 py-1">Label / Description</th>
          </tr>
        </thead>
        <tbody>
          {recipients.map((r, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? "bg-green-100" : "bg-green-50"}
            >
              <td className="text-center px-2 py-1 align-middle">{i + 1}</td>
              <td className="px-2 py-1">
                <input
                  id={`recipient-addr-${i}`}
                  name={`recipients[${i}][addr]`}
                  type="text"
                  value={r.addr}
                  className="w-full font-mono px-1.5 py-1 rounded border border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  onChange={(e) => updateRecipient(i, "addr", e.target.value)}
                  disabled={!isOwner || txPending}
                  spellCheck={false}
                  autoComplete="off"
                  aria-label={`Recipient address #${i + 1}`}
                />
              </td>
              <td className="text-center px-2 py-1 align-middle">
                <input
                  id={`recipient-percent-${i}`}
                  name={`recipients[${i}][percent]`}
                  type="number"
                  min={0}
                  max={100}
                  value={r.percent}
                  className="w-[60px] text-center px-1.5 py-1 rounded border border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  onChange={(e) =>
                    updateRecipient(i, "percent", Number(e.target.value))
                  }
                  disabled={!isOwner || txPending}
                  aria-label={`Recipient percent #${i + 1}`}
                />
              </td>
              <td className="px-2 py-1">
                <input
                  id={`recipient-label-${i}`}
                  name={`recipients[${i}][label]`}
                  type="text"
                  value={r.label}
                  className="w-full px-1.5 py-1 rounded border border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
