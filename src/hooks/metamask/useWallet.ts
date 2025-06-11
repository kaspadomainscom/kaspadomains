// src/hooks/metamask/useWallet.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { KASPLEX_TESTNET } from '@/lib/kasplex';

type WalletType = 'metamask' | 'kasware' | null;
type WalletStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unavailable';

// declare global in src/types/global.d.ts

interface WalletState {
  walletType: WalletType;
  account: string | null;
  status: WalletStatus;
  isCorrectNetwork: boolean;
  connect: (type: WalletType) => Promise<void>;
  switchNetwork: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

// Helper: Extract a human-readable error message
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

// Helper: Verify if the wallet is the one the user selected
function isTrustedProvider(type: WalletType, eth: typeof window.ethereum | undefined): boolean {
  if (!eth) return false;
  if (type === 'metamask') return eth.isMetaMask === true;
  if (type === 'kasware') return eth.isKasware === true;
  return false;
}

export function useWallet(): WalletState {
  const [walletType, setWalletType] = useState<WalletType>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus>('idle');
  const [chainId, setChainId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get the provider matching the selected wallet type
  const getProvider = useCallback((): typeof window.ethereum | undefined => {
    const eth = window.ethereum;
    if (!eth) return undefined;

    if (walletType === 'metamask' && eth.isMetaMask) return eth;
    if (walletType === 'kasware' && eth.isKasware) return eth;

    return undefined;
  }, [walletType]);

  // Connect wallet
  const connect = useCallback(async (type: WalletType) => {
    if (type !== 'metamask' && type !== 'kasware') {
      setError('Unsupported wallet type');
      setStatus('error');
      return;
    }

    const eth = window.ethereum;
    if (!isTrustedProvider(type, eth)) {
      setError(`${type} wallet not found or untrusted`);
      setStatus('unavailable');
      return;
    }

    setWalletType(type);
    localStorage.setItem('walletType', type);
    setStatus('connecting');
    setError(null);

    const provider = getProvider();
    if (!provider) {
      setStatus('unavailable');
      setError(`${type} wallet provider not available`);
      return;
    }

    try {
      // Request accounts
      const accounts = (await provider.request({
        method: 'eth_requestAccounts',
      })) as string[];

      if (!accounts.length) throw new Error('No accounts found');

      // Get chainId
      const currentChainId = (await provider.request({
        method: 'eth_chainId',
      })) as string;

      setAccount(accounts[0]);
      setChainId(currentChainId);
      setStatus('connected');
    } catch (err) {
      setStatus('error');
      setError(getErrorMessage(err));
    }
  }, [getProvider]);

  // Switch to KASPLEX_TESTNET network
  const switchNetwork = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setError('Wallet provider not available for network switch');
      return;
    }

    try {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [KASPLEX_TESTNET],
      });

      setChainId(KASPLEX_TESTNET.chainId);
      setError(null);
    } catch (err) {
      console.error('Network switch error:', err);
      setError(getErrorMessage(err));
    }
  }, [getProvider]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setWalletType(null);
    setAccount(null);
    setStatus('idle');
    setError(null);
    setChainId(null);
    localStorage.removeItem('walletType');
  }, []);

  // On mount, try to recover previously connected wallet or detect wallet
  useEffect(() => {
    const saved = localStorage.getItem('walletType') as WalletType | null;
    const eth = window.ethereum;

    if (!saved) {
      // Auto detect wallet if only one wallet extension is available
      if (eth?.isMetaMask && !eth?.isKasware) setWalletType('metamask');
      else if (eth?.isKasware && !eth?.isMetaMask) setWalletType('kasware');
    } else if (saved === 'metamask' || saved === 'kasware') {
      setWalletType(saved);
    }
  }, []);

  // Listen for accounts or chain changes
  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;

    const handleAccountsChanged = (accounts: unknown) => {
      if (!Array.isArray(accounts)) return;
      const [newAccount] = accounts as string[];
      setAccount(newAccount ?? null);
      setStatus(newAccount ? 'connected' : 'idle');
      if (!newAccount) {
        setError('Disconnected account');
      } else {
        setError(null);
      }
    };

    const handleChainChanged = (newChainId: unknown) => {
      if (typeof newChainId === 'string') {
        setChainId(newChainId);
        // Optional: clear errors on correct network change
        if (newChainId.toLowerCase() === KASPLEX_TESTNET.chainId.toLowerCase()) {
          setError(null);
        }
      }
    };

    provider.on?.('accountsChanged', handleAccountsChanged);
    provider.on?.('chainChanged', handleChainChanged);

    return () => {
      provider.removeListener?.('accountsChanged', handleAccountsChanged);
      provider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [getProvider]);

  return {
    walletType,
    account,
    status,
    isCorrectNetwork: chainId?.toLowerCase() === KASPLEX_TESTNET.chainId.toLowerCase(),
    connect,
    switchNetwork,
    disconnect,
    error,
  };
}
