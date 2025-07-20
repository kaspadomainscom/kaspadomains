// src/lib/gooberSetup.tsx
"use client";

import React, { useEffect } from 'react';
import { setup } from 'goober';

interface GooberNonceProviderProps {
  nonce: string;
  children: React.ReactNode;
}

export function GooberNonceProvider({ nonce, children }: GooberNonceProviderProps) {
  useEffect(() => {
    // Create a <style> tag with nonce and append to document.head
    const style = document.createElement('style');
    style.setAttribute('nonce', nonce);
    document.head.appendChild(style);

    // Tell goober to inject styles into this <style> tag
    setup(style);

    // Optional: cleanup on unmount (not strictly necessary here)
    return () => {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, [nonce]);

  return <>{children}</>;
}
