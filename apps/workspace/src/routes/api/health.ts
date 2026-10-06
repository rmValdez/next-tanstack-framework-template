import { createFileRoute } from "@tanstack/react-router";
import { workspaceDb } from "@workspace/workspace-db";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await workspaceDb.$queryRaw`SELECT 1`;
          return Response.json({ status: "ok" });
        } catch (error) {
          console.error("[health] database check failed:", error);
          return Response.json({ status: "error", database: "unreachable" }, { status: 503 });
        }
      },
    },
  },
});
