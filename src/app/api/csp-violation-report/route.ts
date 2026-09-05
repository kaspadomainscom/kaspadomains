// src/app/api/csp-violation-report/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Receive Content-Security-Policy violation reports.
 *
 * This endpoint is unauthenticated by necessity -- browsers post to it without
 * credentials -- so everything arriving here is attacker-controllable. It is
 * therefore treated as hostile input:
 *
 *   * The body is read as text with a hard size limit, so a multi-megabyte POST
 *     is dropped rather than parsed and logged.
 *   * Only the handful of fields a real report contains are kept, each
 *     truncated. Logging the raw object meant an attacker could write arbitrary
 *     volume into production logs, which costs money and buries real reports.
 *   * Failures still answer 204, because a report endpoint that argues with the
 *     browser gains nothing.
 */

// Real CSP reports are well under 2 KB; 8 KB leaves generous headroom.
const MAX_BODY_BYTES = 8 * 1024;
const MAX_FIELD_CHARS = 512;

// The fields defined for `report-uri`-style reports. Anything else is dropped.
const REPORTED_FIELDS = [
  "document-uri",
  "referrer",
  "violated-directive",
  "effective-directive",
  "original-policy",
  "blocked-uri",
  "status-code",
  "source-file",
  "line-number",
  "column-number",
] as const;

function clean(value: unknown): string | number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  // Strip control characters so a report cannot forge extra log lines.
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, MAX_FIELD_CHARS);
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return new NextResponse(null, { status: 413 });
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Browsers wrap the report in `csp-report`; the Reporting API does not.
    const report =
      (parsed["csp-report"] as Record<string, unknown> | undefined) ?? parsed;

    const summary: Record<string, string | number> = {};
    for (const field of REPORTED_FIELDS) {
      const value = clean(report?.[field]);
      if (value !== undefined) summary[field] = value;
    }

    // A report with none of the expected fields is not a report.
    if (Object.keys(summary).length > 0) {
      console.log("CSP Violation Report:", summary);
    }
  } catch {
    // Malformed bodies are noise, not incidents -- don't log them, or the log
    // flood this endpoint was hardened against just moves to the catch block.
  }

  // 204 either way: nothing useful is communicated back to a reporting browser.
  return new NextResponse(null, { status: 204 });
}
