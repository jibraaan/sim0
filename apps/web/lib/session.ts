// Web Crypto (globalThis.crypto.subtle), not node:crypto - middleware runs on the
// Edge runtime, which can't import node:crypto, but Web Crypto works in both Edge
// and Node.

// "||" (not "??") so an unset OR blank env var both fall back - Next.js loads an
// empty `SESSION_SECRET=` line from .env as "", which "??" would treat as a real value.
const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";

export const SESSION_COOKIE = "sim0_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

const encoder = new TextEncoder();

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
}

function toBase64Url(buf: ArrayBuffer): string {
  let str = "";
  for (const b of new Uint8Array(buf)) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(payload));
  return toBase64Url(sig);
}

/** email|expiresAtMs|hmac - "|" can't appear in an email, a timestamp, or base64url. */
export async function createSessionValue(email: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${email}|${expiresAt}`;
  return `${payload}|${await sign(payload)}`;
}

export async function verifySessionValue(value: string | undefined | null): Promise<string | null> {
  if (!value) return null;
  const parts = value.split("|");
  if (parts.length !== 3) return null;
  const [email, expiresAtStr, sig] = parts;
  const expected = await sign(`${email}|${expiresAtStr}`);

  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  return email;
}
