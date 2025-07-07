'use client';

import { useEffect, useState, useCallback } from 'react';
import { KASPLEX_TESTNET } from '@/lib/kasplex';

export type WalletStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unavailable';

export interface WalletState {
  account: string | null;
  status: WalletStatus;
  isCorrectNetwork: boolean;
  connect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

type EIP1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  on?: (event: string, handler: (payload: unknown) => void) => void;
  removeListener?: (event: string, handler: (payload: unknown) => void) => void;
};

type MultiInjectedProvider = EIP1193Provider & {
  providers?: EIP1193Provider[];
};

// --------------------
// MetaMask Provider Helper
// --------------------

function getMetaMaskProvider(): EIP1193Provider | undefined {
  const eth = window.ethereum as MultiInjectedProvider | undefined;

  if (eth?.providers?.length) {
    return eth.providers.find((p) => p.isMetaMask);
  }

  if (eth?.isMetaMask) return eth;

  return undefined;
}

// --------------------
// Error Helper
// --------------------

function getErrorMessage(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return String(e);
}

// --------------------
// Main Hook
// --------------------

export function useMetamaskWallet(): WalletState {
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus>('idle');
  const [chainId, setChainId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    const provider = getMetaMaskProvider();
    if (!provider) {
      setStatus('unavailable');
      setError('MetaMask not found');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (!accounts?.length) throw new Error('No accounts returned');

      const chainId = await provider.request({
        method: 'eth_chainId',
      }) as string;

      setAccount(accounts[0]);
      setChainId(chainId);
      setStatus('connected');
    } catch (e) {
      setError(getErrorMessage(e));
      setStatus('error');
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    const provider = getMetaMaskProvider();
    if (!provider) {
      setError('MetaMask not available');
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
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setChainId(null);
    setStatus('idle');
    setError(null);
  }, []);

  // --------------------
  // Event Listeners
  // --------------------

  useEffect(() => {
    const provider = getMetaMaskProvider();
    if (!provider?.on) return;

    const handleAccountsChanged = (accounts: unknown) => {
      if (Array.isArray(accounts)) {
        const newAccount = accounts[0] || null;
        setAccount(newAccount);
        setStatus(newAccount ? 'connected' : 'idle');
      }
    };

    const handleChainChanged = (chain: unknown) => {
      if (typeof chain === 'string') {
        setChainId(chain);
      }
    };

    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);

    return () => {
      provider.removeListener?.('accountsChanged', handleAccountsChanged);
      provider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, []);

  return {
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
