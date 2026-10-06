import { parseEnv } from "@workspace/core/env";
import { z } from "zod";

const serverEnvSchema = z.object({
  HR_DATABASE_URL: z.string().min(1, "HR_DATABASE_URL is required."),
  HR_AUTH_SECRET: z
    .string()
    .min(
      32,
      "HR_AUTH_SECRET must be at least 32 characters. Generate one: openssl rand -base64 32"
    ),
  HR_OAUTH_CLIENT_ID: z.string().min(1, "HR_OAUTH_CLIENT_ID is required."),
  HR_OAUTH_CLIENT_SECRET: z
    .string()
    .min(32, "HR_OAUTH_CLIENT_SECRET must be at least 32 characters."),
});

// Never import this module from a client component: these values must not reach the
// browser bundle. Parsed eagerly so a misconfigured deploy fails at startup instead of
// on the first sign-in.
export const serverEnv = parseEnv(
  serverEnvSchema,
  {
    HR_DATABASE_URL: process.env.HR_DATABASE_URL,
    HR_AUTH_SECRET: process.env.HR_AUTH_SECRET,
    HR_OAUTH_CLIENT_ID: process.env.HR_OAUTH_CLIENT_ID,
    HR_OAUTH_CLIENT_SECRET: process.env.HR_OAUTH_CLIENT_SECRET,
  },
  "server"
);
