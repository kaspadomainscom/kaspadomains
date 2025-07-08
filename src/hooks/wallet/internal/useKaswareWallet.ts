'use client';

import { useState, useEffect, useCallback } from 'react';

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

interface KaswareProvider {
  getAccounts(): Promise<string[]>;
  requestAccounts(): Promise<string[]>;
  disconnect(origin: string): Promise<void>;
  on(event: 'accountsChanged' | 'chainChanged', handler: (payload: unknown) => void): void;
  removeListener(event: 'accountsChanged' | 'chainChanged', handler: (payload: unknown) => void): void;
  isKasware?: boolean;
}

function getKaswareProvider(): KaswareProvider | undefined {
  return typeof window !== 'undefined' ? window.kasware : undefined;
}

function getErrorMessage(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as { message?: unknown }).message ?? e);
  }
  return String(e);
}

export function useKaswareWallet(): WalletState {
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    const provider = getKaswareProvider();
    if (!provider) {
      setStatus('unavailable');
      setError('Kasware wallet not found');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      const accounts = await provider.requestAccounts();
      if (!accounts.length) throw new Error('No accounts returned');

      setAccount(accounts[0]);
      setStatus('connected');
    } catch (e) {
      setError(getErrorMessage(e));
      setStatus('error');
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    // Currently not supported for Kasware
    setError('Network switching not supported for Kasware wallet');
  }, []);

  const disconnect = useCallback(() => {
    const provider = getKaswareProvider();
    provider?.disconnect('app_disconnect').catch(() => {});
    setAccount(null);
    setStatus('idle');
    setError(null);
  }, []);

  useEffect(() => {
    const provider = getKaswareProvider();
    if (!provider || typeof provider.on !== 'function') return;

    const onAccountsChanged = (accounts: unknown) => {
      if (Array.isArray(accounts)) {
        const acc = accounts[0] || null;
        setAccount(acc);
        setStatus(acc ? 'connected' : 'idle');
      }
    };

    const onChainChanged = () => {
      // Optional: Kasware might support it in future
    };

    provider.on('accountsChanged', onAccountsChanged);
    provider.on('chainChanged', onChainChanged);

    return () => {
      provider.removeListener('accountsChanged', onAccountsChanged);
      provider.removeListener('chainChanged', onChainChanged);
    };
  }, []);

  return {
    account,
    status,
    isCorrectNetwork: true, // Can be updated if Kasware supports chainId
    connect,
    switchNetwork,
    disconnect,
    error,
  };
}
