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

import { useMetamaskWallet, WalletState as MetamaskWalletState } from '@/hooks/wallet/internal/useMetamaskWallet';
import { useKaswareWallet, WalletState as KaswareWalletState } from '@/hooks/wallet/internal/useKaswareWallet';
import { kasplexTestnet } from '@/lib/viemChains';

/* ---------------- Wallet Types ---------------- */
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

  account: string | null;
  status: WalletStatus;
  provider: Eip1193Provider | null;
  signer: ethers.Signer | null;
}

/* ---------------- Context ---------------- */
const WalletContext = createContext<CombinedWalletState | undefined>(undefined);

/* ---------------- Provider ---------------- */
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

  /* Auto-reconnect active wallet on mount */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (activeWalletType === 'metamask' && !metaAccount) connectMeta().catch(() => {});
    else if (activeWalletType === 'kasware' && !kasAccount) connectKas().catch(() => {});
  }, [activeWalletType, metaAccount, kasAccount, connectMeta, connectKas]);

  /* Persist wallet connection status */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('wallet-metamask', metaAccount ? 'true' : 'false');
  }, [metaAccount]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('wallet-kasware', kasAccount ? 'true' : 'false');
  }, [kasAccount]);

  /* Compute active wallet details */
  const activeAccount = useMemo(() => (activeWalletType === 'metamask' ? metaAccount : activeWalletType === 'kasware' ? kasAccount : null), [activeWalletType, metaAccount, kasAccount]);
  const activeStatus = useMemo(() => (activeWalletType === 'metamask' ? metaStatus : activeWalletType === 'kasware' ? kasStatus : null), [activeWalletType, metaStatus, kasStatus]);
  const activeError = useMemo(() => (activeWalletType === 'metamask' ? metaError : activeWalletType === 'kasware' ? kasError : null), [activeWalletType, metaError, kasError]);
  const isFullyConnected = useMemo(() => !!(metaAccount && kasAccount), [metaAccount, kasAccount]);

  const provider: Eip1193Provider | null = useMemo(() => metaProvider ?? null, [metaProvider]);

  /* Create ethers signer */
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!provider) {
      setSigner(null);
      return;
    }

    const ethersProvider = new ethers.BrowserProvider(provider);
    ethersProvider.getSigner()
      .then(async (sig) => {
        if (!mounted) return;

        try {
          const network = await sig.provider.getNetwork();
          if (Number(network.chainId) !== kasplexTestnet.id) {
            console.warn(`⚠️ Signer connected to wrong network (chainId: ${network.chainId})`);
          }
        } catch (err) {
          console.warn('⚠️ Could not verify signer network:', err);
        }

        setSigner(sig);
      })
      .catch(() => {
        if (mounted) setSigner(null);
      });

    return () => {
      mounted = false;
    };
  }, [provider]);

  /* Connect active wallet */
  const connect = useCallback(async () => {
    if (activeWalletType === 'metamask') await connectMeta();
    else if (activeWalletType === 'kasware') await connectKas();
  }, [activeWalletType, connectMeta, connectKas]);

  /* Disconnect active wallet */
  const disconnect = useCallback(() => {
    if (activeWalletType === 'metamask') {
      disconnectMeta();
      if (typeof window !== 'undefined') localStorage.setItem('wallet-metamask', 'false');
    } else if (activeWalletType === 'kasware') {
      disconnectKas();
      if (typeof window !== 'undefined') localStorage.setItem('wallet-kasware', 'false');
    }
  }, [activeWalletType, disconnectMeta, disconnectKas]);

  /* Disconnect all wallets */
  const disconnectAll = useCallback(() => {
    disconnectMeta();
    disconnectKas();
    if (typeof window !== 'undefined') {
      localStorage.setItem('wallet-metamask', 'false');
      localStorage.setItem('wallet-kasware', 'false');
    }
  }, [disconnectMeta, disconnectKas]);

  const value: CombinedWalletState = useMemo(() => ({
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
  }), [
    kasware, metamask, activeWalletType, activeAccount, activeStatus, activeError,
    isFullyConnected, connect, disconnect, disconnectAll, provider, signer
  ]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

/* ---------------- Hook ---------------- */
export function useWalletContext(): CombinedWalletState {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWalletContext must be used within WalletProvider');
  return context;
}
