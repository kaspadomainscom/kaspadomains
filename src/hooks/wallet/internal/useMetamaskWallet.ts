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
  provider: MetaMaskInpageProvider | null;  // Added provider here
}

interface EthereumWithProviders {
  providers?: MetaMaskInpageProvider[];
}

// interface ExtendedProvider extends MetaMaskInpageProvider {
//   isKasware?: boolean;
//   isPhantom?: boolean;
//   isCoinbaseWallet?: boolean;
//   selectedAddress: string | null;
// }

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
    for (const p of eth.providers) {
      if (await isGenuineMetaMask(p)) {
        return p as MetaMaskInpageProvider;
      }
    }
  }

  const fallback = (await detectEthereumProvider()) as MetaMaskInpageProvider | null;
  if (fallback && (await isGenuineMetaMask(fallback))) {
    return fallback;
  }

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
  const [provider, setProvider] = useState<MetaMaskInpageProvider | null>(null); // state for provider

  const connect = useCallback(async () => {
    const prov = await getMetaMaskProvider();
    setProvider(prov);

    if (!prov) {
      setStatus('unavailable');
      setError('MetaMask not found or not supported');
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
    const prov = await getMetaMaskProvider();
    if (!prov) {
      setError('MetaMask not available');
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
      const msg = getErrorMessage(err);
      setError(msg);
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
    let prov: MetaMaskInpageProvider | null = null;

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

    getMetaMaskProvider().then((p) => {
      if (!mounted || !p) return;
      prov = p;
      setProvider(prov);

      prov.on?.('accountsChanged', handleAccountsChanged);
      prov.on?.('chainChanged', handleChainChanged);
    });

    return () => {
      mounted = false;
      if (prov) {
        prov.removeListener?.('accountsChanged', handleAccountsChanged);
        prov.removeListener?.('chainChanged', handleChainChanged);
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
    provider,  // expose provider here
  };
}
