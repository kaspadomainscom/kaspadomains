// src/hooks/wallet/useWallet.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { KASPLEX_TESTNET } from '@/lib/kasplex';

type WalletType   = 'metamask' | 'kasware' | null;
type WalletStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unavailable';

export interface WalletState {
  walletType:       WalletType;
  account:          string | null;
  status:           WalletStatus;
  isCorrectNetwork: boolean;
  connect:          (type: WalletType) => Promise<void>;
  switchNetwork:    () => Promise<void>;
  disconnect:       () => void;
  error:            string | null;
}

/** Standard EIP-1193 provider (MetaMask, others) */
type EIP1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?:   boolean;
  isKasware?:    boolean;
  providers?:    EIP1193Provider[];
  on?:           (event: string, handler: (payload: unknown) => void) => void;
  removeListener?: (event: string, handler: (payload: unknown) => void) => void;
};

/** Kasware’s legacy API shape */
interface KaswareLegacyProvider {
  getAccounts(): Promise<string[]>;
  requestAccounts(): Promise<string[]>;
  disconnect(origin: string): Promise<void>;
  on(event: 'accountsChanged'|'chainChanged', handler: (payload: unknown) => void): void;
  removeListener(event: 'accountsChanged'|'chainChanged', handler: (payload: unknown) => void): void;
  isKasware?: boolean;
}

/** Union of the two patterns */
type Provider = EIP1193Provider | KaswareLegacyProvider;

/** Narrow to EIP-1193 */
function isEIP1193(p: Provider): p is EIP1193Provider {
  return typeof (p as EIP1193Provider).request === 'function';
}

/** Friendly error text */
function getErrorMessage(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return String(e);
}

/**
 * Find the provider matching the chosen wallet type:
 * 1. window.ethereum.providers[] (multi-injected)
 * 2. window.ethereum flags    (single-injected)
 * 3. window.kasware global    (Kasware legacy)
 */
function findProvider(type: WalletType): Provider | undefined {
  const eth = window.ethereum as EIP1193Provider | undefined;

  // 1) multi-wallet
  if (Array.isArray(eth?.providers)) {
    for (const p of eth.providers!) {
      if (type === 'metamask' && p.isMetaMask) return p;
      if (type === 'kasware'  && p.isKasware)  return p;
    }
  }

  // 2) single-wallet
  if (eth) {
    if (type === 'metamask' && eth.isMetaMask) return eth;
    if (type === 'kasware'  && eth.isKasware)  return eth;
  }

  // 3) Kasware-specific
  const kws = window.kasware as KaswareLegacyProvider | undefined;
  if (type === 'kasware' && kws) return kws;
}

/** Cross-provider account request */
async function requestAccounts(provider: Provider): Promise<string[]> {
  if (isEIP1193(provider)) {
    const res = await provider.request({ method: 'eth_requestAccounts' });
    return Array.isArray(res) ? res.map(String) : [];
  } else {
    return provider.requestAccounts();
  }
}

/** Cross-provider chainId request */
async function requestChainId(provider: Provider): Promise<string|undefined> {
  if (isEIP1193(provider)) {
    const res = await provider.request({ method: 'eth_chainId' });
    return typeof res === 'string' ? res : undefined;
  }
  return undefined;
}

export function useWallet(): WalletState {
  const [walletType, setWalletType] = useState<WalletType>(null);
  const [account,    setAccount]    = useState<string|null>(null);
  const [status,     setStatus]     = useState<WalletStatus>('idle');
  const [chainId,    setChainId]    = useState<string|null>(null);
  const [error,      setError]      = useState<string|null>(null);

  /** connect logic */
  const connect = useCallback(async (type: WalletType) => {
    if (type !== 'metamask' && type !== 'kasware') {
      setError('Unsupported wallet type');
      setStatus('error');
      return;
    }
    const provider = findProvider(type);
    if (!provider) {
      setError(`${type} wallet not found or untrusted`);
      setStatus('unavailable');
      return;
    }

    setStatus('connecting');
    setError(null);
    setWalletType(type);
    localStorage.setItem('walletType', type);

    try {
      const accounts = await requestAccounts(provider);
      if (!accounts.length) throw new Error('No accounts found');
      setAccount(accounts[0]);

      const cid = await requestChainId(provider);
      if (cid) setChainId(cid);

      setStatus('connected');
    } catch (e) {
      setError(getErrorMessage(e));
      setStatus('error');
    }
  }, []);

  /** network-switch logic (EIP-1193 only) */
  const switchNetwork = useCallback(async () => {
    const provider = findProvider(walletType);
    if (!provider || !isEIP1193(provider)) {
      setError('Cannot switch network on this wallet');
      return;
    }
    try {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [KASPLEX_TESTNET],
      });
      setChainId(KASPLEX_TESTNET.chainId);
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, [walletType]);

  /** disconnect logic */
  const disconnect = useCallback(() => {
    setWalletType(null);
    setAccount(null);
    setStatus('idle');
    setChainId(null);
    setError(null);
    localStorage.removeItem('walletType');
  }, []);

  /** on mount: restore or auto-detect */
  useEffect(() => {
    const saved = localStorage.getItem('walletType') as WalletType|null;
    if (saved && findProvider(saved)) {
      setWalletType(saved);
    } else {
      const eth = window.ethereum;
      if (eth?.isMetaMask && !eth.isKasware) setWalletType('metamask');
      else if (eth?.isKasware && !eth.isMetaMask) setWalletType('kasware');
    }
  }, []);

  /** subscribe to provider events */
  useEffect(() => {
    const provider = findProvider(walletType);
    if (!provider || typeof provider.on !== 'function') return;

    const onAccounts = (arg: unknown) => {
      if (Array.isArray(arg)) {
        const a = (arg[0] as string) || null;
        setAccount(a);
        setStatus(a ? 'connected' : 'idle');
        setError(a ? null : 'Disconnected');
      }
    };
    const onChain = (arg: unknown) => {
      if (typeof arg === 'string') {
        setChainId(arg);
        if (arg.toLowerCase() === KASPLEX_TESTNET.chainId.toLowerCase()) {
          setError(null);
        }
      }
    };

    provider.on('accountsChanged', onAccounts);
    provider.on('chainChanged',    onChain);

    return () => {
      provider.removeListener?.('accountsChanged', onAccounts);
      provider.removeListener?.('chainChanged',    onChain);
    };
  }, [walletType]);

  return {
    walletType,
    account,
    status,
    isCorrectNetwork:
      !!chainId && chainId.toLowerCase() === KASPLEX_TESTNET.chainId.toLowerCase(),
    connect,
    switchNetwork,
    disconnect,
    error,
  };
}
