'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useCallback,
  useEffect,
} from 'react';

import {
  useMetamaskWallet,
  WalletState as MetamaskWalletState,
} from '@/hooks/wallet/internal/useMetamaskWallet';

import {
  useKaswareWallet,
  WalletState as KaswareWalletState,
} from '@/hooks/wallet/internal/useKaswareWallet';

export type WalletType = 'metamask' | 'kasware' | null;
export type WalletStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unavailable' | null;

export interface CombinedWalletState {
  kasware: KaswareWalletState;
  metamask: MetamaskWalletState;

  activeWalletType: WalletType;
  activeAccount: string | null;
  activeStatus: WalletStatus;
  activeError: string | null;

  isFullyConnected: boolean;
  disconnectAll: () => void;

  // Aliases for convenience:
  account: string | null;
  status: WalletStatus;
}

const WalletContext = createContext<CombinedWalletState | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const metamask = useMetamaskWallet();
  const kasware = useKaswareWallet();

  const { account: metaAccount, connect: connectMeta, disconnect: disconnectMeta, status: metaStatus, error: metaError } = metamask;
  const { account: kasAccount, connect: connectKas, disconnect: disconnectKas, status: kasStatus, error: kasError } = kasware;

  // Auto reconnect logic
  useEffect(() => {
    if (localStorage.getItem('wallet-metamask') === 'true' && !metaAccount) {
      connectMeta().catch(() => {});
    }
    if (localStorage.getItem('wallet-kasware') === 'true' && !kasAccount) {
      connectKas().catch(() => {});
    }
  }, [connectMeta, connectKas, metaAccount, kasAccount]);

  // Update localStorage on connect/disconnect
  useEffect(() => {
    localStorage.setItem('wallet-metamask', metaAccount ? 'true' : 'false');
  }, [metaAccount]);

  useEffect(() => {
    localStorage.setItem('wallet-kasware', kasAccount ? 'true' : 'false');
  }, [kasAccount]);

  const activeWalletType = useMemo<WalletType>(() => {
    if (metaAccount) return 'metamask';
    if (kasAccount) return 'kasware';
    return null;
  }, [metaAccount, kasAccount]);

  const activeAccount = useMemo(() => metaAccount ?? kasAccount ?? null, [metaAccount, kasAccount]);

  const activeStatus = useMemo<WalletStatus>(() => {
    if (metaAccount) return metaStatus;
    if (kasAccount) return kasStatus;
    return null;
  }, [metaAccount, metaStatus, kasAccount, kasStatus]);

  const activeError = useMemo(() => metaError ?? kasError ?? null, [metaError, kasError]);

  const isFullyConnected = useMemo(() => !!(metaAccount && kasAccount), [metaAccount, kasAccount]);

  const disconnectAll = useCallback(() => {
    disconnectMeta();
    disconnectKas();
    localStorage.setItem('wallet-metamask', 'false');
    localStorage.setItem('wallet-kasware', 'false');
  }, [disconnectMeta, disconnectKas]);

  const value: CombinedWalletState = {
    kasware,
    metamask,
    activeWalletType,
    activeAccount,
    activeStatus,
    activeError,
    isFullyConnected,
    disconnectAll,

    // Add aliases here
    account: activeAccount,
    status: activeStatus,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export function useWalletContext(): CombinedWalletState {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWalletContext must be used within WalletProvider');
  return context;
}
