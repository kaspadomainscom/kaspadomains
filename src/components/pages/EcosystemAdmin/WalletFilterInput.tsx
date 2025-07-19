"use client";

import React from "react";

interface WalletFilterInputProps {
  value: string;
  onChange: (val: string) => void;
}

export default function WalletFilterInput({
  value,
  onChange,
}: WalletFilterInputProps) {
  return (
    <section
      aria-label="Event logs filter and export"
      className="mb-6 p-4 rounded-lg bg-yellow-50 shadow-inner shadow-yellow-200"
    >
      <label htmlFor="walletFilter" className="font-semibold">
        Filter Received Events by Wallet Address:
      </label>
      <input
        id="walletFilter"
        name="walletFilter"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter wallet address substring"
        className="ml-3 p-1.5 font-mono w-80 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        spellCheck={false}
        autoComplete="off"
        aria-describedby="walletFilterHelp"
      />
      <small id="walletFilterHelp" className="sr-only">
        Enter part or full wallet address to filter events
      </small>
    </section>
  );
}
