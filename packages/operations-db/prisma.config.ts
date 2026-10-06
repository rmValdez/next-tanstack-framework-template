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
    url: process.env.OPERATIONS_DATABASE_URL || "postgresql://missing:missing@localhost:1/missing",
    // operations_app may not create databases, so `migrate dev` replays into a dedicated one
    // (operations_shadow, created by docker/postgres/init.sql).
    shadowDatabaseUrl: process.env.OPERATIONS_SHADOW_DATABASE_URL,
  },
});
