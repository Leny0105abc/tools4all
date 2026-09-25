import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE_NAME = "tools4all_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export type AuthConfig = {
  username: string;
  password: string;
  sessionSecret: string;
};

export function getAuthConfig(): AuthConfig | null {
  const username = process.env.AUTH_USERNAME?.trim();
  const password = process.env.AUTH_PASSWORD;
  const sessionSecret = process.env.AUTH_SESSION_SECRET;
  if (!username || !password || !sessionSecret || sessionSecret.length < 32) return null;
  return { username, password, sessionSecret };
}

export function safeEqual(left: string, right: string): boolean {
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

export function createSessionToken(config: AuthConfig, now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  const payload = `${config.username}:${expiresAt}`;
  const signature = createHmac("sha256", config.sessionSecret).update(payload).digest("base64url");
  return `${expiresAt}.${signature}`;
}

export function verifySessionToken(token: string | undefined, config: AuthConfig, now = Date.now()): boolean {
  if (!token) return false;
  const [expiresText, suppliedSignature, extra] = token.split(".");
  if (!expiresText || !suppliedSignature || extra) return false;
  const expiresAt = Number(expiresText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) return false;
  const payload = `${config.username}:${expiresAt}`;
  const expectedSignature = createHmac("sha256", config.sessionSecret).update(payload).digest("base64url");
  return safeEqual(suppliedSignature, expectedSignature);
}

export function readCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    try { return decodeURIComponent(part.slice(separator + 1).trim()); }
    catch { return undefined; }
  }
  return undefined;
}

export function sanitizeNextPath(value: unknown): string {
  return typeof value === "string"
    && value.startsWith("/")
    && !value.startsWith("//")
    && !value.includes("\\")
    && !/[\u0000-\u001f\u007f]/.test(value)
    ? value
    : "/";
}
