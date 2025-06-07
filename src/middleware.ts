import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function base64url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exclude static assets, API routes, common files, and well-known endpoints
  const excludedExtensions = /\.(png|jpg|jpeg|svg|webp|ico|css|js|map|json|woff2?)$/i;
  const isExcluded =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/.well-known") || // exclude .well-known to avoid warnings
    excludedExtensions.test(pathname);

  if (isExcluded) {
    // No nonce or CSP header for excluded paths
    return NextResponse.next();
  }

  // Generate a fresh base64url nonce per request
  const nonce = base64url(crypto.getRandomValues(new Uint8Array(16)));

  // Compose CSP header with nonce in script-src and style-src
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    `style-src-attr 'nonce-${nonce}'`,
    `img-src 'self' data: https://kaspadomains.com`,
    `connect-src 'self' https://kaspadomains.com https://supabase.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const response = NextResponse.next();

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-csp-nonce", nonce);

  // Debug logging only in development to track nonce injection
  if (process.env.NODE_ENV !== "production") {
    console.log(`[middleware] Injected nonce: ${nonce} for ${pathname}`);
  }

  return response;
}

export const config = {
  matcher: "/:path*",
};
