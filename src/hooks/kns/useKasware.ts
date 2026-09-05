// src/hooks/kns/useKasware.ts
'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';

// Window.kasware is declared globally in src/types/global.d.ts

interface UseKaswareOptions {
  onConnectSuccess?: (address: string | null) => void;
  onConnectError?: (error: unknown) => void;
  onDisconnectSuccess?: () => void;
  onDisconnectError?: (error: unknown) => void;
  suppressAlerts?: boolean; // optionally disable alert popups
}

export function useKasware(options?: UseKaswareOptions) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false); // wallet initialized & ready
  const isMounted = useRef(true);

  // Check if KasWare wallet is installed
  const isInstalled = useMemo(() => typeof window !== 'undefined' && !!window.kasware, []);

  // Helper to update address only if changed
  const updateAddress = useCallback(
    (newAddress: string | null) => {
      setAddress((current) => (current !== newAddress ? newAddress : current));
    },
    [setAddress]
  );

  // Unified error handler
  const handleError = useCallback(
    (msg: string, err?: unknown, alertUser = true) => {
      console.error(msg, err);
      setError(msg);
      if (alertUser && !options?.suppressAlerts) alert(msg);
    },
    [options?.suppressAlerts]
  );

  // Connect to KasWare wallet
  const connect = useCallback(async () => {
    if (!isInstalled) {
      handleError('KasWare Wallet not installed. Please install it from https://www.kasware.xyz/');
      options?.onConnectError?.(new Error('Wallet not installed'));
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const accounts = await window.kasware!.requestAccounts();
      const firstAccount = accounts[0] || null;
      updateAddress(firstAccount);
      options?.onConnectSuccess?.(firstAccount);
    } catch (err) {
      handleError('Failed to connect KasWare Wallet.', err);
      options?.onConnectError?.(err);
    } finally {
      if (isMounted.current) setConnecting(false);
    }
  }, [isInstalled, handleError, options, updateAddress]);

  // Disconnect from KasWare wallet
  const disconnect = useCallback(async () => {
    if (!isInstalled) {
      handleError('KasWare Wallet not installed.', undefined, false);
      options?.onDisconnectError?.(new Error('Wallet not installed'));
      return;
    }

    setError(null);

    try {
      await window.kasware!.disconnect(window.location.origin);
      updateAddress(null);
      options?.onDisconnectSuccess?.();
    } catch (err) {
      handleError('Failed to disconnect KasWare Wallet.', err);
      options?.onDisconnectError?.(err);
    }
  }, [isInstalled, handleError, options, updateAddress]);

  useEffect(() => {
    isMounted.current = true;
    let removeAccountsListener: (() => void) | undefined;

    async function initializeWallet() {
      if (!isInstalled) {
        setReady(false);
        return;
      }

      setReady(false);

      try {
        const accounts = await window.kasware!.getAccounts();
        if (!isMounted.current) return;
        updateAddress(accounts[0] || null);
        setReady(true);
      } catch (err) {
        if (!isMounted.current) return;
        handleError('KasWare getAccounts error:', err, false);
        setReady(true); // Even if error, wallet is ready but no accounts
      }

      // Listen for account changes only after the initial asynchronous check
      // completes, so cleanup also covers a component that unmounts mid-request.
      const handleAccountsChanged = (payload: unknown) => {
        const accounts = Array.isArray(payload) ? (payload as string[]) : [];
        updateAddress(accounts[0] || null);
      };

      window.kasware!.on('accountsChanged', handleAccountsChanged);
      removeAccountsListener = () => {
        window.kasware?.removeListener('accountsChanged', handleAccountsChanged);
      };
    }

    void initializeWallet();

    // Cleanup listener on unmount
    return () => {
      isMounted.current = false;
      removeAccountsListener?.();
    };
  }, [isInstalled, updateAddress, handleError]);

  return { address, connect, disconnect, connecting, isInstalled, ready, error };
}
