// src/app/sitemap.xml/route.ts

import { loadCategoriesManifest, type CategoryManifest } from "@/data/categoriesManifest";
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
    categoriesData = await loadCategoriesManifest();
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
    "/business-plan",
    ...Object.keys(categoriesData).map((cat) => `/domains/categories/category/${cat}`),
  ];

  const domainRoutes = Object.values(categoriesData).flatMap((category) =>
    category.domains
      .filter((d) => d.isActive)
      .map((d) => `/domain/${d.name}`)
  );

  const allRoutes = [...staticRoutes, ...domainRoutes];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
    .map(
      (route) => `
  <url>
    <loc>${baseUrl}${route}</loc>
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
