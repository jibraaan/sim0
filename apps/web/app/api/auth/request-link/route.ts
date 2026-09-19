import { NextRequest, NextResponse } from "next/server";

// Server-side only - never exposed to the browser, so this can point at a private
// Railway hostname in prod even when the public API is elsewhere.
const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  await fetch(API_URL + "/auth/request-link", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  }).catch(() => null);

  // Same response whether or not the email is allowlisted, whether or not the
  // upstream call even succeeded - don't leak anything to the browser.
  return NextResponse.json({ ok: true });
}
