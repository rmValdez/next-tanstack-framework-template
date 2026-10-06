import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type CurrentSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

// Verifies against the database rather than trusting cookie presence, so a revoked
// or expired session cannot render protected markup. `returnTo` brings the user back
// after signing in; /login only accepts same-origin paths for it.
export async function requireAuth(returnTo = "/account"): Promise<CurrentSession> {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect(`/login?redirectTo=${encodeURIComponent(returnTo)}`);
  }

  return session;
}
