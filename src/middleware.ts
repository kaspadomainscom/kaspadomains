import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function base64url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const excludedExtensions = /\.(png|jpg|jpeg|svg|webp|ico|css|js|map|json|woff2?)$/i;
  const isExcluded =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    excludedExtensions.test(pathname);

  if (isExcluded) {
    return NextResponse.next();
  }

  const nonce = base64url(crypto.getRandomValues(new Uint8Array(16)));
  const response = NextResponse.next();

  const scriptSrc = [`'self'`, `'nonce-${nonce}'`].join(" ");
  const styleSrc = [`'self'`, `'nonce-${nonce}'`].join(" ");

  const csp = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    `style-src-attr 'self'`, // no 'unsafe-inline'
    `object-src 'none'`,
    `base-uri 'self'`,
    `img-src 'self' data: https://kaspadomains.com`,
    `connect-src 'self' https://kaspadomains.com`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-csp-nonce", nonce);

  return response;
}

export const config = {
  matcher: [
    "/:path*",
    // "/learn/:path*",
    // "/docs/:path*",
    // "/domain/:path*",
    // "/domains/:path*",
    // "/list-domain/:path*",
    // "/search/:path*",
  ],
};
