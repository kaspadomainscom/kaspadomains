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
  isFantom?: boolean;
  isCoinbaseWallet?: boolean;
  selectedAddress: string | null;
}

async function getMetaMaskProvider(): Promise<MetaMaskInpageProvider | null> {
  if (typeof window === 'undefined') return null;

  const eth = window.ethereum as EthereumWithProviders & MetaMaskInpageProvider;

  if (Array.isArray(eth?.providers)) {
    console.log('Multiple providers detected:', eth.providers);
    const metamask = eth.providers.find((p) => (p as MetaMaskInpageProvider)?.isMetaMask);
    if (metamask) {
      console.log('MetaMask provider found in multiple providers:', metamask);
      return metamask as MetaMaskInpageProvider;
    }
  }

  const provider = (await detectEthereumProvider()) as MetaMaskInpageProvider | null;

  if (provider) {
    const extProvider = provider as ExtendedProvider;

    console.log('Single provider detected:', provider);
    console.log('Provider flags:', {
      isMetaMask: extProvider.isMetaMask,
      isKasware: extProvider.isKasware,
      isFantom: extProvider.isFantom,
      isCoinbaseWallet: extProvider.isCoinbaseWallet,
      selectedAddress: extProvider.selectedAddress,
    });

    if (extProvider.isMetaMask && typeof provider.request === 'function') {
      return extProvider;
    } else {
      console.warn('Detected provider is NOT MetaMask:', extProvider);
    }
  } else {
    console.warn('No Ethereum provider detected by detectEthereumProvider()');
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

  const connect = useCallback(async () => {
    console.log('[MetaMask] Attempting to connect...');
    const provider = await getMetaMaskProvider();

    if (!provider) {
      setStatus('unavailable');
      setError('MetaMask not found or not selected');
      console.error('[MetaMask] Provider not found or not MetaMask');
      return;
    }

    if (!provider.isMetaMask) {
      setStatus('error');
      setError('Selected provider is not MetaMask');
      console.error('[MetaMask] Connected provider is not MetaMask:', provider);
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
      console.log('[MetaMask] Accounts received:', accounts);

      if (!accounts.length) throw new Error('No accounts returned');

      const currentChainId = (await provider.request({ method: 'eth_chainId' })) as string;
      console.log('[MetaMask] Current chainId:', currentChainId);

      setAccount(accounts[0]);
      setChainId(currentChainId);
      setStatus('connected');
      console.log('[MetaMask] Connected with account:', accounts[0]);
      console.log('[MetaMask] account length:', accounts.length);
      console.log('[MetaMask] account length:', accounts[1]);
      console.log('[MetaMask] account length:', accounts[2]);
      console.log('[MetaMask] account length:', accounts[3]);

    } catch (e) {
      const errMsg = getErrorMessage(e);
      setError(errMsg);
      setStatus('error');
      console.error('[MetaMask] Connection error:', errMsg);
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    console.log('[MetaMask] Switching network...');
    const provider = await getMetaMaskProvider();

    if (!provider) {
      const errMsg = 'MetaMask not available for network switch';
      setError(errMsg);
      console.error('[MetaMask] ' + errMsg);
      return;
    }

    try {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [KASPLEX_TESTNET],
      });
      setChainId(KASPLEX_TESTNET.chainId);
      setError(null);
      console.log('[MetaMask] Network switched to:', KASPLEX_TESTNET.chainId);
    } catch (e) {
      const errMsg = getErrorMessage(e);
      setError(errMsg);
      console.error('[MetaMask] Network switch error:', errMsg);
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('[MetaMask] Disconnecting wallet');
    setAccount(null);
    setChainId(null);
    setStatus('idle');
    setError(null);
  }, []);

  useEffect(() => {
    let provider: MetaMaskInpageProvider | null = null;
    let mounted = true;

    const handleAccountsChanged = (accounts: unknown) => {
      console.log('[MetaMask] Accounts changed:', accounts);
      if (Array.isArray(accounts)) {
        const acc = accounts[0] || null;
        setAccount(acc);
        setStatus(acc ? 'connected' : 'idle');
      }
    };

    const handleChainChanged = (cid: unknown) => {
      console.log('[MetaMask] Chain changed:', cid);
      if (typeof cid === 'string') {
        setChainId(cid);
      }
    };

    getMetaMaskProvider().then((prov) => {
      if (!mounted || !prov) return;
      provider = prov;

      console.log('[MetaMask] Selected address on mount:', (provider as ExtendedProvider)?.selectedAddress);

      provider.on?.('accountsChanged', handleAccountsChanged);
      provider.on?.('chainChanged', handleChainChanged);

      console.log('[MetaMask] Event listeners added');
    });

    return () => {
      mounted = false;
      if (provider) {
        provider.removeListener?.('accountsChanged', handleAccountsChanged);
        provider.removeListener?.('chainChanged', handleChainChanged);
        console.log('[MetaMask] Event listeners removed');
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
