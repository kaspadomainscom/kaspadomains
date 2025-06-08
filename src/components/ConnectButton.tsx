// src/components/ConnectButton.tsx
'use client';

import React from 'react';
import { useKasware } from '@/hooks/useKasware'; // adjust path as needed

export default function ConnectButton() {
  const { address, connect, disconnect, connecting, isInstalled } = useKasware();

  return (
    <div>
      {address ? (
        <button onClick={disconnect} className="px-4 py-2 bg-green-400 text-black rounded">
          {address.slice(0, 8)}... (Disconnect)
        </button>
      ) : (
        <button
          onClick={connect}
          disabled={connecting}
          className="px-4 py-2 bg-green-400 text-black rounded disabled:opacity-50"
        >
          {connecting ? 'Connecting...' : isInstalled ? 'Connect Wallet' : 'KasWare Not Installed'}
        </button>
      )}
    </div>
  );
}
