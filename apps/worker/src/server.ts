import express from "express";
import { isConnected } from "./consumer";

// The worker has no public API: this server exists for health checks only.
export function createServer() {
  const app = express();
  app.disable("x-powered-by");

  // 503 while the broker is unreachable, so an orchestrator can alert or restart.
  app.get("/health", (_req, res) => {
    const broker = isConnected();
    res.status(broker ? 200 : 503).json({
      status: broker ? "ok" : "degraded",
      service: "worker",
      broker: broker ? "connected" : "disconnected",
      uptime: Math.round(process.uptime()),
    });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}
