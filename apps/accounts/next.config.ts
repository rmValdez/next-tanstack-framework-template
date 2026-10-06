import type { NextConfig } from "next";

// Env vars come from the repo-root .env, loaded by `dotenv -e ../../.env` in the
// package.json scripts. Loading it here with @next/env doesn't work: Next snapshots
// process.env before reading this file and resets to that snapshot when it loads the
// app folder's own env files, dropping anything added here.

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them with the app.
  transpilePackages: ["@workspace/core", "@workspace/ui", "@workspace/accounts-db"],
  // amqplib opens raw sockets and must load from node_modules at runtime, not be bundled.
  serverExternalPackages: ["amqplib"],
};

export default nextConfig;
