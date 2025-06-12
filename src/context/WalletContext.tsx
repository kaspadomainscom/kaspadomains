"use client";
// src/context/WalletContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useWallet, WalletState } from '@/hooks/wallet/useWallet'; // your existing hook

const WalletContext = createContext<WalletState | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const wallet = useWallet();

  return <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>;
};

export function useWalletContext(): WalletState {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWalletContext must be used within WalletProvider');
  return context;
}
