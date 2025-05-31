export const dynamic = "force-static";
export const revalidate = 0;
// src/app/sitemap.xml/route.ts
import { categoriesData } from "@/data/categoriesManifest";
import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = "http://kaspadomains.com"; // ✅ Replace with your live domain

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
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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
