import { crmDb } from "@workspace/crm-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await crmDb.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch (error) {
    console.error("[health] database check failed:", error);
    return Response.json({ status: "error", database: "unreachable" }, { status: 503 });
  }
}
