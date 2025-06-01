// src/context/NonceContext.ts
'use client';

import { createContext } from 'react';

// Just the context itself, no usage or JSX
export const NonceContext = createContext<string | undefined>(undefined);