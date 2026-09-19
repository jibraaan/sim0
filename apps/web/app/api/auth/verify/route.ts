import { NextRequest, NextResponse } from "next/server";
import { createSessionValue, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", req.url));
  }

  const res = await fetch(API_URL + "/auth/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  }).catch(() => null);

  if (!res || !res.ok) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", req.url));
  }

  const { email } = await res.json();
  const response = NextResponse.redirect(new URL("/agents", req.url));
  response.cookies.set(SESSION_COOKIE, await createSessionValue(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
