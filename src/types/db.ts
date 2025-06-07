// src/types/db.ts
export interface Domain {
  id: string;               // UUID
  name: string;
  listed: boolean;
  price: number;
  seller_telegram: string | null;
  kaspa_link: string;
}


  // const csp = [
  //   `default-src 'self'`,
  //   `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`, // strict-dynamic to trust nonce-based scripts
  //   `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`, // allow Google Fonts stylesheets with nonce
  //   `img-src 'self' data: https://kaspadomains.com`,
  //   `connect-src 'self' https://kaspadomains.com https://supabase.com`,
  //   `font-src 'self' https://fonts.gstatic.com`,
  //   `object-src 'none'`,
  //   `base-uri 'self'`,
  //   `frame-ancestors 'none'`,
  //   `upgrade-insecure-requests`,
  // ].join("; ");


  // import { NextResponse } from "next/server";
  // import type { NextRequest } from "next/server";
  
  // function base64url(bytes: Uint8Array): string {
  //   let binary = "";
  //   bytes.forEach((b) => (binary += String.fromCharCode(b)));
  //   return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  // }
  
  // export function middleware(request: NextRequest) {
  //   const { pathname } = request.nextUrl;
  
  //   // Exclude static assets, API routes, and common files from CSP injection
  //   const excludedExtensions = /\.(png|jpg|jpeg|svg|webp|ico|css|js|map|json|woff2?)$/i;
  //   const isExcluded =
  //     pathname.startsWith("/_next") ||
  //     pathname.startsWith("/api") ||
  //     pathname === "/favicon.ico" ||
  //     pathname === "/robots.txt" ||
  //     pathname === "/sitemap.xml" ||
  //     excludedExtensions.test(pathname);
  
  //   if (isExcluded) {
  //     return NextResponse.next();
  //   }
  
  //   // Generate a fresh base64url nonce per request
  //   const nonce = base64url(crypto.getRandomValues(new Uint8Array(16)));
  
  //   // Compose CSP with nonce for scripts and styles, and all required directives
  //   const csp = [
  //     `default-src 'self'`,
  //     `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`, // strict-dynamic to trust nonce-based scripts
  //     `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`, // allow Google Fonts stylesheets with nonce
  //     `img-src 'self' data: https://kaspadomains.com`,
  //     `connect-src 'self' https://kaspadomains.com https://supabase.com`,
  //     `font-src 'self' https://fonts.gstatic.com`,
  //     `object-src 'none'`,
  //     `base-uri 'self'`,
  //     `frame-ancestors 'none'`,
  //     `upgrade-insecure-requests`,
  //   ].join("; ");
  
  //   // Set CSP and nonce headers on the response
  //   const response = NextResponse.next();
  //   response.headers.set("Content-Security-Policy", csp);
  //   response.headers.set("x-csp-nonce", nonce);
  
  //   return response;
  // }
  
  // export const config = {
  //   matcher: "/:path*",
  // };