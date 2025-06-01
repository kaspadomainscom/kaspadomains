// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Generate 16 random bytes
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));

  // Convert to base64url string
  const nonce = btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = NextResponse.next();

  res.headers.set(
    'Content-Security-Policy',
    `script-src 'self' 'nonce-${nonce}'; object-src 'none'; base-uri 'self';`
  );

  // Pass nonce to the app via a custom header
  res.headers.set('x-csp-nonce', nonce);

  return res;
}

// Optional: limit middleware to only run on specific routes
export const config = {
  matcher: ['/', '/(app|api)/:path*'], // adjust as needed
};
