import { parseEnv } from "@workspace/core/env";
import { z } from "zod";

const serverEnvSchema = z.object({
  COLLABORATION_DATABASE_URL: z.string().min(1, "COLLABORATION_DATABASE_URL is required."),
  COLLABORATION_AUTH_SECRET: z
    .string()
    .min(
      32,
      "COLLABORATION_AUTH_SECRET must be at least 32 characters. Generate one: openssl rand -base64 32"
    ),
  COLLABORATION_OAUTH_CLIENT_ID: z.string().min(1, "COLLABORATION_OAUTH_CLIENT_ID is required."),
  COLLABORATION_OAUTH_CLIENT_SECRET: z
    .string()
    .min(32, "COLLABORATION_OAUTH_CLIENT_SECRET must be at least 32 characters."),
});

// Never import this module from a client component: these values must not reach the
// browser bundle. Parsed eagerly so a misconfigured deploy fails at startup instead of
// on the first sign-in.
export const serverEnv = parseEnv(
  serverEnvSchema,
  {
    COLLABORATION_DATABASE_URL: process.env.COLLABORATION_DATABASE_URL,
    COLLABORATION_AUTH_SECRET: process.env.COLLABORATION_AUTH_SECRET,
    COLLABORATION_OAUTH_CLIENT_ID: process.env.COLLABORATION_OAUTH_CLIENT_ID,
    COLLABORATION_OAUTH_CLIENT_SECRET: process.env.COLLABORATION_OAUTH_CLIENT_SECRET,
  },
  "server"
);
