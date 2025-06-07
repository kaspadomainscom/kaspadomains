// src/app/sitemap.xml/route.ts

import { categoriesData } from "@/data/categoriesManifest";
import { NextResponse } from "next/server";

export const dynamic = "force-static";
// Cache sitemap for 1 hour on Vercel CDN (you can adjust this)
export const revalidate = 3600;

export async function GET() {
  const baseUrl = "https://kaspadomains.com"; // Use HTTPS

  const staticRoutes = [
    "",
    "/list-domain",
    "/domain",
    "/domains",
    "/domains/categories",
    ...Object.keys(categoriesData).map((cat) => `/domains/categories/${cat}`),
  ];

  const domainRoutes = Object.values(categoriesData).flatMap((category) =>
    category.domains.map((d) => `/domains/${d.name}`)
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
