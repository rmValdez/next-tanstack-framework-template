// Shared by the server config and the browser client, so it holds no secrets.
// Must match the id in the redirect URI seeded for this client in accounts_db:
// `${NEXT_PUBLIC_EXAM_URL}/api/auth/callback/accounts`.
export const ACCOUNTS_PROVIDER_ID = "accounts";
