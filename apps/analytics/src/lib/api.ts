import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";

// For route handlers: the API equivalent of requireAuth(). Returns the session, or a
// 401 response to return as-is (an API caller should get a status, not a redirect).
//
// Authorization beyond "signed in" (e.g. role-based access) needs a role
// claim from accounts or a Analytics-owned permission table; not designed yet.
export async function requireApiSession() {
  const session = await (await getAuth()).api.getSession({ headers: await headers() });
  if (!session) {
    return { session: null, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, response: null };
}
