import { parseEnv } from "@workspace/core/env";
import { z } from "zod";

const serverEnvSchema = z.object({
  WORKSPACE_DATABASE_URL: z.string().min(1, "WORKSPACE_DATABASE_URL is required."),
  WORKSPACE_AUTH_SECRET: z
    .string()
    .min(
      32,
      "WORKSPACE_AUTH_SECRET must be at least 32 characters. Generate one: openssl rand -base64 32"
    ),
  WORKSPACE_OAUTH_CLIENT_ID: z.string().min(1, "WORKSPACE_OAUTH_CLIENT_ID is required."),
  WORKSPACE_OAUTH_CLIENT_SECRET: z
    .string()
    .min(32, "WORKSPACE_OAUTH_CLIENT_SECRET must be at least 32 characters."),
});

// Never import this module from a client component: these values must not reach the
// browser bundle. Parsed eagerly so a misconfigured deploy fails at startup instead of
// on the first sign-in.
export const serverEnv = parseEnv(
  serverEnvSchema,
  {
    WORKSPACE_DATABASE_URL: process.env.WORKSPACE_DATABASE_URL,
    WORKSPACE_AUTH_SECRET: process.env.WORKSPACE_AUTH_SECRET,
    WORKSPACE_OAUTH_CLIENT_ID: process.env.WORKSPACE_OAUTH_CLIENT_ID,
    WORKSPACE_OAUTH_CLIENT_SECRET: process.env.WORKSPACE_OAUTH_CLIENT_SECRET,
  },
  "server"
);
