import { parseEnv } from "@workspace/core/env";
import { z } from "zod";

const serverEnvSchema = z.object({
  CRM_DATABASE_URL: z.string().min(1, "CRM_DATABASE_URL is required."),
  CRM_AUTH_SECRET: z
    .string()
    .min(
      32,
      "CRM_AUTH_SECRET must be at least 32 characters. Generate one: openssl rand -base64 32"
    ),
  CRM_OAUTH_CLIENT_ID: z.string().min(1, "CRM_OAUTH_CLIENT_ID is required."),
  CRM_OAUTH_CLIENT_SECRET: z
    .string()
    .min(32, "CRM_OAUTH_CLIENT_SECRET must be at least 32 characters."),
});

// Never import this module from a client component: these values must not reach the
// browser bundle. Parsed eagerly so a misconfigured deploy fails at startup instead of
// on the first sign-in.
export const serverEnv = parseEnv(
  serverEnvSchema,
  {
    CRM_DATABASE_URL: process.env.CRM_DATABASE_URL,
    CRM_AUTH_SECRET: process.env.CRM_AUTH_SECRET,
    CRM_OAUTH_CLIENT_ID: process.env.CRM_OAUTH_CLIENT_ID,
    CRM_OAUTH_CLIENT_SECRET: process.env.CRM_OAUTH_CLIENT_SECRET,
  },
  "server"
);
