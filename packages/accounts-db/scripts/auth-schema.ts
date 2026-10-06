// Used only by `pnpm auth:schema` to generate prisma/schema.prisma. The plugin list must
// match apps/accounts/src/lib/auth.ts: a plugin added there without regenerating here
// leaves its tables missing from the database.
import { oauthProvider } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { jwt } from "better-auth/plugins";

export const auth = betterAuth({
  // Placeholders: the plugins need a valid URL and secret to initialize, not real ones.
  baseURL: "http://localhost:5011",
  secret: "schema-generation-only-not-a-real-secret",
  database: prismaAdapter({} as never, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  plugins: [jwt(), oauthProvider({ loginPage: "/login", consentPage: "/consent" })],
});
