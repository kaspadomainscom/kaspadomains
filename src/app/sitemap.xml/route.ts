// src/app/sitemap.xml/route.ts

import { loadCategoriesManifestOnce } from "@/data/categoriesManifest.server";
import { domainProfilePath } from "@/lib/domainName";
import { type CategoryManifest } from "@/data/categoriesManifest";
import { NextResponse } from "next/server";

export const dynamic = "force-static";
// Cache sitemap for 1 hour on Vercel CDN (you can adjust this)
export const revalidate = 3600;

export async function GET() {
  const baseUrl = "https://kaspadomains.com"; // Use HTTPS

  // Load categories manifest dynamically. On failure, fall back to just the
  // static routes below rather than crashing this route (or, worse, ever
  // publishing a fabricated placeholder URL -- see docs/BUGS.md) -- a
  // sitemap missing category/domain entries is a better failure mode than
  // one that's wrong or one that doesn't build at all.
  let categoriesData: CategoryManifest = {};
  try {
    categoriesData = await loadCategoriesManifestOnce();
  } catch (error) {
    console.error("Failed to load categories manifest for sitemap:", error);
  }

  const staticRoutes = [
    "",
    "/list-domain",
    "/domains",
    "/domains/categories",
    "/docs",
    "/learn",
    "/about",
    "/business-plan",
    "/terms",
    "/privacy",
    // /status is deliberately absent: it is operational, changes constantly,
    // and its metadata already tells crawlers not to index it.
    ...Object.keys(categoriesData).map((cat) => `/domains/categories/category/${cat}`),
  ];

  const domainRoutes = Object.values(categoriesData).flatMap((category) =>
    category.domains
      .filter((d) => d.isActive)
      .map((d) => domainProfilePath(d.name))
      .filter((path): path is string => path !== null)
  );

  const allRoutes = [...staticRoutes, ...domainRoutes];

  /**
   * `next.config.ts` sets `trailingSlash: true`, so every path here 308s to its
   * trailing-slash form -- `/list-domain` redirects to `/list-domain/`. Emitting
   * the bare form made **every entry in this sitemap a redirect**: a crawler
   * spends a request discovering the real URL, and the URL submitted is not the
   * one the page declares as canonical, which is the one signal a sitemap exists
   * to reinforce.
   *
   * The root is the exception -- `https://kaspadomains.com/` already ends in the
   * slash that separates it from the origin, and appending another produces `//`.
   */
  const canonicalUrl = (route: string) => {
    if (route === '') return `${baseUrl}/`;
    return route.endsWith('/') ? `${baseUrl}${route}` : `${baseUrl}${route}/`;
  };

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
    .map(
      (route) => `
  <url>
    <loc>${canonicalUrl(route)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join("")}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
