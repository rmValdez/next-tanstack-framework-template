import { API_RESOURCES, type HrEmployeeV1 } from "@workspace/core/apis";
import { accountsUrl } from "@workspace/core/urls";
import { serverEnv } from "@/lib/config.server";

// Server-only: Finance's client for HR's API (D18). Finance never reads hr_db; it asks HR,
// authenticated by an app token that accounts issues to Finance's OAuth client.

const HR_API = API_RESOURCES.hr;
const SCOPE = HR_API.scopes.employeesRead;
// Renew a little early so a token never expires between fetching it and HR checking it.
const EXPIRY_MARGIN_MS = 60_000;

export class HrUnavailableError extends Error {}

let cached: { token: string; expiresAt: number } | null = null;
let pending: Promise<string> | null = null;

async function requestToken(): Promise<string> {
  const credentials = Buffer.from(
    `${serverEnv.FINANCE_OAUTH_CLIENT_ID}:${serverEnv.FINANCE_OAUTH_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(`${accountsUrl}/api/auth/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: SCOPE,
      resource: HR_API.identifier,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new HrUnavailableError(`accounts refused the HR token (${response.status})`);
  }

  const body = (await response.json()) as { access_token: string; expires_in: number };
  cached = {
    token: body.access_token,
    expiresAt: Date.now() + body.expires_in * 1000 - EXPIRY_MARGIN_MS,
  };
  return body.access_token;
}

async function getToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  // Concurrent requests share one token request instead of each fetching their own.
  pending ??= requestToken().finally(() => {
    pending = null;
  });
  return pending;
}

async function hrFetch(path: string): Promise<Response> {
  const call = async () =>
    fetch(`${HR_API.identifier}${path}`, {
      headers: { Authorization: `Bearer ${await getToken()}` },
      cache: "no-store",
    });

  try {
    let response = await call();
    // The token can be rejected before its expiry (keys rotated, client re-seeded):
    // retry once with a fresh one.
    if (response.status === 401) {
      cached = null;
      response = await call();
    }
    return response;
  } catch (error) {
    if (error instanceof HrUnavailableError) throw error;
    throw new HrUnavailableError(`HR is unreachable: ${(error as Error).message}`);
  }
}

export async function listHrEmployees(): Promise<HrEmployeeV1[]> {
  const response = await hrFetch("/employees");
  if (!response.ok) throw new HrUnavailableError(`HR returned ${response.status}`);
  return response.json();
}

/** null when HR has no such employee. */
export async function getHrEmployee(id: string): Promise<HrEmployeeV1 | null> {
  const response = await hrFetch(`/employees/${encodeURIComponent(id)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new HrUnavailableError(`HR returned ${response.status}`);
  return response.json();
}
