import { parseEnv } from "@workspace/core/env";
import { z } from "zod";

const serverEnvSchema = z.object({
  ATTENDANCE_DATABASE_URL: z.string().min(1, "ATTENDANCE_DATABASE_URL is required."),
  ATTENDANCE_AUTH_SECRET: z
    .string()
    .min(
      32,
      "ATTENDANCE_AUTH_SECRET must be at least 32 characters. Generate one: openssl rand -base64 32"
    ),
  ATTENDANCE_OAUTH_CLIENT_ID: z.string().min(1, "ATTENDANCE_OAUTH_CLIENT_ID is required."),
  ATTENDANCE_OAUTH_CLIENT_SECRET: z
    .string()
    .min(32, "ATTENDANCE_OAUTH_CLIENT_SECRET must be at least 32 characters."),
});

// Never import this module from a client component: these values must not reach the
// browser bundle. Parsed eagerly so a misconfigured deploy fails at startup instead of
// on the first sign-in.
export const serverEnv = parseEnv(
  serverEnvSchema,
  {
    ATTENDANCE_DATABASE_URL: process.env.ATTENDANCE_DATABASE_URL,
    ATTENDANCE_AUTH_SECRET: process.env.ATTENDANCE_AUTH_SECRET,
    ATTENDANCE_OAUTH_CLIENT_ID: process.env.ATTENDANCE_OAUTH_CLIENT_ID,
    ATTENDANCE_OAUTH_CLIENT_SECRET: process.env.ATTENDANCE_OAUTH_CLIENT_SECRET,
  },
  "server"
);
