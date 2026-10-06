import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { accountsUrl } from "./urls";

// Server-only helpers for domain apps acting as OIDC relying parties of accounts.

const ISSUER = `${accountsUrl}/api/auth`;
const BACKCHANNEL_LOGOUT_EVENT = "http://schemas.openid.net/event/backchannel-logout";

// One key set per process; jose caches keys and refetches on an unknown `kid`.
const jwks = createRemoteJWKSet(new URL(`${accountsUrl}/api/auth/jwks`));

export interface LogoutClaims {
  /** The accounts user id (OIDC `sub`), i.e. `account.accountId` where providerId = "accounts". */
  sub: string;
  /** The accounts session that ended. */
  sid?: string;
}

/**
 * Verifies an OIDC Back-Channel Logout token (spec §2.6): signature against accounts' JWKS,
 * issuer, audience = this app's client id, `typ: logout+jwt`, the back-channel `events`
 * claim, no `nonce`, and a `sub` to act on.
 */
export async function verifyLogoutToken(token: string, clientId: string): Promise<LogoutClaims> {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: ISSUER,
    audience: clientId,
    typ: "logout+jwt",
    // accounts gives logout tokens a 2-minute lifetime; allow small clock drift.
    clockTolerance: 30,
  });

  const events = (payload as JWTPayload & { events?: Record<string, unknown> }).events;
  if (!events || typeof events !== "object" || !(BACKCHANNEL_LOGOUT_EVENT in events)) {
    throw new Error("logout token has no back-channel logout event");
  }
  if ("nonce" in payload) throw new Error("logout token must not contain a nonce");
  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("logout token has no sub");
  }

  return { sub: payload.sub, sid: typeof payload.sid === "string" ? payload.sid : undefined };
}

/**
 * Route handler body for `POST /api/backchannel-logout`. accounts calls it when a user's
 * accounts session ends (sign-out anywhere, end-session, revocation): the app then ends
 * that user's local sessions, which is what makes sign-out global (D19).
 *
 * `endSessions` deletes the app's sessions for the accounts subject; it is app-specific
 * because each app owns its own database.
 */
export async function handleBackchannelLogout(
  request: Request,
  clientId: string,
  endSessions: (claims: LogoutClaims) => Promise<number>
): Promise<Response> {
  // Spec §2.8: the response must not be cached.
  const headers = { "Cache-Control": "no-store" };

  let token: string | null = null;
  try {
    token = (await request.formData()).get("logout_token")?.toString() ?? null;
  } catch {
    token = null;
  }
  if (!token) {
    return Response.json({ error: "invalid_request" }, { status: 400, headers });
  }

  let claims: LogoutClaims;
  try {
    claims = await verifyLogoutToken(token, clientId);
  } catch (error) {
    console.warn(`[backchannel-logout] rejected token: ${(error as Error).message}`);
    return Response.json({ error: "invalid_request" }, { status: 400, headers });
  }

  const ended = await endSessions(claims);
  console.info(`[backchannel-logout] ended ${ended} session(s) for accounts user ${claims.sub}`);
  return new Response(null, { status: 200, headers });
}
