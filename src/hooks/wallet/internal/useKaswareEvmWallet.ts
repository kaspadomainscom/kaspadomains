'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EIP1193Provider } from 'viem';
import { KASPLEX_TESTNET } from '@/lib/kasplex';
import { getKaswareEvmProvider } from '@/lib/kaswareEvm';

export type WalletStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unavailable';

export interface WalletState {
  account: string | null;
  status: WalletStatus;
  isCorrectNetwork: boolean;
  connect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
  provider: EIP1193Provider | null;
}

function getErrorMessage(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as { message?: unknown }).message ?? e);
  }
  return String(e);
}

// Signs Kasplex (Kaspa's EVM L2) transactions via Kasware's EIP-1193 provider
// at window.kasware.ethereum -- this is a separate EVM-format address/keypair
// from the Kaspa L1 address exposed via useKaswareWallet.ts.
export function useKaswareEvmWallet(): WalletState {
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus>('idle');
  const [chainId, setChainId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<EIP1193Provider | null>(null);

  const connect = useCallback(async () => {
    const prov = getKaswareEvmProvider();
    setProvider(prov);

    if (!prov) {
      setStatus('unavailable');
      setError('Kasware not found. Install it from https://www.kasware.xyz to continue.');
      return;
    }

    try {
      setStatus('connecting');
      const accounts = (await prov.request({ method: 'eth_requestAccounts' })) as string[];
      if (!accounts.length) throw new Error('No accounts returned');

      const currentChainId = (await prov.request({ method: 'eth_chainId' })) as string;

      setAccount(accounts[0]);
      setChainId(currentChainId);
      setStatus('connected');
      setError(null);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      setStatus('error');
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    const prov = getKaswareEvmProvider();
    if (!prov) {
      setError('Kasware not available');
      return;
    }

    try {
      await prov.request({
        method: 'wallet_addEthereumChain',
        params: [KASPLEX_TESTNET],
      });
      setChainId(KASPLEX_TESTNET.chainId);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setChainId(null);
    setStatus('idle');
    setError(null);
    setProvider(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    const prov = getKaswareEvmProvider();
    if (!prov) return;
    const installedProvider = prov;

    async function initializeProvider() {
      if (!mounted) return;
      setProvider(installedProvider);

      const handleAccountsChanged = (accounts: unknown) => {
        if (!Array.isArray(accounts)) return;
        const acc = accounts[0] || null;
        setAccount(acc);
        setStatus(acc ? 'connected' : 'idle');
      };

      const handleChainChanged = (cid: unknown) => {
        if (typeof cid === 'string') setChainId(cid);
      };

      installedProvider.on?.('accountsChanged', handleAccountsChanged);
      installedProvider.on?.('chainChanged', handleChainChanged);

      return () => {
        installedProvider.removeListener?.('accountsChanged', handleAccountsChanged);
        installedProvider.removeListener?.('chainChanged', handleChainChanged);
      };
    }

    let removeListeners: (() => void) | undefined;
    void initializeProvider().then((cleanup) => {
      if (!cleanup) return;
      if (mounted) removeListeners = cleanup;
      else cleanup();
    });

    return () => {
      mounted = false;
      removeListeners?.();
    };
  }, []);

  return {
    account,
    status,
    isCorrectNetwork: !!chainId && chainId.toLowerCase() === KASPLEX_TESTNET.chainId.toLowerCase(),
    connect,
    switchNetwork,
    disconnect,
    error,
    provider,
  };
}
