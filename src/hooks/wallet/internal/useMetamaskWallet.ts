'use client';

import { useState, useEffect, useCallback } from 'react';
import detectEthereumProvider from '@metamask/detect-provider';
import { MetaMaskInpageProvider } from '@metamask/providers';
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

interface EthereumWithProviders {
  providers?: MetaMaskInpageProvider[];
}

/**
 * Get the MetaMask provider explicitly, even if multiple providers exist (Kasware, MetaMask, etc)
 */
async function getMetaMaskProvider(): Promise<MetaMaskInpageProvider | null> {
  if (typeof window === 'undefined') return null;

  const eth = window.ethereum as EthereumWithProviders & MetaMaskInpageProvider;

  // If multiple providers injected (MetaMask + others), find MetaMask explicitly
  if (Array.isArray(eth?.providers)) {
    const metamask = eth.providers.find((p) => (p as MetaMaskInpageProvider)?.isMetaMask);
    if (metamask) return metamask as MetaMaskInpageProvider;
  }

  // Otherwise fallback to detectEthereumProvider
  const provider = (await detectEthereumProvider()) as MetaMaskInpageProvider | null;
  if (provider?.isMetaMask) return provider;

  return null;
}

function getErrorMessage(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as { message?: unknown }).message ?? e);
  }
  return String(e);
}

export function useMetamaskWallet(): WalletState {
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus>('idle');
  const [chainId, setChainId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    const provider = await getMetaMaskProvider();
    if (!provider) {
      setStatus('unavailable');
      setError('MetaMask not found or not selected');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
      if (!accounts.length) throw new Error('No accounts returned');

      const currentChainId = (await provider.request({ method: 'eth_chainId' })) as string;

      setAccount(accounts[0]);
      setChainId(currentChainId);
      setStatus('connected');
    } catch (e) {
      setError(getErrorMessage(e));
      setStatus('error');
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    const provider = await getMetaMaskProvider();
    if (!provider) {
      setError('MetaMask not available for network switch');
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

  useEffect(() => {
    let provider: MetaMaskInpageProvider | null = null;
    let mounted = true;

    const handleAccountsChanged = (accounts: unknown) => {
      if (Array.isArray(accounts)) {
        const acc = accounts[0] || null;
        setAccount(acc);
        setStatus(acc ? 'connected' : 'idle');
      }
    };

    const handleChainChanged = (cid: unknown) => {
      if (typeof cid === 'string') {
        setChainId(cid);
      }
    };

    getMetaMaskProvider().then((prov) => {
      if (!mounted || !prov) return;
      provider = prov;

      provider.on?.('accountsChanged', handleAccountsChanged);
      provider.on?.('chainChanged', handleChainChanged);
    });

    return () => {
      mounted = false;
      if (provider) {
        provider.removeListener?.('accountsChanged', handleAccountsChanged);
        provider.removeListener?.('chainChanged', handleChainChanged);
      }
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
