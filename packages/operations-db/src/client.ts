import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/client";

// Key must be unique per database: an app that imports two database packages would
// otherwise get whichever client was cached first, connected to the wrong database.
const globalForPrisma = globalThis as unknown as { operationsDb?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.OPERATIONS_DATABASE_URL;
  if (!connectionString) {
    throw new Error("OPERATIONS_DATABASE_URL environment variable is required");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// Reused across hot reloads in development so each edit doesn't open a new pool.
export const operationsDb = globalForPrisma.operationsDb ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.operationsDb = operationsDb;
}
