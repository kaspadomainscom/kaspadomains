import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exclude static files and Next internals
  const excludedExtensions = /\.(png|jpg|jpeg|svg|webp|ico|css|js)$/;
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

  const nonce = base64url(crypto.getRandomValues(new Uint8Array(16)));
  const response = NextResponse.next();

  const scriptSrc = [
    `'self'`,
    `'nonce-${nonce}'`,
    process.env.NODE_ENV === 'development' ? `'unsafe-eval'` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const csp = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `img-src 'self' data: https://kaspadomains.com`,
    `style-src 'self' 'unsafe-inline'`,
    `connect-src 'self' https://kaspadomains.com`,
    `frame-ancestors 'none'`,
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('x-csp-nonce', nonce);

  return response;
}

export const config = {
  matcher: [
    '/',
    '/learn/:path*',
    '/docs/:path*',
    '/domain/:path*',
    '/domains/:path*',
  ],
};