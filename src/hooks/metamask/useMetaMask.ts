'use client';

import { useEffect, useState, useCallback } from 'react';
import { KASPLEX_TESTNET } from '@/lib/kasplex';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

type MetaMaskStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unavailable';

interface MetaMaskState {
  account: string | null;
  status: MetaMaskStatus;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  connect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  error: string | null;
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return String(error);
}

export function useMetaMask(): MetaMaskState {
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<MetaMaskStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);

  const connect = useCallback(async () => {
    const ethereum = window.ethereum;
    if (!ethereum) {
      setStatus('unavailable');
      setError('MetaMask not found');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      const accounts = (await ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[];

      if (!accounts.length) throw new Error('No accounts found');

      const currentChainId = (await ethereum.request({
        method: 'eth_chainId',
      })) as string;

      setAccount(accounts[0]);
      setChainId(currentChainId);
      setStatus('connected');
    } catch (err: unknown) {
      setStatus('error');
      setError(getErrorMessage(err));
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    const ethereum = window.ethereum;
    if (!ethereum) return;

    try {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [KASPLEX_TESTNET],
      });
      setChainId(KASPLEX_TESTNET.chainId);
    } catch (err: unknown) {
      console.error('Network switch error:', err);
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;

    const getInitialState = async () => {
      try {
        const accounts = (await ethereum.request({
          method: 'eth_accounts',
        })) as string[];

        const currentChainId = (await ethereum.request({
          method: 'eth_chainId',
        })) as string;

        if (accounts.length) {
          setAccount(accounts[0]);
          setChainId(currentChainId);
          setStatus('connected');
        }
      } catch (err) {
        console.error('Initial MetaMask state error:', err);
      }
    };

    getInitialState();

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      const [newAccount] = accounts;
      setAccount(newAccount ?? null);
      setStatus(newAccount ? 'connected' : 'idle');
    };

    const handleChainChanged = (...args: unknown[]) => {
      const newChainId = args[0] as string;
      setChainId(newChainId);
    };

    ethereum.on?.('accountsChanged', handleAccountsChanged);
    ethereum.on?.('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      ethereum.removeListener?.('chainChanged', handleChainChanged);
    };
  }, []);

  return {
    account,
    status,
    error,
    connect,
    switchNetwork,
    isConnecting: status === 'connecting',
    isCorrectNetwork: chainId === KASPLEX_TESTNET.chainId,
  };
}
