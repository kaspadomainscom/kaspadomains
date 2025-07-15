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
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
  );
}
