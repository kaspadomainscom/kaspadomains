// src/context/NonceContext.ts
'use client';

import { createContext } from 'react';

// ✅ Export must be named
export const NonceContext = createContext<string | undefined>(undefined);