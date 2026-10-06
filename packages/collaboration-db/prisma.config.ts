import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env itself; the repo keeps a single one at the root.
config({ path: "../../.env", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // `prisma generate` doesn't connect, so a placeholder keeps it working without a .env
    // (CI, fresh clones). Commands that touch the database fail loudly on it instead.
    url:
      process.env.COLLABORATION_DATABASE_URL || "postgresql://missing:missing@localhost:1/missing",
    // collaboration_app may not create databases, so `migrate dev` replays into a dedicated one
    // (collaboration_shadow, created by docker/postgres/init.sql).
    shadowDatabaseUrl: process.env.COLLABORATION_SHADOW_DATABASE_URL,
  },
});
