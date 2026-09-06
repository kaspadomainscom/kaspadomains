'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';

import { useKaswareWallet, WalletState as KaswareWalletState } from '@/hooks/wallet/internal/useKaswareWallet';

/**
 * Wallet state.
 *
 * One wallet, one identity: the **Kaspa L1 address** from Kasware, which holds
 * the key that owns a domain on KNS and signs every write.
 *
 * The Kasplex EVM signer was removed on 2026-09-06 along with the rest of the
 * contract path. It was a second identity for the same person, used only by
 * contracts that have no deployed code -- and it was a live source of bugs,
 * because "which address is this keyed by?" had two answers. Votes recorded
 * against the L1 address were being looked up by the EVM one, so "My Votes" was
 * permanently empty.
 */
export type WalletStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unavailable' | null;

export interface CombinedWalletState {
  kasware: KaswareWalletState;

  account: string | null;
  status: WalletStatus;
  error: string | null;
  isConnected: boolean;

  connect: () => Promise<void>;
  disconnect: () => void;
  /** Kept for callers that used to drop both wallets at once. */
  disconnectAll: () => void;
}

const WalletContext = createContext<CombinedWalletState | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const kasware = useKaswareWallet();
  const {
    account,
    connect: connectKas,
    restoreConnection: restoreKasConnection,
    disconnect: disconnectKas,
    status,
    error,
  } = kasware;

  // Reconnect at most once per mount, and hold that in a ref rather than state.
  //
  // Reading localStorage in a `useState` initialiser makes the first client
  // render disagree with the server one; reading it into state from an effect
  // is a synchronous setState in an effect body. Neither is needed -- nothing
  // renders this value, so it does not belong in state at all.
  const reconnectAttempted = useRef(false);

  useEffect(() => {
    if (reconnectAttempted.current) return;
    reconnectAttempted.current = true;

    try {
      if (localStorage.getItem('wallet-kasware') === 'true') {
        // Failure here is expected and silent: the wallet may be locked, or the
        // user may decline. An unhandled rejection on page load is not a useful
        // way to find that out.
        restoreKasConnection().catch(() => {});
      }
    } catch {
      // Private mode, or storage disabled. Not being able to remember a
      // connection is not an error worth surfacing.
    }
  }, [restoreKasConnection]);

  // Only ever record a *successful* connection. Writing 'false' whenever there
  // is no account meant one page load without approving made the app forget the
  // wallet entirely.
  useEffect(() => {
    if (!account) return;
    try {
      localStorage.setItem('wallet-kasware', 'true');
    } catch {
      // See above.
    }
  }, [account]);

  const disconnect = useCallback(() => {
    disconnectKas();
    try {
      localStorage.setItem('wallet-kasware', 'false');
    } catch {
      // See above.
    }
  }, [disconnectKas]);

  const value: CombinedWalletState = useMemo(
    () => ({
      kasware,
      account,
      status,
      error,
      isConnected: Boolean(account),
      connect: connectKas,
      disconnect,
      disconnectAll: disconnect,
    }),
    [kasware, account, status, error, connectKas, disconnect]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export function useWalletContext(): CombinedWalletState {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWalletContext must be used within WalletProvider');
  return context;
}
