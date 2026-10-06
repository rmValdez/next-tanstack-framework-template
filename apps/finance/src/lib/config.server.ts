import { parseEnv } from "@workspace/core/env";
import { z } from "zod";

const serverEnvSchema = z.object({
  FINANCE_DATABASE_URL: z.string().min(1, "FINANCE_DATABASE_URL is required."),
  FINANCE_AUTH_SECRET: z
    .string()
    .min(
      32,
      "FINANCE_AUTH_SECRET must be at least 32 characters. Generate one: openssl rand -base64 32"
    ),
  FINANCE_OAUTH_CLIENT_ID: z.string().min(1, "FINANCE_OAUTH_CLIENT_ID is required."),
  FINANCE_OAUTH_CLIENT_SECRET: z
    .string()
    .min(32, "FINANCE_OAUTH_CLIENT_SECRET must be at least 32 characters."),
});

// Never import this module from a client component: these values must not reach the
// browser bundle. Parsed eagerly so a misconfigured deploy fails at startup instead of
// on the first sign-in.
export const serverEnv = parseEnv(
  serverEnvSchema,
  {
    FINANCE_DATABASE_URL: process.env.FINANCE_DATABASE_URL,
    FINANCE_AUTH_SECRET: process.env.FINANCE_AUTH_SECRET,
    FINANCE_OAUTH_CLIENT_ID: process.env.FINANCE_OAUTH_CLIENT_ID,
    FINANCE_OAUTH_CLIENT_SECRET: process.env.FINANCE_OAUTH_CLIENT_SECRET,
  },
  "server"
);
