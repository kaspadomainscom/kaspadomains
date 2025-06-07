// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function base64url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exclude static files, Next internals, and API routes from CSP middleware
  const excludedExtensions = /\.(png|jpg|jpeg|svg|webp|ico|css|js|map|json)$/i;
  const isExcluded =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    excludedExtensions.test(pathname);

  if (isExcluded) {
    return NextResponse.next();
  }

  // Generate a secure random nonce for CSP
  const nonce = base64url(crypto.getRandomValues(new Uint8Array(16)));
  const response = NextResponse.next();

  // Build CSP directives
  const scriptSrc = [
    `'self'`,
    `'nonce-${nonce}'`,
    process.env.NODE_ENV === 'development' ? `'unsafe-eval'` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const styleSrc = [`'self'`, `'nonce-${nonce}'`].join(' ');

  const csp = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `img-src 'self' data: https://kaspadomains.com`,
    `connect-src 'self' https://kaspadomains.com`,
    `frame-ancestors 'none'`,
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('x-csp-nonce', nonce);

  return response;
}

export const config = {
  matcher: ['/', '/learn/:path*', '/docs/:path*', '/domain/:path*', '/domains/:path*'],
};
