import { parseEnv } from "@workspace/core/env";
import { z } from "zod";

const serverEnvSchema = z.object({
  OPERATIONS_DATABASE_URL: z.string().min(1, "OPERATIONS_DATABASE_URL is required."),
  OPERATIONS_AUTH_SECRET: z
    .string()
    .min(
      32,
      "OPERATIONS_AUTH_SECRET must be at least 32 characters. Generate one: openssl rand -base64 32"
    ),
  OPERATIONS_OAUTH_CLIENT_ID: z.string().min(1, "OPERATIONS_OAUTH_CLIENT_ID is required."),
  OPERATIONS_OAUTH_CLIENT_SECRET: z
    .string()
    .min(32, "OPERATIONS_OAUTH_CLIENT_SECRET must be at least 32 characters."),
});

// Never import this module from a client component: these values must not reach the
// browser bundle. Parsed eagerly so a misconfigured deploy fails at startup instead of
// on the first sign-in.
export const serverEnv = parseEnv(
  serverEnvSchema,
  {
    OPERATIONS_DATABASE_URL: process.env.OPERATIONS_DATABASE_URL,
    OPERATIONS_AUTH_SECRET: process.env.OPERATIONS_AUTH_SECRET,
    OPERATIONS_OAUTH_CLIENT_ID: process.env.OPERATIONS_OAUTH_CLIENT_ID,
    OPERATIONS_OAUTH_CLIENT_SECRET: process.env.OPERATIONS_OAUTH_CLIENT_SECRET,
  },
  "server"
);
