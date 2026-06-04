const crypto = require("node:crypto");

const COOKIE_NAME = "clearsteps_anon_session";
const SESSION_ID_PREFIX = "anon_";
const SESSION_ID_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getOrCreateAnonymousSessionId(req) {
  const existingSessionId = getAnonymousSessionIdFromRequest(req);
  if (existingSessionId) {
    return {
      anonymousSessionId: existingSessionId,
      shouldSetCookie: false
    };
  }

  return {
    anonymousSessionId: `${SESSION_ID_PREFIX}${crypto.randomUUID()}`,
    shouldSetCookie: true
  };
}

function getAnonymousSessionIdFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  const sessionId = cleanAnonymousSessionId(cookies[COOKIE_NAME]);
  return sessionId || "";
}

function appendAnonymousSessionCookie(req, res, anonymousSessionId) {
  const cleanedSessionId = cleanAnonymousSessionId(anonymousSessionId);
  if (!cleanedSessionId) return;

  const cookieParts = [
    `${COOKIE_NAME}=${cleanedSessionId}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_ID_MAX_AGE_SECONDS}`
  ];

  if (shouldUseSecureCookie(req)) {
    cookieParts.push("Secure");
  }

  appendHeader(res, "Set-Cookie", cookieParts.join("; "));
}

function cleanAnonymousSessionId(value) {
  if (typeof value !== "string") return "";
  const cleaned = value.trim();
  if (!/^anon_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleaned)) {
    return "";
  }
  return cleaned.slice(0, 120);
}

function parseCookies(cookieHeader) {
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .reduce((cookies, cookie) => {
      const separatorIndex = cookie.indexOf("=");
      if (separatorIndex === -1) return cookies;
      const name = cookie.slice(0, separatorIndex).trim();
      const value = decodeURIComponent(cookie.slice(separatorIndex + 1).trim());
      cookies[name] = value;
      return cookies;
    }, {});
}

function shouldUseSecureCookie(req) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").toLowerCase();
  if (forwardedProto === "https") return true;

  const host = String(req.headers.host || "").toLowerCase().split(":")[0];
  return host && host !== "localhost" && host !== "127.0.0.1" && host !== "::1";
}

function appendHeader(res, name, value) {
  const existingValue = res.getHeader(name);
  if (!existingValue) {
    res.setHeader(name, value);
    return;
  }

  const values = Array.isArray(existingValue)
    ? existingValue.concat(value)
    : [existingValue, value];
  res.setHeader(name, values);
}

module.exports = {
  getOrCreateAnonymousSessionId,
  appendAnonymousSessionCookie,
  cleanAnonymousSessionId
};
