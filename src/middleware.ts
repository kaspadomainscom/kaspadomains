import { NextResponse } from 'next/server';

function base64url(arrayBuffer: Uint8Array) {
  let binary = '';
  for (let i = 0; i < arrayBuffer.byteLength; i++) {
    binary += String.fromCharCode(arrayBuffer[i]);
  }
  const base64 = Buffer.from(binary, 'binary').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function middleware() {
  // Generate 16 random bytes
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));

  // Convert to base64url string
  const nonce = base64url(randomBytes);

  const res = NextResponse.next();

  res.headers.set(
    'Content-Security-Policy',
    `script-src 'self' 'nonce-${nonce}'; object-src 'none'; base-uri 'self';`
  );

  // Pass nonce to the app via a custom header
  res.headers.set('x-csp-nonce', nonce);

  return res;
}

export const config = {
  matcher: ['/', '/(app|api)/:path*'], // adjust as needed
};
