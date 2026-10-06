import { Context, Next } from "hono";
import { tokenStore } from "../auth/token-store.ts";
import { GoogleTokenRefreshError } from "../auth/oauth.ts";
import { getValidAccessToken } from "../google/api.ts";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger({ component: "middleware" });

/** RFC 6750 401 with WWW-Authenticate so MCP clients (Cursor, Grok) re-run OAuth. */
function unauthorized(c: Context, description: string, errorCode?: string) {
  const challenge = errorCode
    ? `Bearer error="${errorCode}", error_description="${description}"`
    : "Bearer";
  return c.json(
    {
      error: errorCode ?? "unauthorized",
      error_description: description,
    },
    401,
    { "WWW-Authenticate": challenge },
  );
}

export async function authenticateBearer(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn("Authentication failed: missing or invalid Authorization header");
    return unauthorized(c, "Missing or invalid Authorization header");
  }

  const token = authHeader.substring(7);

  const isValid = await tokenStore.isValid(token);
  if (!isValid) {
    logger.warn("Authentication failed: invalid or expired token");
    return unauthorized(c, "Invalid or expired access token", "invalid_token");
  }

  // Proactively refresh the Google access token (no-op unless expired/near expiry) so a dead
  // Google refresh token surfaces as HTTP 401 here instead of as a tool error later.
  try {
    await getValidAccessToken(token);
  } catch (error) {
    if (error instanceof GoogleTokenRefreshError && error.requiresReauth) {
      // getValidAccessToken already deleted the MCP token from KV.
      logger.warn("Authentication failed: Google authorization revoked or expired", { error: error.code });
      return unauthorized(c, "Google authorization expired or was revoked; sign in again", "invalid_token");
    }
    // Transient failure (network, Google 5xx): let the request through; the tool call reports it.
    logger.error("Google token pre-refresh failed", { error: String(error) });
  }

  c.set("mcpToken", token);

  await next();
}
