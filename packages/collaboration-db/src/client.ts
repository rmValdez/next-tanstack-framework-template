import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/client";

// Key must be unique per database: an app that imports two database packages would
// otherwise get whichever client was cached first, connected to the wrong database.
const globalForPrisma = globalThis as unknown as { collaborationDb?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.COLLABORATION_DATABASE_URL;
  if (!connectionString) {
    throw new Error("COLLABORATION_DATABASE_URL environment variable is required");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// Reused across hot reloads in development so each edit doesn't open a new pool.
export const collaborationDb = globalForPrisma.collaborationDb ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.collaborationDb = collaborationDb;
}
