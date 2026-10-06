import { accountsDb } from "@workspace/accounts-db";

// Used by client apps (web's /sso/start) as a pre-flight before redirecting users here,
// so an outage shows a friendly error instead of a browser connection failure.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await accountsDb.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch (error) {
    console.error("[health] database check failed:", error);
    return Response.json({ status: "error", database: "unreachable" }, { status: 503 });
  }
}
