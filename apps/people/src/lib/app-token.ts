import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";
import { API_RESOURCES } from "@workspace/core/apis";
import { accountsUrl } from "@workspace/core/urls";

// People as a resource server (D18): other domains call /api/v1 with an access token that
// accounts issued for this API. Verified locally against accounts' JWKS (no call to accounts
// per request; the key set is cached by the library).
const { verifyBearerToken } = oauthProviderResourceClient().getActions();

const PEOPLE_API = API_RESOURCES.people;

/**
 * For /api/v1 route handlers. Returns the token payload, or a 401/403 response (with the
 * library's WWW-Authenticate challenge) to return as-is. Session cookies are not accepted
 * here: /api/v1 is for apps, People's own UI uses the session routes.
 */
export async function requireAppToken(request: Request, scope: string) {
  const header = request.headers.get("authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];

  try {
    const payload = await verifyBearerToken(token, {
      jwksUrl: `${accountsUrl}/api/auth/jwks`,
      verifyOptions: { issuer: `${accountsUrl}/api/auth`, audience: PEOPLE_API.identifier },
      requiredScopes: [scope],
    });
    return { payload, response: null };
  } catch (error) {
    return { payload: null, response: toErrorResponse(error) };
  }
}

function toErrorResponse(error: unknown): Response {
  // better-call's APIError: statusCode 401 (missing/invalid token) or 403 (insufficient
  // scope), plus a WWW-Authenticate header describing why.
  const apiError = error as { statusCode?: number; headers?: HeadersInit; message?: string };
  const status = apiError.statusCode === 403 ? 403 : 401;
  const headers = new Headers(apiError.headers);
  return Response.json(
    { error: status === 403 ? "insufficient_scope" : "invalid_token" },
    { status, headers }
  );
}
