import { parseEnv } from "@workspace/core/env";
import { z } from "zod";

const serverEnvSchema = z.object({
  EXAM_DATABASE_URL: z.string().min(1, "EXAM_DATABASE_URL is required."),
  EXAM_AUTH_SECRET: z
    .string()
    .min(
      32,
      "EXAM_AUTH_SECRET must be at least 32 characters. Generate one: openssl rand -base64 32"
    ),
  EXAM_OAUTH_CLIENT_ID: z.string().min(1, "EXAM_OAUTH_CLIENT_ID is required."),
  EXAM_OAUTH_CLIENT_SECRET: z
    .string()
    .min(32, "EXAM_OAUTH_CLIENT_SECRET must be at least 32 characters."),
});

// Never import this module from a client component: these values must not reach the
// browser bundle. Parsed eagerly so a misconfigured deploy fails at startup instead of
// on the first sign-in.
export const serverEnv = parseEnv(
  serverEnvSchema,
  {
    EXAM_DATABASE_URL: process.env.EXAM_DATABASE_URL,
    EXAM_AUTH_SECRET: process.env.EXAM_AUTH_SECRET,
    EXAM_OAUTH_CLIENT_ID: process.env.EXAM_OAUTH_CLIENT_ID,
    EXAM_OAUTH_CLIENT_SECRET: process.env.EXAM_OAUTH_CLIENT_SECRET,
  },
  "server"
);
