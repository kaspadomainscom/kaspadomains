// src/hooks/wallet/internal/useMetamaskWallet.ts
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

interface ExtendedProvider extends MetaMaskInpageProvider {
  isKasware?: boolean;
  isPhantom?: boolean;
  isCoinbaseWallet?: boolean;
  selectedAddress: string | null;
}

async function isGenuineMetaMask(provider: unknown): Promise<boolean> {
  try {
    const p = provider as Partial<MetaMaskInpageProvider> & {
      _metamask?: { isUnlocked?: () => boolean };
      isKasware?: boolean;
      isPhantom?: boolean;
      isCoinbaseWallet?: boolean;
    };

    return (
      !!p.isMetaMask &&
      !p.isKasware &&
      !p.isPhantom &&
      !p.isCoinbaseWallet &&
      typeof p._metamask?.isUnlocked === 'function'
    );
  } catch {
    return false;
  }
}


async function getMetaMaskProvider(): Promise<MetaMaskInpageProvider | null> {
  if (typeof window === 'undefined') return null;

  const eth = window.ethereum as EthereumWithProviders & MetaMaskInpageProvider;

  if (Array.isArray(eth?.providers)) {
    console.log('[MetaMask] Multiple providers detected');
    for (const p of eth.providers) {
      if (await isGenuineMetaMask(p)) {
        console.log('[MetaMask] Valid MetaMask provider selected:', p);
        return p as MetaMaskInpageProvider;
      }
    }
  }

  const fallback = (await detectEthereumProvider()) as MetaMaskInpageProvider | null;
  if (fallback && (await isGenuineMetaMask(fallback))) {
    console.log('[MetaMask] Single valid MetaMask detected');
    return fallback;
  }

  console.warn('[MetaMask] No valid MetaMask provider found (Kasware blocked)');
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
    console.log('[MetaMask] Connecting...');
    const provider = await getMetaMaskProvider();

    if (!provider) {
      setStatus('unavailable');
      setError('MetaMask not found or not supported');
      return;
    }

    try {
      setStatus('connecting');
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
      if (!accounts.length) throw new Error('No accounts returned');

      const currentChainId = (await provider.request({ method: 'eth_chainId' })) as string;

      setAccount(accounts[0]);
      setChainId(currentChainId);
      setStatus('connected');
      setError(null);

      console.log('[MetaMask] Connected to:', accounts[0]);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      setStatus('error');
      console.error('[MetaMask] Connection failed:', msg);
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    const provider = await getMetaMaskProvider();
    if (!provider) {
      const err = 'MetaMask not available';
      setError(err);
      return;
    }

    try {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [KASPLEX_TESTNET],
      });
      setChainId(KASPLEX_TESTNET.chainId);
      setError(null);
      console.log('[MetaMask] Switched to Kasplex testnet');
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      console.error('[MetaMask] Failed to switch network:', msg);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setChainId(null);
    setStatus('idle');
    setError(null);
    console.log('[MetaMask] Disconnected');
  }, []);

  useEffect(() => {
    let mounted = true;
    let provider: MetaMaskInpageProvider | null = null;

    const handleAccountsChanged = (accounts: unknown) => {
      if (!Array.isArray(accounts)) return;
      const acc = accounts[0] || null;
      setAccount(acc);
      setStatus(acc ? 'connected' : 'idle');
    };

    const handleChainChanged = (cid: unknown) => {
      if (typeof cid === 'string') {
        setChainId(cid);
      }
    };

    getMetaMaskProvider().then((prov) => {
      if (!mounted || !prov) return;
      provider = prov;

      console.log('[MetaMask] Provider mounted, selectedAddress:', (provider as ExtendedProvider).selectedAddress);
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
    isCorrectNetwork: !!chainId && chainId.toLowerCase() === KASPLEX_TESTNET.chainId.toLowerCase(),
    connect,
    switchNetwork,
    disconnect,
    error,
  };
}
