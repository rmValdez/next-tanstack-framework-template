import type { NextConfig } from "next";

// Env vars come from the repo-root .env, loaded by `dotenv -e ../../.env` in the
// package.json scripts (see apps/accounts/next.config.ts for why not @next/env).

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them with the app.
  transpilePackages: ["@workspace/core", "@workspace/ui", "@workspace/web-db"],
};

export default nextConfig;
