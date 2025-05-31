import fs from "fs-extra";
import path from "path";
import { categoriesData } from "../data/categoriesManifest";

const SITE_URL = "https://kaspadomains.com";
const staticUrls = [`${SITE_URL}/`, `${SITE_URL}/learn`, `${SITE_URL}/docs`];

interface Domain {
  name: string;
}

interface Category {
  title: string;
  domains: Domain[];
}

// Escape XML entities for valid XML output
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const domainUrls = Object.values(categoriesData as Record<string, Category>)
  .flatMap((category) => category.domains)
  .map((domain) => `${SITE_URL}/domain/${encodeURIComponent(domain.name)}`);

const urls = [...staticUrls, ...domainUrls].sort();

const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls
    .map(
      (url) =>
        `  <url><loc>${escapeXml(url)}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`
    )
    .join("\n") +
  `\n</urlset>`;

const outPath = path.join(__dirname, "../../out/sitemap.xml");

fs.outputFile(outPath, sitemap)
  .then(() => {
    console.log("✅ Sitemap written to", outPath);
  })
  .catch((err: unknown) => {
    if (err instanceof Error) {
      console.error("❌ Failed to generate sitemap:", err.message);
    } else {
      console.error("❌ Failed to generate sitemap:", err);
    }
    process.exit(1);
  });
