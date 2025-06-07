import { NextResponse } from "next/server";

export async function GET() {
  // Customize disallowed paths for kaspadomains.com
  const disallowPaths = [
    "/api/",
    "/_next/",
    "/admin/",
    "/login",
    "/signup",
    "/domain/new",
    "/domain/edit",
  ];

  const content = `
User-agent: *
${disallowPaths.map(path => `Disallow: ${path}`).join("\n")}
Allow: /

Sitemap: https://kaspadomains.com/sitemap.xml
`.trim();

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
