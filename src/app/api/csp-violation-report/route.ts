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
 *   * The body is size-limited in bytes, twice: once from `Content-Length`
 *     before anything is read, and again on the decoded text for clients that
 *     lie about it or omit it.
 *   * Only the handful of fields a real report contains are kept, each
 *     truncated. Logging the raw object meant an attacker could write arbitrary
 *     volume into production logs, which costs money and buries real reports.
 *   * Failures still answer 204, because a report endpoint that argues with the
 *     browser gains nothing.
 */

// Real CSP reports are well under 2 KB; 8 KB leaves generous headroom.
//
// Enforced in **bytes**, twice. It used to be compared against `raw.length`,
// which counts UTF-16 code units rather than bytes -- so a body of two-byte
// characters was 16 KB on the wire and passed an 8 KB check, and three-byte
// characters made it 24 KB. The constant said bytes and the check counted
// something else, which is the unit mismatch from `docs/MIND.md` #17 on a path
// that exists specifically to bound hostile input.
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
    // Refuse before reading, when the client says how big it is. The comment
    // above this handler claimed an oversized POST was "dropped rather than
    // parsed", but the check ran *after* `req.text()` had already buffered the
    // whole thing, so the memory was spent either way. A declared length is
    // trivially forgeable, hence the second check below -- this one just means
    // an honest client never gets read.
    const declared = Number(req.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      return new NextResponse(null, { status: 413 });
    }

    const raw = await req.text();
    // Bytes, not `raw.length`. See the note on MAX_BODY_BYTES.
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
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
