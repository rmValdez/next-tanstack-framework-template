import { parseEnv } from "@workspace/core/env";
import { z } from "zod";

const serverEnvSchema = z.object({
  RECRUITMENT_DATABASE_URL: z.string().min(1, "RECRUITMENT_DATABASE_URL is required."),
  RECRUITMENT_AUTH_SECRET: z
    .string()
    .min(
      32,
      "RECRUITMENT_AUTH_SECRET must be at least 32 characters. Generate one: openssl rand -base64 32"
    ),
  RECRUITMENT_OAUTH_CLIENT_ID: z.string().min(1, "RECRUITMENT_OAUTH_CLIENT_ID is required."),
  RECRUITMENT_OAUTH_CLIENT_SECRET: z
    .string()
    .min(32, "RECRUITMENT_OAUTH_CLIENT_SECRET must be at least 32 characters."),
});

// Never import this module from a client component: these values must not reach the
// browser bundle. Parsed eagerly so a misconfigured deploy fails at startup instead of
// on the first sign-in.
export const serverEnv = parseEnv(
  serverEnvSchema,
  {
    RECRUITMENT_DATABASE_URL: process.env.RECRUITMENT_DATABASE_URL,
    RECRUITMENT_AUTH_SECRET: process.env.RECRUITMENT_AUTH_SECRET,
    RECRUITMENT_OAUTH_CLIENT_ID: process.env.RECRUITMENT_OAUTH_CLIENT_ID,
    RECRUITMENT_OAUTH_CLIENT_SECRET: process.env.RECRUITMENT_OAUTH_CLIENT_SECRET,
  },
  "server"
);
