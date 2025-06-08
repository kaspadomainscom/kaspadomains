'use client';

import { useEffect, useState, useCallback } from 'react';

declare global {
  interface Window {
    kasware?: {
      getAccounts: () => Promise<string[]>;
      requestAccounts: () => Promise<string[]>;
      disconnect: (origin: string) => Promise<void>;
      on: (event: 'accountsChanged', handler: (accounts: string[]) => void) => void;
      removeListener: (event: 'accountsChanged', handler: (accounts: string[]) => void) => void;
    };
  }
}

export function useKasware() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const isInstalled = typeof window !== 'undefined' && !!window.kasware;

  const connect = useCallback(async () => {
    if (!isInstalled) {
      alert('KasWare Wallet not installed. Please install it from https://www.kasware.xyz/');
      return;
    }

    setConnecting(true);
    try {
      const accounts = await window.kasware!.requestAccounts();
      setAddress(accounts[0] || null);
    } catch (err) {
      console.error('KasWare connect error:', err);
      alert('Failed to connect KasWare Wallet.');
    } finally {
      setConnecting(false);
    }
  }, [isInstalled]);

  const disconnect = useCallback(async () => {
    try {
      if (!isInstalled) {
        alert('KasWare Wallet not installed.');
        return;
      }
      await window.kasware!.disconnect(window.location.origin);
      setAddress(null);
    } catch (err) {
      console.error('KasWare disconnect error:', err);
      alert('Failed to disconnect KasWare Wallet.');
    }
  }, [isInstalled]);

  useEffect(() => {
    if (!isInstalled) return;

    const fetchAccounts = async () => {
      try {
        const accounts = await window.kasware!.getAccounts();
        setAddress(accounts[0] || null);
      } catch (err) {
        console.error('KasWare getAccounts error:', err);
      }
    };

    fetchAccounts();

    const handleAccountsChanged = (accounts: string[]) => {
      setAddress(accounts[0] || null);
    };

    window.kasware!.on('accountsChanged', handleAccountsChanged);

    return () => {
      window.kasware?.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, [isInstalled]);

  return { address, connect, disconnect, connecting, isInstalled };
}
