'use client';

import { useEffect, useState, useCallback } from 'react';
import detectEthereumProvider from '@metamask/detect-provider';
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

// Define MetaMask provider interface with needed properties and methods
interface MetaMaskProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (payload: unknown) => void) => void;
  removeListener?: (event: string, handler: (payload: unknown) => void) => void;
}

async function getMetaMaskProvider(): Promise<MetaMaskProvider | null> {
  const provider = (await detectEthereumProvider()) as MetaMaskProvider | null;
  if (provider?.isMetaMask) return provider;
  return null;
}

function getErrorMessage(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as { message: unknown }).message);
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
      setError('MetaMask not found');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
      if (!accounts.length) throw new Error('No accounts returned');

      const chainId = (await provider.request({ method: 'eth_chainId' })) as string;

      setAccount(accounts[0]);
      setChainId(chainId);
      setStatus('connected');
    } catch (e) {
      setError(getErrorMessage(e));
      setStatus('error');
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    const provider = await getMetaMaskProvider();
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

  useEffect(() => {
    let mounted = true;
    getMetaMaskProvider().then((provider) => {
      if (!mounted || !provider?.on) return;

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

      provider.on('accountsChanged', handleAccountsChanged);
      provider.on('chainChanged', handleChainChanged);

      return () => {
        provider.removeListener?.('accountsChanged', handleAccountsChanged);
        provider.removeListener?.('chainChanged', handleChainChanged);
      };
    });

    return () => {
      mounted = false;
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
