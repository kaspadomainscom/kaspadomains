// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Helper: Generate base64url nonce
function base64url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exclude static assets, API routes, and common files
  const excludedExtensions = /\.(png|jpg|jpeg|svg|webp|ico|css|js|map|json|woff2?)$/i;
  const isExcluded =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/.well-known") ||
    excludedExtensions.test(pathname);

  if (isExcluded) {
    return NextResponse.next();
  }

  // Generate a fresh nonce per request
  const nonce = base64url(crypto.getRandomValues(new Uint8Array(16)));

  // CSP with nonce
  const csp = [
    `default-src 'none'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // `style-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-hashes' https://fonts.googleapis.com`, // 🔄 updated
    `style-src-attr 'self' 'unsafe-hashes' 'nonce-${nonce}'`,
    `img-src 'self' data: https://kaspadomains.com`,
    `connect-src 'self' https://kaspadomains.com https://*.metamask.io https://supabase.com https://knsdomains.org https://api.knsdomains.org`,
    // `font-src 'self'`,
    `font-src 'self' https://fonts.gstatic.com`,                                      // ✅ if using Google Fonts
    `object-src 'none'`,
    `base-uri 'self'`,
    `frame-ancestors 'none'`,
    `frame-src 'none'`,
    `upgrade-insecure-requests`,
    `report-uri /api/csp-violation-report`,
    `report-to csp-endpoint`,
  ].join("; ");

  const response = NextResponse.next();

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-csp-nonce", nonce);
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");

  // Strong HSTS header with preload + subdomains + 1 year max-age
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  response.headers.set("Report-To", JSON.stringify({
    group: "csp-endpoint",
    max_age: 10886400,
    endpoints: [{ url: "/api/csp-violation-report" }],
    include_subdomains: true,
  }));

  if (process.env.NODE_ENV !== "production") {
    console.log(`[middleware] Injected nonce: ${nonce} for ${pathname}`);
  }

  return response;
}

// Match all routes
export const config = {
  matcher: "/:path*",
};
