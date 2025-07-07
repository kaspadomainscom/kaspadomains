// src/hooks/wallet/internal/useBaseWallet.ts
import { useState, useEffect, useCallback } from 'react';
import { KASPLEX_TESTNET } from '@/lib/kasplex';

export type WalletType = 'metamask' | 'kasware';
export type WalletStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unavailable';

export interface BaseWalletState {
  account: string | null;
  status: WalletStatus;
  isCorrectNetwork: boolean;
  connect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

function getErrorMessage(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return String(e);
}

export function useBaseWallet(walletType: WalletType): BaseWalletState {
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus>('idle');
  const [chainId, setChainId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const findProvider = (): any => {
    const eth = window.ethereum as any;
    if (Array.isArray(eth?.providers)) {
      return eth.providers.find((p: any) =>
        walletType === 'metamask' ? p.isMetaMask : p.isKasware
      );
    }
    if (eth?.isMetaMask && walletType === 'metamask') return eth;
    if (eth?.isKasware && walletType === 'kasware') return eth;
    if (walletType === 'kasware') return (window as any).kasware;
  };

  const connect = useCallback(async () => {
    const provider = findProvider();
    if (!provider) {
      setError(`${walletType} not found`);
      setStatus('unavailable');
      return;
    }

    try {
      setStatus('connecting');
      setError(null);

      const accounts = await (provider.requestAccounts
        ? provider.requestAccounts()
        : provider.request({ method: 'eth_requestAccounts' }));

      if (!accounts?.length) throw new Error('No accounts found');
      setAccount(accounts[0]);

      const chain = await (provider.request?.({ method: 'eth_chainId' }) || null);
      if (typeof chain === 'string') setChainId(chain);

      setStatus('connected');
    } catch (e) {
      setError(getErrorMessage(e));
      setStatus('error');
    }
  }, [walletType]);

  const switchNetwork = useCallback(async () => {
    const provider = findProvider();
    if (!provider?.request) {
      setError('Cannot switch network');
      return;
    }
    try {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [KASPLEX_TESTNET],
      });
      setChainId(KASPLEX_TESTNET.chainId);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setStatus('idle');
    setChainId(null);
    setError(null);
  }, []);

  useEffect(() => {
    const provider = findProvider();
    if (!provider || !provider.on) return;

    const handleAccounts = (accs: any) => {
      const a = accs?.[0] || null;
      setAccount(a);
      setStatus(a ? 'connected' : 'idle');
    };

    const handleChain = (c: any) => {
      if (typeof c === 'string') setChainId(c);
    };

    provider.on('accountsChanged', handleAccounts);
    provider.on('chainChanged', handleChain);

    return () => {
      provider.removeListener?.('accountsChanged', handleAccounts);
      provider.removeListener?.('chainChanged', handleChain);
    };
  }, []);

  return {
    account,
    status,
    isCorrectNetwork: chainId?.toLowerCase() === KASPLEX_TESTNET.chainId.toLowerCase(),
    connect,
    switchNetwork,
    disconnect,
    error,
  };
}
