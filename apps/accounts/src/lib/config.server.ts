import { parseEnv } from "@workspace/core/env";
import { z } from "zod";

const serverEnvSchema = z.object({
  ACCOUNTS_DATABASE_URL: z.string().min(1, "ACCOUNTS_DATABASE_URL is required."),
  ACCOUNTS_AUTH_SECRET: z
    .string()
    .min(
      32,
      "ACCOUNTS_AUTH_SECRET must be at least 32 characters. Generate one: openssl rand -base64 32"
    ),
  RABBITMQ_URL: z.string().min(1, "RABBITMQ_URL is required."),
});

// Never import this module from a client component — these values must not reach
// the browser bundle. Parsed eagerly so a misconfigured deploy fails at startup
// rather than falling back to Better Auth's built-in development secret.
export const serverEnv = parseEnv(
  serverEnvSchema,
  {
    ACCOUNTS_DATABASE_URL: process.env.ACCOUNTS_DATABASE_URL,
    ACCOUNTS_AUTH_SECRET: process.env.ACCOUNTS_AUTH_SECRET,
    RABBITMQ_URL: process.env.RABBITMQ_URL,
  },
  "server"
);
