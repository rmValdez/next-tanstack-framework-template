import { parseEnv } from "@workspace/core/env";
import { z } from "zod";

const serverEnvSchema = z.object({
  ANALYTICS_DATABASE_URL: z.string().min(1, "ANALYTICS_DATABASE_URL is required."),
  ANALYTICS_AUTH_SECRET: z
    .string()
    .min(
      32,
      "ANALYTICS_AUTH_SECRET must be at least 32 characters. Generate one: openssl rand -base64 32"
    ),
  ANALYTICS_OAUTH_CLIENT_ID: z.string().min(1, "ANALYTICS_OAUTH_CLIENT_ID is required."),
  ANALYTICS_OAUTH_CLIENT_SECRET: z
    .string()
    .min(32, "ANALYTICS_OAUTH_CLIENT_SECRET must be at least 32 characters."),
});

// Never import this module from a client component: these values must not reach the
// browser bundle. Parsed eagerly so a misconfigured deploy fails at startup instead of
// on the first sign-in.
export const serverEnv = parseEnv(
  serverEnvSchema,
  {
    ANALYTICS_DATABASE_URL: process.env.ANALYTICS_DATABASE_URL,
    ANALYTICS_AUTH_SECRET: process.env.ANALYTICS_AUTH_SECRET,
    ANALYTICS_OAUTH_CLIENT_ID: process.env.ANALYTICS_OAUTH_CLIENT_ID,
    ANALYTICS_OAUTH_CLIENT_SECRET: process.env.ANALYTICS_OAUTH_CLIENT_SECRET,
  },
  "server"
);
