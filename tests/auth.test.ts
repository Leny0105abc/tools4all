import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  readCookie,
  safeEqual,
  sanitizeNextPath,
  verifySessionToken,
  type AuthConfig,
} from "../src/server/auth.ts";

const config: AuthConfig = {
  username: "test-user",
  password: "test-password",
  sessionSecret: "test-session-secret-that-is-long-enough-12345",
};

test("creates and validates signed session tokens", () => {
  const now = Date.UTC(2026, 8, 26);
  const token = createSessionToken(config, now);
  assert.equal(verifySessionToken(token, config, now + 1000), true);
  assert.equal(verifySessionToken(`${token}tampered`, config, now + 1000), false);
  assert.equal(verifySessionToken(token, config, now + 8 * 24 * 60 * 60 * 1000), false);
});

test("reads encoded cookies and compares credentials safely", () => {
  const token = createSessionToken(config);
  assert.equal(readCookie(`theme=dark; ${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`, AUTH_COOKIE_NAME), token);
  assert.equal(safeEqual("same-value", "same-value"), true);
  assert.equal(safeEqual("same-value", "different-value"), false);
});

test("allows only local post-login redirect paths", () => {
  assert.equal(sanitizeNextPath("/collage?mode=grid"), "/collage?mode=grid");
  assert.equal(sanitizeNextPath("https://malicious.example"), "/");
  assert.equal(sanitizeNextPath("//malicious.example"), "/");
  assert.equal(sanitizeNextPath("/\\malicious.example"), "/");
  assert.equal(sanitizeNextPath("/safe\nSet-Cookie: bad"), "/");
  assert.equal(sanitizeNextPath(undefined), "/");
});
