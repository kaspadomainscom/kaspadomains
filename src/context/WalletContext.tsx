'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { ethers, Eip1193Provider } from 'ethers';

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
  setActiveWalletType: (walletType: WalletType) => void;

  activeAccount: string | null;
  activeStatus: WalletStatus;
  activeError: string | null;

  isFullyConnected: boolean;

  connect: () => Promise<void>;
  disconnect: () => void;
  disconnectAll: () => void;

  // Aliases for convenience:
  account: string | null;
  status: WalletStatus;
  provider: Eip1193Provider | null;
  signer: ethers.Signer | null;
}

// Removed your custom EthereumProvider interface and replaced with ethers' Eip1193Provider

const WalletContext = createContext<CombinedWalletState | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const metamask = useMetamaskWallet();
  const kasware = useKaswareWallet();

  const {
    account: metaAccount,
    connect: connectMeta,
    disconnect: disconnectMeta,
    status: metaStatus,
    error: metaError,
    provider: metaProvider,
  } = metamask;

  const {
    account: kasAccount,
    connect: connectKas,
    disconnect: disconnectKas,
    status: kasStatus,
    error: kasError,
  } = kasware;

  const [activeWalletType, setActiveWalletType] = useState<WalletType>(() => {
    if (typeof window === 'undefined') return null;
    if (localStorage.getItem('wallet-metamask') === 'true') return 'metamask';
    if (localStorage.getItem('wallet-kasware') === 'true') return 'kasware';
    return null;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (activeWalletType === 'metamask' && !metaAccount) {
      connectMeta().catch(() => {});
    } else if (activeWalletType === 'kasware' && !kasAccount) {
      connectKas().catch(() => {});
    }
  }, [activeWalletType, connectMeta, connectKas, metaAccount, kasAccount]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('wallet-metamask', metaAccount ? 'true' : 'false');
  }, [metaAccount]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('wallet-kasware', kasAccount ? 'true' : 'false');
  }, [kasAccount]);

  const activeAccount = useMemo(() => {
    if (activeWalletType === 'metamask') return metaAccount;
    if (activeWalletType === 'kasware') return kasAccount;
    return null;
  }, [activeWalletType, metaAccount, kasAccount]);

  const activeStatus = useMemo(() => {
    if (activeWalletType === 'metamask') return metaStatus;
    if (activeWalletType === 'kasware') return kasStatus;
    return null;
  }, [activeWalletType, metaStatus, kasStatus]);

  const activeError = useMemo(() => {
    if (activeWalletType === 'metamask') return metaError;
    if (activeWalletType === 'kasware') return kasError;
    return null;
  }, [activeWalletType, metaError, kasError]);

  const isFullyConnected = useMemo(() => !!(metaAccount && kasAccount), [metaAccount, kasAccount]);

  const provider: Eip1193Provider | null = useMemo(() => {
    return metaProvider ?? null;
  }, [metaProvider]);

  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  useEffect(() => {
    if (!provider) {
      setSigner(null);
      return;
    }

    // No 'any' cast needed now
    const ethersProvider = new ethers.BrowserProvider(provider);
    ethersProvider.getSigner().then(setSigner).catch(() => setSigner(null));
  }, [provider]);

  const connect = useCallback(async () => {
    if (activeWalletType === 'metamask') {
      await connectMeta();
    } else if (activeWalletType === 'kasware') {
      await connectKas();
    }
  }, [activeWalletType, connectMeta, connectKas]);

  const disconnect = useCallback(() => {
    if (activeWalletType === 'metamask') {
      disconnectMeta();
      if (typeof window !== 'undefined') localStorage.setItem('wallet-metamask', 'false');
    } else if (activeWalletType === 'kasware') {
      disconnectKas();
      if (typeof window !== 'undefined') localStorage.setItem('wallet-kasware', 'false');
    }
  }, [activeWalletType, disconnectMeta, disconnectKas]);

  const disconnectAll = useCallback(() => {
    disconnectMeta();
    disconnectKas();
    if (typeof window !== 'undefined') {
      localStorage.setItem('wallet-metamask', 'false');
      localStorage.setItem('wallet-kasware', 'false');
    }
  }, [disconnectMeta, disconnectKas]);

  const value: CombinedWalletState = {
    kasware,
    metamask,

    activeWalletType,
    setActiveWalletType,

    activeAccount,
    activeStatus,
    activeError,

    isFullyConnected,

    connect,
    disconnect,
    disconnectAll,

    account: activeAccount,
    status: activeStatus,
    provider,
    signer,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export function useWalletContext(): CombinedWalletState {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWalletContext must be used within WalletProvider');
  return context;
}
