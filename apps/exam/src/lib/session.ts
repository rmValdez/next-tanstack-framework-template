import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type CurrentSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

// Cached per request, so a layout and its page can both ask without two database reads.
export const getCurrentSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

// Verifies against exam_db rather than trusting cookie presence. Without a session here
// the user goes through /sso/start, which signs in through accounts and comes back to
// `returnTo` (one click when already signed in to accounts).
export async function requireAuth(returnTo = "/dashboard"): Promise<CurrentSession> {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect(`/sso/start?redirectTo=${encodeURIComponent(returnTo)}`);
  }

  return session;
}
