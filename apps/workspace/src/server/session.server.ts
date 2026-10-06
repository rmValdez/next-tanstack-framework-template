import { getRequestHeaders } from "@tanstack/react-start/server";
import { getAuth } from "@/lib/auth";
import type { CurrentSession } from "./session";

// Server-only (`.server.ts`): TanStack Start's import protection keeps it out of the client
// bundle. Call it only inside createServerFn handlers or server routes.

/** Looks the session up in workspace_db (not just the cookie), so a deleted session is rejected. */
export async function readSession(): Promise<CurrentSession | null> {
  const session = await (await getAuth()).api.getSession({ headers: getRequestHeaders() });
  if (!session) return null;
  const { id, name, email } = session.user;
  return { user: { id, name, email }, expiresAt: session.session.expiresAt.toISOString() };
}
