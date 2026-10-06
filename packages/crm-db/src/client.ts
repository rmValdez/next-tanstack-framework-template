import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/client";

// Key must be unique per database: an app that imports two database packages would
// otherwise get whichever client was cached first, connected to the wrong database.
const globalForPrisma = globalThis as unknown as { crmDb?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.CRM_DATABASE_URL;
  if (!connectionString) {
    throw new Error("CRM_DATABASE_URL environment variable is required");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// Reused across hot reloads in development so each edit doesn't open a new pool.
export const crmDb = globalForPrisma.crmDb ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.crmDb = crmDb;
}
