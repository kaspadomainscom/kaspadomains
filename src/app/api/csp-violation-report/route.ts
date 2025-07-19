// src/app/api/csp-report/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("CSP Violation Report:", body);

    // You can log the report or send it to a monitoring endpoint

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Failed to process CSP report:", error);
    return NextResponse.json({ status: "error" }, { status: 400 });
  }
}
