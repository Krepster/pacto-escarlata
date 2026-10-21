export interface Env {
  DB: D1Database;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_GUILD_ID: string;
}

const SESSION_COOKIE = "__Host-pacto_admin";
const MEMBER_SESSION_COOKIE = "__Host-pacto_member";
const DISCORD_STATE_COOKIE = "__Host-pacto_discord_state";
const SESSION_DURATION = 8 * 60 * 60;
const DISCORD_STATE_DURATION = 10 * 60;
const DISCORD_CALLBACK_URL = "https://pacto-escarlata.pages.dev/api/roster/discord/callback";
const PUBLIC_SITE_URL = "https://pacto-escarlata.pages.dev";
const ALLOWED_ORIGINS = new Set([
  "https://pacto-escarlata.pages.dev",
  "http://localhost:5173",
  "http://localhost:5174",
]);

const json = (data: unknown, status = 200, extraHeaders?: HeadersInit) => {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });

  if (extraHeaders) {
    new Headers(extraHeaders).forEach((value, key) =>
      headers.set(key, value)
    );
  }

  return new Response(JSON.stringify(data), { status, headers });
};

const encodeBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const decodeBase64Url = (value: string): Uint8Array | null => {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
};

const constantTimeEqual = (a: string, b: string): boolean => {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i++) {
    difference |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }

  return difference === 0;
};

const getSigningKey = async (secret: string): Promise<CryptoKey> => {
  const keyBytes = Uint8Array.from(atob(secret), (char) =>
    char.charCodeAt(0)
  );

  if (keyBytes.length < 32) {
    throw new Error("SESSION_SECRET debe contener al menos 32 bytes.");
  }

  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
};

const signSession = async (
  payload: string,
  secret: string
): Promise<string> => {
  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );

  return encodeBase64Url(new Uint8Array(signature));
};