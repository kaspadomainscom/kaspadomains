'use client';

import { useEffect, useState, useCallback } from 'react';
import { KASPLEX_TESTNET } from '@/lib/kasplex';

export type WalletType = 'metamask' | 'kasware';
export type WalletStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unavailable';

export interface WalletState {
  walletType: WalletType;
  account: string | null;
  status: WalletStatus;
  isCorrectNetwork: boolean;
  connect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

// ---------- Provider Types ----------

interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  isKasware?: boolean;
  providers?: EIP1193Provider[];
  on?: (event: string, handler: (payload: unknown) => void) => void;
  removeListener?: (event: string, handler: (payload: unknown) => void) => void;
}

interface KaswareLegacyProvider {
  getAccounts(): Promise<string[]>;
  requestAccounts(): Promise<string[]>;
  disconnect(origin: string): Promise<void>;
  on(event: 'accountsChanged' | 'chainChanged', handler: (payload: unknown) => void): void;
  removeListener(event: 'accountsChanged' | 'chainChanged', handler: (payload: unknown) => void): void;
  isKasware?: boolean;
}

type Provider = EIP1193Provider | KaswareLegacyProvider;

// ---------- Helpers ----------

function isEIP1193(provider: Provider): provider is EIP1193Provider {
  return typeof (provider as EIP1193Provider).request === 'function';
}

function getErrorMessage(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return String(e);
}

function findProvider(type: WalletType): Provider | undefined {
  const eth = window.ethereum as EIP1193Provider | undefined;

  if (Array.isArray(eth?.providers)) {
    for (const p of eth.providers) {
      if (type === 'metamask' && p.isMetaMask) return p;
      if (type === 'kasware' && p.isKasware) return p;
    }
  }

  if (eth) {
    if (type === 'metamask' && eth.isMetaMask) return eth;
    if (type === 'kasware' && eth.isKasware) return eth;
  }

  // const legacyKasware = (window as any).kasware as KaswareLegacyProvider | undefined;

  const globalWindow = window as Window & { kasware?: KaswareLegacyProvider };
  const legacyKasware = globalWindow.kasware;

  if (type === 'kasware' && legacyKasware) return legacyKasware;

  return undefined;
}

async function requestAccounts(provider: Provider): Promise<string[]> {
  if (isEIP1193(provider)) {
    const res = await provider.request({ method: 'eth_requestAccounts' });
    return Array.isArray(res) ? res.map(String) : [];
  }
  return provider.requestAccounts();
}

async function requestChainId(provider: Provider): Promise<string | undefined> {
  if (isEIP1193(provider)) {
    const res = await provider.request({ method: 'eth_chainId' });
    return typeof res === 'string' ? res : undefined;
  }
  return undefined;
}

// ---------- Main Hook ----------

export function useBaseWallet(type: WalletType): WalletState {
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus>('idle');
  const [chainId, setChainId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    const provider = findProvider(type);
    if (!provider) {
      setError(`${type} wallet not found or untrusted`);
      setStatus('unavailable');
      return;
    }

    setStatus('connecting');
    setError(null);

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
  }, [type]);

  const switchNetwork = useCallback(async () => {
    const provider = findProvider(type);
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
  }, [type]);

  const disconnect = useCallback(() => {
    setAccount(null);
    setStatus('idle');
    setChainId(null);
    setError(null);
  }, []);

  useEffect(() => {
    const provider = findProvider(type);
    if (!provider || typeof provider.on !== 'function') return;

    const handleAccountsChanged = (payload: unknown): void => {
      if (Array.isArray(payload)) {
        const a = (payload[0] as string) || null;
        setAccount(a);
        setStatus(a ? 'connected' : 'idle');
        setError(a ? null : 'Disconnected');
      }
    };

    const handleChainChanged = (payload: unknown): void => {
      if (typeof payload === 'string') {
        setChainId(payload);
        if (payload.toLowerCase() === KASPLEX_TESTNET.chainId.toLowerCase()) {
          setError(null);
        }
      }
    };

    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);

    return () => {
      provider.removeListener?.('accountsChanged', handleAccountsChanged);
      provider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [type]);

  return {
    walletType: type,
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
