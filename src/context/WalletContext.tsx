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

import { useKaswareEvmWallet, WalletState as KaswareEvmWalletState } from '@/hooks/wallet/internal/useKaswareEvmWallet';
import { useKaswareWallet, WalletState as KaswareWalletState } from '@/hooks/wallet/internal/useKaswareWallet';
import { kasplexTestnet } from '@/lib/viemChains';

/* ---------------- Wallet Types ---------------- */
// Both "kasware" and "kasplex" come from the same Kasware wallet extension --
// "kasware" is the Kaspa L1 address (KNS ownership proof), "kasplex" is the
// EVM address/signer for Kasplex (Kaspa's EVM L2) transactions.
export type WalletType = 'kasplex' | 'kasware' | null;
export type WalletStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unavailable' | null;

export interface CombinedWalletState {
  kasware: KaswareWalletState;
  kasplex: KaswareEvmWalletState;

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
  const kasplex = useKaswareEvmWallet();
  const kasware = useKaswareWallet();

  const {
    account: kasplexAccount,
    connect: connectKasplex,
    disconnect: disconnectKasplex,
    status: kasplexStatus,
    error: kasplexError,
    provider: kasplexProvider,
  } = kasplex;

  const {
    account: kasAccount,
    connect: connectKas,
    disconnect: disconnectKas,
    status: kasStatus,
    error: kasError,
  } = kasware;

  const [activeWalletType, setActiveWalletType] = useState<WalletType>(() => {
    if (typeof window === 'undefined') return null;
    if (localStorage.getItem('wallet-kasplex') === 'true') return 'kasplex';
    if (localStorage.getItem('wallet-kasware') === 'true') return 'kasware';
    return null;
  });

  /* Auto-reconnect active wallet on mount */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (activeWalletType === 'kasplex' && !kasplexAccount) connectKasplex().catch(() => {});
    else if (activeWalletType === 'kasware' && !kasAccount) connectKas().catch(() => {});
  }, [activeWalletType, kasplexAccount, kasAccount, connectKasplex, connectKas]);

  /* Persist wallet connection status */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('wallet-kasplex', kasplexAccount ? 'true' : 'false');
  }, [kasplexAccount]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('wallet-kasware', kasAccount ? 'true' : 'false');
  }, [kasAccount]);

  /* Compute active wallet details */
  const activeAccount = useMemo(() => (activeWalletType === 'kasplex' ? kasplexAccount : activeWalletType === 'kasware' ? kasAccount : null), [activeWalletType, kasplexAccount, kasAccount]);
  const activeStatus = useMemo(() => (activeWalletType === 'kasplex' ? kasplexStatus : activeWalletType === 'kasware' ? kasStatus : null), [activeWalletType, kasplexStatus, kasStatus]);
  const activeError = useMemo(() => (activeWalletType === 'kasplex' ? kasplexError : activeWalletType === 'kasware' ? kasError : null), [activeWalletType, kasplexError, kasError]);
  const isFullyConnected = useMemo(() => !!(kasplexAccount && kasAccount), [kasplexAccount, kasAccount]);

  const provider: Eip1193Provider | null = useMemo(() => (kasplexProvider as unknown as Eip1193Provider) ?? null, [kasplexProvider]);

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
    if (activeWalletType === 'kasplex') await connectKasplex();
    else if (activeWalletType === 'kasware') await connectKas();
  }, [activeWalletType, connectKasplex, connectKas]);

  /* Disconnect active wallet */
  const disconnect = useCallback(() => {
    if (activeWalletType === 'kasplex') {
      disconnectKasplex();
      if (typeof window !== 'undefined') localStorage.setItem('wallet-kasplex', 'false');
    } else if (activeWalletType === 'kasware') {
      disconnectKas();
      if (typeof window !== 'undefined') localStorage.setItem('wallet-kasware', 'false');
    }
  }, [activeWalletType, disconnectKasplex, disconnectKas]);

  /* Disconnect all wallets */
  const disconnectAll = useCallback(() => {
    disconnectKasplex();
    disconnectKas();
    if (typeof window !== 'undefined') {
      localStorage.setItem('wallet-kasplex', 'false');
      localStorage.setItem('wallet-kasware', 'false');
    }
  }, [disconnectKasplex, disconnectKas]);

  const value: CombinedWalletState = useMemo(() => ({
    kasware,
    kasplex,
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
    kasware, kasplex, activeWalletType, activeAccount, activeStatus, activeError,
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
