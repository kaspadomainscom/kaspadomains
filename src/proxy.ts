// src/proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseOrigin } from "@/lib/supabase";
import { KNS_API_BASE_URL, LEGACY_KASPLEX_TESTNET } from "@/lib/kaspaDomainRuntime";

// Resolved once at module scope: the value comes from the environment and
// cannot change between requests.
const supabaseOrigin = getSupabaseOrigin();
const knsApiOrigin = new URL(KNS_API_BASE_URL).origin;

// Helper: Generate base64url nonce
function base64url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function proxy(request: NextRequest) {
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
    // The old entry here was `https://supabase.com` -- the marketing site, which
    // a Supabase client never calls. Requests go to the per-project API origin
    // (https://<ref>.supabase.co), so it's derived from the configured URL and
    // omitted entirely when Supabase isn't set up, rather than allowlisting a
    // host for no reason.
    [
      `connect-src 'self'`,
      `https://kaspadomains.com`,
      LEGACY_KASPLEX_TESTNET.rpcUrl,
      `https://knsdomains.org`,
      knsApiOrigin,
      supabaseOrigin,
    ]
      .filter(Boolean)
      .join(' '),
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

  // Next.js reads the nonce from the CSP on the *request* while rendering.
  // Forward both headers upstream so framework scripts and server components
  // receive the same nonce that is sent in the response CSP.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);
  requestHeaders.set("x-csp-nonce", nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

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
    console.log(`[proxy] Injected nonce: ${nonce} for ${pathname}`);
  }

  return response;
}

// Match all routes
export const config = {
  matcher: "/:path*",
};
