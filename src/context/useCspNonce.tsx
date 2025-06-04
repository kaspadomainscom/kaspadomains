// // src/context/useCspNonce.tsx
// 'use client';

// import { useContext } from 'react';
// import { NonceContext } from './NonceContext';

// export function useCspNonce(): string {
//   const nonce = useContext(NonceContext);
//   if (!nonce) {
//     throw new Error('useCspNonce must be used within <NonceProvider>');
//   }
//   return nonce;
// }
