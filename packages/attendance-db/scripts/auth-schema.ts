// Used only by `pnpm auth:schema` to generate prisma/schema.prisma. The plugin list must
// match apps/attendance/src/lib/auth.ts. genericOAuth adds no tables, so this is Better Auth core.
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { genericOAuth } from "better-auth/plugins";

export const auth = betterAuth({
  // Placeholders: the plugins need a valid URL and secret to initialize, not real ones.
  baseURL: "http://localhost:5010",
  secret: "schema-generation-only-not-a-real-secret",
  database: prismaAdapter({} as never, { provider: "postgresql" }),
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "accounts",
          clientId: "x",
          clientSecret: "x",
          discoveryUrl: "http://localhost:5011/api/auth/.well-known/openid-configuration",
        },
      ],
    }),
  ],
});
