import { parseEnv } from "@workspace/core/env";
import { z } from "zod";

const serverEnvSchema = z.object({
  WEB_DATABASE_URL: z.string().min(1, "WEB_DATABASE_URL is required."),
  WEB_AUTH_SECRET: z
    .string()
    .min(
      32,
      "WEB_AUTH_SECRET must be at least 32 characters. Generate one: openssl rand -base64 32"
    ),
  WEB_OAUTH_CLIENT_ID: z.string().min(1, "WEB_OAUTH_CLIENT_ID is required."),
  WEB_OAUTH_CLIENT_SECRET: z
    .string()
    .min(32, "WEB_OAUTH_CLIENT_SECRET must be at least 32 characters."),
});

// Never import this module from a client component: these values must not reach the
// browser bundle. Parsed eagerly so a misconfigured deploy fails at startup instead of
// on the first sign-in.
export const serverEnv = parseEnv(
  serverEnvSchema,
  {
    WEB_DATABASE_URL: process.env.WEB_DATABASE_URL,
    WEB_AUTH_SECRET: process.env.WEB_AUTH_SECRET,
    WEB_OAUTH_CLIENT_ID: process.env.WEB_OAUTH_CLIENT_ID,
    WEB_OAUTH_CLIENT_SECRET: process.env.WEB_OAUTH_CLIENT_SECRET,
  },
  "server"
);
