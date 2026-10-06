import { examDb } from "@workspace/exam-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await examDb.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch (error) {
    console.error("[health] database check failed:", error);
    return Response.json({ status: "error", database: "unreachable" }, { status: 503 });
  }
}
